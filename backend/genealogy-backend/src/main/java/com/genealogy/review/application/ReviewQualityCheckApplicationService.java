package com.genealogy.review.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.quality.check.QualityCheckScopeAdapter;
import com.genealogy.quality.check.QualityCheckScopeType;
import com.genealogy.review.domain.ReviewQualityCheckMode;
import com.genealogy.review.domain.ReviewQualityCheckStatus;
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
    private static final Set<String> ACTIVE_STATUSES = Set.of(
            ReviewQualityCheckStatus.QUEUED.name(),
            ReviewQualityCheckStatus.RUNNING.name()
    );

    private final ReviewQualityCheckRepository qualityCheckRepository;
    private final CheckTaskRepository checkTaskRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ObjectMapper objectMapper;
    private final QualityCheckScopeAdapter reviewScopeAdapter;
    private final ReviewQualityCheckExecutor executor;
    private final ReviewQualityCheckStateMachine stateMachine;
    private final ReviewQualityCheckAfterCommitActions afterCommitActions;

    public ReviewQualityCheckApplicationService(
            ReviewQualityCheckRepository qualityCheckRepository,
            CheckTaskRepository checkTaskRepository,
            AuditRecordRepository auditRecordRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService,
            ObjectMapper objectMapper,
            ReviewQualityCheckExecutor executor,
            ReviewQualityCheckStateMachine stateMachine,
            ReviewQualityCheckAfterCommitActions afterCommitActions
    ) {
        this.qualityCheckRepository = qualityCheckRepository;
        this.checkTaskRepository = checkTaskRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.objectMapper = objectMapper;
        this.executor = executor;
        this.stateMachine = stateMachine;
        this.afterCommitActions = afterCommitActions;
        this.reviewScopeAdapter = new ReviewTaskQualityScopeAdapter(
                checkTaskRepository,
                auditRecordRepository,
                authorizationApplicationService
        );
    }

    @Transactional
    public ReviewQualityCheckAcceptedResponse trigger(Long clanId, ReviewQualityCheckTriggerRequest request, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, REVIEW_APPROVE);
        if (request == null) {
            throw new BusinessException("REVIEW_QUALITY_REQUEST_REQUIRED", "质量检查请求不能为空");
        }

        String requestedScope = upper(request.scopeType());
        QualityCheckScopeType scopeType;
        ReviewQualityCheckMode mode;
        try {
            scopeType = QualityCheckScopeType.parse(requestedScope);
            mode = ReviewQualityCheckMode.parse(request.mode());
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "检查范围或检查模式无效");
        }
        if (!reviewScopeAdapter.supports(scopeType)) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "检查范围或检查模式无效");
        }

        QualityCheckScopeAdapter.ResolvedQualityScope scope = reviewScopeAdapter.resolve(
                new QualityCheckScopeAdapter.QualityCheckScopeRequest(
                        clanId,
                        actorId,
                        scopeType,
                        request.reviewTaskIds() == null
                                ? List.of()
                                : request.reviewTaskIds().stream()
                                        .filter(Objects::nonNull)
                                        .map(String::valueOf)
                                        .toList(),
                        queryMap(request.query())
                )
        );
        if (scope.subjects().isEmpty()) {
            throw new BusinessException("REVIEW_QUALITY_NOT_REVIEWABLE", "当前范围没有可检查的待审核任务");
        }
        if (scope.subjects().size() > 200) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "单次最多检查 200 个审核任务");
        }

        List<String> requestedRules = normalizeRules(request.ruleCodes(), mode);
        String persistedScope = scopeType.persistedValue(requestedScope);
        String fingerprint = fingerprint(
                persistedScope,
                mode.name(),
                scope.persistedSubjectIds(),
                queryMap(request.query()),
                requestedRules
        );
        if (qualityCheckRepository.existsByClanIdAndScopeFingerprintAndStatusIn(
                clanId,
                fingerprint,
                ACTIVE_STATUSES
        )) {
            throw new BusinessException("REVIEW_QUALITY_CHECK_ALREADY_RUNNING", "相同范围的质量检查正在执行");
        }

        LocalDateTime now = LocalDateTime.now();
        ReviewQualityCheckEntity entity = new ReviewQualityCheckEntity();
        entity.setId(UUID.randomUUID());
        entity.setClanId(clanId);
        entity.setScopeType(persistedScope);
        entity.setMode(mode.name());
        entity.setStatus(ReviewQualityCheckStatus.QUEUED.name());
        entity.setScopeFingerprint(fingerprint);
        entity.setTaskIdsJson(write(scope.persistedSubjectIds().stream().map(Long::valueOf).toList()));
        entity.setQueryJson(request.query() == null ? null : write(request.query()));
        entity.setRuleCodesJson(write(requestedRules));
        entity.setTriggeredBy(actorId);
        entity.setQueuedAt(now);
        qualityCheckRepository.save(entity);
        operationLogApplicationService.record(
                clanId,
                actorId,
                "review_quality_trigger",
                "review_quality_check",
                null,
                "触发审核质量检查",
                "checkId=" + entity.getId() + ", scope=" + persistedScope
                        + ", mode=" + mode.name() + ", tasks=" + scope.subjects().size()
        );

        execute(entity, scope, requestedRules);
        return new ReviewQualityCheckAcceptedResponse(
                entity.getId(),
                entity.getStatus(),
                persistedScope,
                mode.name(),
                scope.subjects().size(),
                now
        );
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
        authorizationApplicationService.requireBranchPermission(
                task.getClanId(),
                actorId,
                task.getBranchId(),
                REVIEW_APPROVE
        );
        ReviewQualityCheckTriggerRequest request = new ReviewQualityCheckTriggerRequest(
                "TASK_IDS",
                ReviewQualityCheckMode.REVIEW_GATE.name(),
                List.of(taskId),
                null,
                List.copyOf(executor.gateRules())
        );
        ReviewQualityCheckAcceptedResponse accepted = trigger(task.getClanId(), request, actorId);
        ReviewQualityCheckResponse result = get(task.getClanId(), accepted.checkId(), actorId);
        if (result.reviewBlocked()) {
            throw new BusinessException("REVIEW_QUALITY_NOT_REVIEWABLE", blockingMessage(result));
        }
        if (ReviewQualityCheckStatus.FAILED.name().equals(result.status())) {
            throw new BusinessException("REVIEW_QUALITY_TASK_STATE_CONFLICT", "质量检查执行失败，暂不能审核通过");
        }
    }

    private void execute(
            ReviewQualityCheckEntity entity,
            QualityCheckScopeAdapter.ResolvedQualityScope scope,
            List<String> requestedRules
    ) {
        stateMachine.transition(entity, ReviewQualityCheckStatus.RUNNING);
        qualityCheckRepository.save(entity);
        try {
            ReviewQualityCheckExecutor.ExecutionResult result = executor.execute(
                    scope,
                    requestedRules,
                    entity.getMode()
            );
            ReviewQualityCheckSummary summary = result.summary();
            entity.setSummaryJson(write(summary));
            entity.setRulesJson(write(result.rules()));
            entity.setReviewBlocked(summary.reviewBlocked());
            stateMachine.transition(
                    entity,
                    summary.issueCount() == 0
                            ? ReviewQualityCheckStatus.PASSED
                            : ReviewQualityCheckStatus.ISSUES_FOUND
            );
            qualityCheckRepository.save(entity);
            afterCommitActions.completion(entity);
        } catch (RuntimeException exception) {
            stateMachine.transition(entity, ReviewQualityCheckStatus.FAILED);
            entity.setFailureCode("REVIEW_QUALITY_EXECUTION_FAILED");
            entity.setFailureMessage(trim(exception.getMessage(), 500));
            qualityCheckRepository.save(entity);
            afterCommitActions.completion(entity);
        }
    }

    private void validateReadScope(ReviewQualityCheckEntity entity, Long actorId) {
        List<CheckTaskEntity> tasks = checkTaskRepository.findAllById(readTaskIds(entity));
        for (CheckTaskEntity task : tasks) {
            authorizationApplicationService.requireBranchPermission(
                    entity.getClanId(),
                    actorId,
                    task.getBranchId(),
                    REVIEW_VIEW
            );
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
        return new ReviewQualityCheckResponse(
                entity.getId(),
                entity.getStatus(),
                entity.getScopeType(),
                entity.getMode(),
                entity.isReviewBlocked(),
                summary,
                rules,
                entity.getQueuedAt(),
                entity.getStartedAt(),
                entity.getCompletedAt(),
                entity.getCompletedAt(),
                entity.getFailureCode(),
                entity.getFailureMessage()
        );
    }

    private List<Long> readTaskIds(ReviewQualityCheckEntity entity) {
        return read(entity.getTaskIdsJson(), new TypeReference<List<Long>>() { });
    }

    private List<String> normalizeRules(List<String> values, ReviewQualityCheckMode mode) {
        List<String> normalized = values == null
                ? List.of()
                : values.stream().filter(Objects::nonNull).map(this::upper).distinct().toList();
        if (mode == ReviewQualityCheckMode.REVIEW_GATE) {
            return normalized.isEmpty()
                    ? List.copyOf(executor.gateRules())
                    : normalized.stream().filter(executor.gateRules()::contains).toList();
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

    private String fingerprint(
            String scopeType,
            String mode,
            List<String> subjectIds,
            Object query,
            List<String> rules
    ) {
        String source = scopeType + "|" + mode + "|" + subjectIds + "|" + write(query) + "|" + rules;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(source.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte value : digest) result.append(String.format("%02x", value));
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "质量检查请求无法序列化");
        }
    }

    private <T> T read(String value, Class<T> type) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, type);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("REVIEW_QUALITY_TASK_STATE_CONFLICT", "质量检查结果无法读取");
        }
    }

    private <T> T read(String value, TypeReference<T> type) {
        try {
            return objectMapper.readValue(value, type);
        } catch (JsonProcessingException exception) {
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
