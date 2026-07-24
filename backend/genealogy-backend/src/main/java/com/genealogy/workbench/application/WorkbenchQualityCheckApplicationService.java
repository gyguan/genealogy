package com.genealogy.workbench.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.quality.check.QualityCheckEvaluation;
import com.genealogy.quality.check.QualityCheckScopeAdapter;
import com.genealogy.quality.check.QualityCheckScopeType;
import com.genealogy.quality.check.QualityRuleEngine;
import com.genealogy.quality.check.QualityRuleRegistry;
import com.genealogy.quality.domain.GenealogyQualityRuleService;
import com.genealogy.review.entity.ReviewQualityCheckEntity;
import com.genealogy.review.repository.ReviewQualityCheckRepository;
import com.genealogy.workbench.dto.WorkbenchQualityCheckRequest;
import com.genealogy.workbench.dto.WorkbenchQualityCheckResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class WorkbenchQualityCheckApplicationService {

    private static final Set<String> MODES = Set.of("INCREMENTAL", "FULL", "REVIEW_GATE");
    private static final Collection<String> ACTIVE = List.of("QUEUED", "RUNNING");

    private final ReviewQualityCheckRepository repository;
    private final AuthorizationApplicationService authorization;
    private final OperationLogApplicationService operationLog;
    private final ObjectMapper objectMapper;
    private final QualityRuleRegistry registry;
    private final QualityRuleEngine engine;
    private final QualityCheckScopeAdapter scopeAdapter;

    public WorkbenchQualityCheckApplicationService(
            ReviewQualityCheckRepository repository,
            AuthorizationApplicationService authorization,
            OperationLogApplicationService operationLog,
            ObjectMapper objectMapper,
            GenealogyQualityRuleService genealogyQualityRuleService,
            WorkbenchQualityScopeAdapter scopeAdapter
    ) {
        this.repository = repository;
        this.authorization = authorization;
        this.operationLog = operationLog;
        this.objectMapper = objectMapper;
        this.registry = new QualityRuleRegistry();
        this.engine = new QualityRuleEngine(objectMapper, genealogyQualityRuleService, registry);
        this.scopeAdapter = scopeAdapter;
    }

    @Transactional
    public WorkbenchQualityCheckResponse trigger(Long clanId, WorkbenchQualityCheckRequest request, Long actorId) {
        authorization.requireClanMember(clanId, actorId);
        String mode = upper(request == null ? null : request.mode());
        if (!MODES.contains(mode)) throw new BusinessException("WORKBENCH_QUALITY_INVALID_SCOPE", "检查模式无效");
        QualityCheckScopeType scopeType = parseScope(request == null ? null : request.scopeType());
        if (!scopeAdapter.supports(scopeType)) throw new BusinessException("WORKBENCH_QUALITY_INVALID_SCOPE", "检查范围无效");

        QualityCheckScopeAdapter.ResolvedQualityScope scope = scopeAdapter.resolve(new QualityCheckScopeAdapter.QualityCheckScopeRequest(
                clanId, actorId, scopeType,
                request == null || request.subjectIds() == null ? List.of() : request.subjectIds(),
                request == null || request.query() == null ? Map.of() : request.query()));
        List<String> rules = normalizeRules(request == null ? null : request.ruleCodes(), mode);
        String fingerprint = fingerprint(clanId, scopeType.name(), mode, scope.persistedSubjectIds(), rules, request == null ? Map.of() : request.query());
        if (repository.existsByClanIdAndScopeFingerprintAndStatusIn(clanId, fingerprint, ACTIVE)) {
            throw new BusinessException("WORKBENCH_QUALITY_CHECK_ALREADY_RUNNING", "相同范围的质量检查正在执行");
        }

        LocalDateTime now = LocalDateTime.now();
        ReviewQualityCheckEntity entity = new ReviewQualityCheckEntity();
        entity.setId(UUID.randomUUID());
        entity.setClanId(clanId);
        entity.setScopeType(scopeType.name());
        entity.setMode(mode);
        entity.setStatus("QUEUED");
        entity.setScopeFingerprint(fingerprint);
        entity.setTaskIdsJson(write(scope.persistedSubjectIds()));
        entity.setQueryJson(write(request == null ? Map.of() : request.query()));
        entity.setRuleCodesJson(write(rules));
        entity.setTriggeredBy(actorId);
        entity.setQueuedAt(now);
        repository.save(entity);
        operationLog.record(clanId, actorId, "workbench_quality_trigger", "quality_check", null,
                "触发修谱质量检查", "checkId=" + entity.getId() + ", scope=" + scopeType + ", subjects=" + scope.subjects().size());

        entity.setStatus("RUNNING");
        entity.setStartedAt(LocalDateTime.now());
        repository.save(entity);
        try {
            QualityCheckEvaluation evaluation = engine.evaluate(scope.subjects(), rules, mode);
            entity.setSummaryJson(write(evaluation.summary()));
            entity.setRulesJson(write(evaluation.rules()));
            entity.setReviewBlocked(evaluation.summary().reviewBlocked());
            entity.setStatus(evaluation.summary().issueCount() == 0 ? "PASSED" : "ISSUES_FOUND");
            entity.setCompletedAt(LocalDateTime.now());
            repository.save(entity);
            operationLog.record(clanId, actorId, "workbench_quality_complete", "quality_check", null,
                    "完成修谱质量检查", "checkId=" + entity.getId() + ", status=" + entity.getStatus() + ", blocked=" + entity.isReviewBlocked());
        } catch (RuntimeException ex) {
            entity.setStatus("FAILED");
            entity.setFailureCode("WORKBENCH_QUALITY_EXECUTION_FAILED");
            entity.setFailureMessage(trim(ex.getMessage(), 500));
            entity.setCompletedAt(LocalDateTime.now());
            repository.save(entity);
        }
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public WorkbenchQualityCheckResponse get(Long clanId, UUID checkId, Long actorId) {
        authorization.requireClanMember(clanId, actorId);
        ReviewQualityCheckEntity entity = repository.findByIdAndClanId(checkId, clanId)
                .filter(item -> isWorkbenchScope(item.getScopeType()))
                .orElseThrow(() -> new BusinessException("WORKBENCH_QUALITY_NOT_FOUND", "修谱质量检查不存在"));
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public WorkbenchQualityCheckResponse latest(Long clanId, Long actorId) {
        authorization.requireClanMember(clanId, actorId);
        return repository.findByClanIdOrderByQueuedAtDesc(clanId).stream()
                .filter(item -> isWorkbenchScope(item.getScopeType()))
                .findFirst().map(this::toResponse).orElse(null);
    }

    @Transactional
    public WorkbenchQualityCheckResponse ensureSubmissionAllowed(Long clanId, WorkbenchQualityCheckRequest request, Long actorId) {
        WorkbenchQualityCheckRequest gateRequest = new WorkbenchQualityCheckRequest(
                request == null || request.scopeType() == null ? "WORKBENCH_SESSION" : request.scopeType(),
                "REVIEW_GATE",
                request == null ? List.of() : request.subjectIds(),
                request == null ? Map.of() : request.query(),
                List.copyOf(registry.gateRules()));
        WorkbenchQualityCheckResponse response = trigger(clanId, gateRequest, actorId);
        if (response.reviewBlocked()) {
            String reason = response.rules().stream()
                    .filter(rule -> "BLOCKING".equals(rule.blockLevel()) && rule.affectedSubjectCount() > 0)
                    .map(WorkbenchQualityCheckResponse.RuleResult::message)
                    .filter(message -> message != null && !message.isBlank())
                    .findFirst().orElse("存在阻断性质量问题，不能提交审核");
            throw new BusinessException("WORKBENCH_QUALITY_NOT_REVIEWABLE", reason);
        }
        if ("FAILED".equals(response.status())) {
            throw new BusinessException("WORKBENCH_QUALITY_EXECUTION_FAILED", "质量检查执行失败，暂不能提交审核");
        }
        return response;
    }

    private WorkbenchQualityCheckResponse toResponse(ReviewQualityCheckEntity entity) {
        QualityCheckEvaluation.QualityCheckSummary summary = read(entity.getSummaryJson(), QualityCheckEvaluation.QualityCheckSummary.class);
        List<QualityCheckEvaluation.QualityCheckRuleResult> rules = entity.getRulesJson() == null ? List.of()
                : read(entity.getRulesJson(), new TypeReference<List<QualityCheckEvaluation.QualityCheckRuleResult>>() { });
        WorkbenchQualityCheckResponse.Summary responseSummary = summary == null ? null : new WorkbenchQualityCheckResponse.Summary(
                summary.subjectCount(), summary.ruleCount(), summary.passedRuleCount(), summary.issueCount(),
                summary.blockingIssueCount(), summary.warningIssueCount(), summary.reviewBlocked());
        List<WorkbenchQualityCheckResponse.RuleResult> responseRules = rules.stream().map(rule -> new WorkbenchQualityCheckResponse.RuleResult(
                rule.code(), rule.name(), rule.outcome(), rule.blockLevel(), rule.affectedSubjectCount(), rule.message(), rule.affectedSubjectIds())).toList();
        return new WorkbenchQualityCheckResponse(entity.getId(), entity.getStatus(), entity.getScopeType(), entity.getMode(),
                entity.isReviewBlocked(), responseSummary, responseRules, entity.getQueuedAt(), entity.getStartedAt(), entity.getCompletedAt(),
                entity.getFailureCode(), entity.getFailureMessage());
    }

    private QualityCheckScopeType parseScope(String value) {
        try {
            return QualityCheckScopeType.parse(value == null ? "WORKBENCH_SESSION" : value);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("WORKBENCH_QUALITY_INVALID_SCOPE", "检查范围无效");
        }
    }

    private List<String> normalizeRules(List<String> values, String mode) {
        List<String> normalized = values == null ? List.of() : values.stream().filter(value -> value != null && !value.isBlank())
                .map(this::upper).distinct().filter(registry::contains).toList();
        if ("REVIEW_GATE".equals(mode)) return normalized.isEmpty() ? List.copyOf(registry.gateRules()) : normalized.stream().filter(registry.gateRules()::contains).toList();
        return normalized;
    }

    private boolean isWorkbenchScope(String scope) {
        return Set.of("WORKBENCH_SESSION", "DRAFT_IDS", "QUERY").contains(scope);
    }

    private String fingerprint(Object... values) {
        String source = write(List.of(values));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte value : digest) result.append(String.format("%02x", value));
            return result.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("WORKBENCH_QUALITY_INVALID_SCOPE", "质量检查请求无法序列化");
        }
    }

    private <T> T read(String value, Class<T> type) {
        if (value == null) return null;
        try { return objectMapper.readValue(value, type); }
        catch (JsonProcessingException ex) { throw new BusinessException("WORKBENCH_QUALITY_RESULT_INVALID", "质量检查结果无法读取"); }
    }

    private <T> T read(String value, TypeReference<T> type) {
        try { return objectMapper.readValue(value, type); }
        catch (JsonProcessingException ex) { throw new BusinessException("WORKBENCH_QUALITY_RESULT_INVALID", "质量检查结果无法读取"); }
    }

    private String upper(String value) { return value == null ? "" : value.trim().toUpperCase(Locale.ROOT); }
    private String trim(String value, int max) { return value == null ? null : value.length() <= max ? value : value.substring(0, max); }
}
