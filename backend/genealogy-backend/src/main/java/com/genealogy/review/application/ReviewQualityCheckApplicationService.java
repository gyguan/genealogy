package com.genealogy.review.application;

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
import com.genealogy.review.dto.ReviewQualityCheckAcceptedResponse;
import com.genealogy.review.dto.ReviewQualityCheckResponse;
import com.genealogy.review.dto.ReviewQualityCheckSummary;
import com.genealogy.review.dto.ReviewQualityCheckTriggerRequest;
import com.genealogy.review.dto.ReviewQualityRuleResult;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.entity.ReviewQualityCheckEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.review.repository.ReviewQualityCheckRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class ReviewQualityCheckApplicationService {

    private static final String REVIEW_VIEW = "review_task:view";
    private static final String REVIEW_APPROVE = "review_task:approve";
    private static final Set<String> ACTIVE_STATUSES = Set.of("QUEUED", "RUNNING");
    private static final Set<String> MODES = Set.of("INCREMENTAL", "FULL", "REVIEW_GATE");

    private final ReviewQualityCheckRepository qualityCheckRepository;
    private final CheckTaskRepository checkTaskRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ObjectMapper objectMapper;
    private final QualityRuleRegistry ruleRegistry;
    private final QualityRuleEngine ruleEngine;
    private final QualityCheckScopeAdapter reviewScopeAdapter;

    public ReviewQualityCheckApplicationService(
            ReviewQualityCheckRepository qualityCheckRepository,
            CheckTaskRepository checkTaskRepository,
            AuditRecordRepository auditRecordRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService,
            GenealogyQualityRuleService genealogyQualityRuleService,
            ObjectMapper objectMapper
    ) {
        this.qualityCheckRepository = qualityCheckRepository;
        this.checkTaskRepository = checkTaskRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.objectMapper = objectMapper;
        this.ruleRegistry = new QualityRuleRegistry();
        this.ruleEngine = new QualityRuleEngine(objectMapper, genealogyQualityRuleService, ruleRegistry);
        this.reviewScopeAdapter = new ReviewTaskQualityScopeAdapter(
                checkTaskRepository,
                auditRecordRepository,
                authorizationApplicationService
        );
    }

    @Transactional
    public ReviewQualityCheckAcceptedResponse trigger(Long clanId, ReviewQualityCheckTriggerRequest request, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, REVIEW_APPROVE);
        String requestedScope = upper(request == null ? null : request.scopeType());
        String mode = upper(request == null ? null : request.mode());
        QualityCheckScopeType scopeType;
        try {
            scopeType = QualityCheckScopeType.parse(requestedScope);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "检查范围或检查模式无效");
        }
        if (!MODES.contains(mode) || !reviewScopeAdapter.supports(scopeType)) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "检查范围或检查模式无效");
        }

        QualityCheckScopeAdapter.ResolvedQualityScope scope = reviewScopeAdapter.resolve(
                new QualityCheckScopeAdapter.QualityCheckScopeRequest(
                        clanId,
                        actorId,
                        scopeType,
                        request == null || request.reviewTaskIds() == null
                                ? List.of()
                                : request.reviewTaskIds().stream().filter(Objects::nonNull).map(String::valueOf).toList(),
                        queryMap(request == null ? null : request.query())
                )
        );
        if (scope.subjects().isEmpty()) {
            throw new BusinessException("REVIEW_QUALITY_NOT_REVIEWABLE", "当前范围没有可检查的待审核任务");
        }
        if (scope.subjects().size() > 200) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "单次最多检查 200 个审核任务");
        }

        List<String> requestedRules = normalizeRules(request == null ? null : request.ruleCodes(), mode);
        String persistedScope = scopeType.persistedValue(requestedScope);
        String fingerprint = fingerprint(persistedScope, mode, scope.persistedSubjectIds(), queryMap(request.query()), requestedRules);
        if (qualityCheckRepository.existsByClanIdAndScopeFingerprintAndStatusIn(clanId, fingerprint, ACTIVE_STATUSES)) {
            throw new BusinessException("REVIEW_QUALITY_CHECK_ALREADY_RUNNING", "相同范围的质量检查正在执行");
        }

        LocalDateTime now = LocalDateTime.now();
        ReviewQualityCheckEntity entity = new ReviewQualityCheckEntity();
        entity.setId(UUID.randomUUID());
        entity.setClanId(clanId);
        entity.setScopeType(persistedScope);
        entity.setMode(mode);
        entity.setStatus("QUEUED");
        entity.setScopeFingerprint(fingerprint);
        entity.setTaskIdsJson(write(scope.persistedSubjectIds().stream().map(Long::valueOf).toList()));
        entity.setQueryJson(request.query() == null ? null : write(request.query()));
        entity.setRuleCodesJson(write(requestedRules));
        entity.setTriggeredBy(actorId);
        entity.setQueuedAt(now);
        qualityCheckRepository.save(entity);
        operationLogApplicationService.record(clanId, actorId, "review_quality_trigger", "review_quality_check", null,
                "触发审核质量检查", "checkId=" + entity.getId() + ", scope=" + persistedScope + ", mode=" + mode + ", tasks=" + scope.subjects().size());

        execute(entity, scope, requestedRules);
        return new ReviewQualityCheckAcceptedResponse(entity.getId(), entity.getStatus(), persistedScope, mode, scope.subjects().size(), now);
    }

    @Transactional(readOnly = true)
    public ReviewQualityCheckResponse get(Long clanId, UUID checkId, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, REVIEW_VIEW);
        ReviewQualityCheckEntity entity = qualityCheckRepository.findByIdAndClanId(checkId, clanId)
                .orElseThrow(() -> new BusinessException("REVIEW_QUALITY_NOT_FOUND", "质量检查不存在"));
        validateReadScope(entity, actorId);
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public ReviewQualityCheckResponse latestForTask(Long clanId, Long taskId, Long actorId) {
        CheckTaskEntity task = taskInClan(clanId, taskId);
        authorizationApplicationService.requireBranchPermission(clanId, actorId, task.getBranchId(), REVIEW_VIEW);
        for (ReviewQualityCheckEntity entity : qualityCheckRepository.findByClanIdOrderByQueuedAtDesc(clanId)) {
            if (readTaskIds(entity).contains(taskId)) return toResponse(entity);
        }
        return ReviewQualityCheckResponse.notChecked();
    }

    @Transactional
    public void ensureApprovalAllowed(Long taskId, Long actorId) {
        CheckTaskEntity task = checkTaskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("REVIEW_QUALITY_NOT_FOUND", "审核任务不存在"));
        authorizationApplicationService.requireBranchPermission(task.getClanId(), actorId, task.getBranchId(), REVIEW_APPROVE);
        ReviewQualityCheckTriggerRequest request = new ReviewQualityCheckTriggerRequest(
                "TASK_IDS", "REVIEW_GATE", List.of(taskId), null, List.copyOf(ruleRegistry.gateRules()));
        ReviewQualityCheckAcceptedResponse accepted = trigger(task.getClanId(), request, actorId);
        ReviewQualityCheckResponse result = get(task.getClanId(), accepted.checkId(), actorId);
        if (result.reviewBlocked()) {
            throw new BusinessException("REVIEW_QUALITY_NOT_REVIEWABLE", blockingMessage(result));
        }
        if ("FAILED".equals(result.status())) {
            throw new BusinessException("REVIEW_QUALITY_TASK_STATE_CONFLICT", "质量检查执行失败，暂不能审核通过");
        }
    }

    private void execute(
            ReviewQualityCheckEntity entity,
            QualityCheckScopeAdapter.ResolvedQualityScope scope,
            List<String> requestedRules
    ) {
        entity.setStatus("RUNNING");
        entity.setStartedAt(LocalDateTime.now());
        qualityCheckRepository.save(entity);
        try {
            QualityCheckEvaluation evaluation = ruleEngine.evaluate(scope.subjects(), requestedRules, entity.getMode());
            ReviewQualityCheckSummary summary = new ReviewQualityCheckSummary(
                    evaluation.summary().subjectCount(),
                    evaluation.summary().ruleCount(),
                    evaluation.summary().passedRuleCount(),
                    evaluation.summary().issueCount(),
                    evaluation.summary().blockingIssueCount(),
                    evaluation.summary().warningIssueCount(),
                    evaluation.summary().blocked()
            );
            List<ReviewQualityRuleResult> rules = evaluation.rules().stream().map(item -> new ReviewQualityRuleResult(
                    item.code(), item.name(), item.outcome(), item.blockLevel(), item.affectedSubjectCount(), item.message(),
                    item.affectedSubjectIds().stream().map(Long::valueOf).toList()
            )).toList();
            entity.setSummaryJson(write(summary));
            entity.setRulesJson(write(rules));
            entity.setReviewBlocked(summary.reviewBlocked());
            entity.setStatus(summary.issueCount() == 0 ? "PASSED" : "ISSUES_FOUND");
            entity.setCompletedAt(LocalDateTime.now());
            qualityCheckRepository.save(entity);
            operationLogApplicationService.record(entity.getClanId(), entity.getTriggeredBy(), "review_quality_complete", "review_quality_check", null,
                    "完成审核质量检查", "checkId=" + entity.getId() + ", status=" + entity.getStatus() + ", blocked=" + entity.isReviewBlocked());
        } catch (RuntimeException ex) {
            entity.setStatus("FAILED");
            entity.setFailureCode("REVIEW_QUALITY_EXECUTION_FAILED");
            entity.setFailureMessage(trim(ex.getMessage(), 500));
            entity.setCompletedAt(LocalDateTime.now());
            qualityCheckRepository.save(entity);
        }
    }

    private void validateReadScope(ReviewQualityCheckEntity entity, Long actorId) {
        List<CheckTaskEntity> tasks = checkTaskRepository.findAllById(readTaskIds(entity));
        for (CheckTaskEntity task : tasks) {
            authorizationApplicationService.requireBranchPermission(entity.getClanId(), actorId, task.getBranchId(), REVIEW_VIEW);
        }
    }

    private CheckTaskEntity taskInClan(Long clanId, Long taskId) {
        return checkTaskRepository.findById(taskId)
                .filter(task -> Objects.equals(clanId, task.getClanId()))
                .orElseThrow(() -> new BusinessException("REVIEW_QUALITY_NOT_FOUND", "审核任务不存在"));
    }

    private ReviewQualityCheckResponse toResponse(ReviewQualityCheckEntity entity) {
        ReviewQualityCheckSummary summary = read(entity.getSummaryJson(), ReviewQualityCheckSummary.class);
        List<ReviewQualityRuleResult> rules = entity.getRulesJson() == null
                ? List.of()
                : read(entity.getRulesJson(), new TypeReference<List<ReviewQualityRuleResult>>() { });
        return new ReviewQualityCheckResponse(entity.getId(), entity.getStatus(), entity.getScopeType(), entity.getMode(),
                entity.isReviewBlocked(), summary, rules, entity.getQueuedAt(), entity.getStartedAt(), entity.getCompletedAt(),
                entity.getCompletedAt(), entity.getFailureCode(), entity.getFailureMessage());
    }

    private List<Long> readTaskIds(ReviewQualityCheckEntity entity) {
        return read(entity.getTaskIdsJson(), new TypeReference<List<Long>>() { });
    }

    private List<String> normalizeRules(List<String> values, String mode) {
        List<String> normalized = values == null
                ? List.of()
                : values.stream().filter(Objects::nonNull).map(this::upper).distinct().toList();
        if ("REVIEW_GATE".equals(mode)) {
            return normalized.isEmpty()
                    ? List.copyOf(ruleRegistry.gateRules())
                    : normalized.stream().filter(ruleRegistry.gateRules()::contains).toList();
        }
        return normalized;
    }

    private Map<String, Object> queryMap(ReviewQualityCheckTriggerRequest.QueryScope query) {
        if (query == null) return null;
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("view", query.view());
        result.put("branchId", query.branchId());
        result.put("targetType", query.targetType());
        result.put("keyword", query.keyword());
        return result;
    }

    private String blockingMessage(ReviewQualityCheckResponse result) {
        return result.rules().stream()
                .filter(item -> "BLOCKING".equals(item.blockLevel()) && item.affectedTaskCount() > 0)
                .map(ReviewQualityRuleResult::message)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("存在阻断性质量问题，不能审核通过");
    }

    private String fingerprint(String scopeType, String mode, List<String> subjectIds, Object query, List<String> rules) {
        String source = scopeType + "|" + mode + "|" + subjectIds + "|" + write(query) + "|" + rules;
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
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "质量检查请求无法序列化");
        }
    }

    private <T> T read(String value, Class<T> type) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, type);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("REVIEW_QUALITY_TASK_STATE_CONFLICT", "质量检查结果无法读取");
        }
    }

    private <T> T read(String value, TypeReference<T> type) {
        try {
            return objectMapper.readValue(value, type);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("REVIEW_QUALITY_TASK_STATE_CONFLICT", "质量检查结果无法读取");
        }
    }

    private String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String trim(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
