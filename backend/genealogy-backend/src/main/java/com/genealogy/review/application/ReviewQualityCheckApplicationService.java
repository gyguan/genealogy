package com.genealogy.review.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.quality.domain.GenealogyQualityRuleService;
import com.genealogy.review.dto.ReviewQualityCheckAcceptedResponse;
import com.genealogy.review.dto.ReviewQualityCheckResponse;
import com.genealogy.review.dto.ReviewQualityCheckSummary;
import com.genealogy.review.dto.ReviewQualityCheckTriggerRequest;
import com.genealogy.review.dto.ReviewQualityRuleResult;
import com.genealogy.review.entity.AuditRecordEntity;
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
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ReviewQualityCheckApplicationService {

    private static final String REVIEW_VIEW = "review_task:view";
    private static final String REVIEW_APPROVE = "review_task:approve";
    private static final String STATUS_PENDING = "pending";
    private static final Set<String> ACTIVE_STATUSES = Set.of("QUEUED", "RUNNING");
    private static final Set<String> MODES = Set.of("INCREMENTAL", "FULL", "REVIEW_GATE");
    private static final Set<String> SCOPES = Set.of("TASK_IDS", "QUERY");
    private static final Set<String> GATE_RULES = Set.of("PAYLOAD_INVALID", "RELATIONSHIP_CONFLICT");

    private final ReviewQualityCheckRepository qualityCheckRepository;
    private final CheckTaskRepository checkTaskRepository;
    private final AuditRecordRepository auditRecordRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final GenealogyQualityRuleService genealogyQualityRuleService;
    private final ObjectMapper objectMapper;

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
        this.auditRecordRepository = auditRecordRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.genealogyQualityRuleService = genealogyQualityRuleService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ReviewQualityCheckAcceptedResponse trigger(Long clanId, ReviewQualityCheckTriggerRequest request, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, REVIEW_APPROVE);
        String scopeType = upper(request == null ? null : request.scopeType());
        String mode = upper(request == null ? null : request.mode());
        if (!SCOPES.contains(scopeType) || !MODES.contains(mode)) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "检查范围或检查模式无效");
        }

        List<CheckTaskEntity> tasks = resolveTasks(clanId, scopeType, request);
        if (tasks.isEmpty()) {
            throw new BusinessException("REVIEW_QUALITY_NOT_REVIEWABLE", "当前范围没有可检查的待审核任务");
        }
        if (tasks.size() > 200) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "单次最多检查 200 个审核任务");
        }
        validateTaskScope(clanId, tasks, actorId);

        List<Long> taskIds = tasks.stream().map(CheckTaskEntity::getId).sorted().toList();
        List<String> requestedRules = normalizeRules(request.ruleCodes(), mode);
        String fingerprint = fingerprint(scopeType, mode, taskIds, request.query(), requestedRules);
        if (qualityCheckRepository.existsByClanIdAndScopeFingerprintAndStatusIn(clanId, fingerprint, ACTIVE_STATUSES)) {
            throw new BusinessException("REVIEW_QUALITY_CHECK_ALREADY_RUNNING", "相同范围的质量检查正在执行");
        }

        LocalDateTime now = LocalDateTime.now();
        ReviewQualityCheckEntity entity = new ReviewQualityCheckEntity();
        entity.setId(UUID.randomUUID());
        entity.setClanId(clanId);
        entity.setScopeType(scopeType);
        entity.setMode(mode);
        entity.setStatus("QUEUED");
        entity.setScopeFingerprint(fingerprint);
        entity.setTaskIdsJson(write(taskIds));
        entity.setQueryJson(request.query() == null ? null : write(request.query()));
        entity.setRuleCodesJson(write(requestedRules));
        entity.setTriggeredBy(actorId);
        entity.setQueuedAt(now);
        qualityCheckRepository.save(entity);
        operationLogApplicationService.record(clanId, actorId, "review_quality_trigger", "review_quality_check", null,
                "触发审核质量检查", "checkId=" + entity.getId() + ", scope=" + scopeType + ", mode=" + mode + ", tasks=" + taskIds.size());

        execute(entity, tasks, requestedRules);
        return new ReviewQualityCheckAcceptedResponse(entity.getId(), entity.getStatus(), scopeType, mode, taskIds.size(), now);
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
            if (readTaskIds(entity).contains(taskId)) {
                return toResponse(entity);
            }
        }
        return ReviewQualityCheckResponse.notChecked();
    }

    @Transactional
    public void ensureApprovalAllowed(Long taskId, Long actorId) {
        CheckTaskEntity task = checkTaskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("REVIEW_QUALITY_NOT_FOUND", "审核任务不存在"));
        authorizationApplicationService.requireBranchPermission(task.getClanId(), actorId, task.getBranchId(), REVIEW_APPROVE);
        ReviewQualityCheckTriggerRequest request = new ReviewQualityCheckTriggerRequest(
                "TASK_IDS", "REVIEW_GATE", List.of(taskId), null, List.copyOf(GATE_RULES));
        ReviewQualityCheckAcceptedResponse accepted = trigger(task.getClanId(), request, actorId);
        ReviewQualityCheckResponse result = get(task.getClanId(), accepted.checkId(), actorId);
        if (result.reviewBlocked()) {
            throw new BusinessException("REVIEW_QUALITY_NOT_REVIEWABLE", blockingMessage(result));
        }
        if ("FAILED".equals(result.status())) {
            throw new BusinessException("REVIEW_QUALITY_TASK_STATE_CONFLICT", "质量检查执行失败，暂不能审核通过");
        }
    }

    private void execute(ReviewQualityCheckEntity entity, List<CheckTaskEntity> tasks, List<String> requestedRules) {
        entity.setStatus("RUNNING");
        entity.setStartedAt(LocalDateTime.now());
        qualityCheckRepository.save(entity);
        try {
            Map<Long, AuditRecordEntity> records = auditRecordRepository.findAllById(
                    tasks.stream().map(CheckTaskEntity::getRevisionId).toList()
            ).stream().collect(Collectors.toMap(AuditRecordEntity::getId, Function.identity()));
            Evaluation evaluation = evaluate(tasks, records, requestedRules, entity.getMode());
            entity.setSummaryJson(write(evaluation.summary()));
            entity.setRulesJson(write(evaluation.rules()));
            entity.setReviewBlocked(evaluation.summary().reviewBlocked());
            entity.setStatus(evaluation.summary().issueCount() == 0 ? "PASSED" : "ISSUES_FOUND");
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

    private Evaluation evaluate(
            List<CheckTaskEntity> tasks,
            Map<Long, AuditRecordEntity> records,
            List<String> requestedRules,
            String mode
    ) {
        Map<String, LinkedHashSet<Long>> affected = new LinkedHashMap<>();
        for (CheckTaskEntity task : tasks) {
            AuditRecordEntity record = records.get(task.getRevisionId());
            if (record == null) {
                add(affected, "PAYLOAD_INVALID", task.getId());
                continue;
            }
            Set<String> codes = evaluateRecord(record);
            for (String code : codes) {
                if (requestedRules.isEmpty() || requestedRules.contains(code)) {
                    add(affected, code, task.getId());
                }
            }
        }

        List<String> enabledRules = requestedRules.isEmpty()
                ? defaultRules(mode)
                : requestedRules;
        List<ReviewQualityRuleResult> results = new ArrayList<>();
        for (String code : enabledRules) {
            List<Long> taskIds = List.copyOf(affected.getOrDefault(code, new LinkedHashSet<>()));
            String blockLevel = blockLevel(code);
            String outcome = taskIds.isEmpty() ? "PASSED" : "ISSUE";
            results.add(new ReviewQualityRuleResult(code, ruleName(code), outcome, blockLevel, taskIds.size(),
                    taskIds.isEmpty() ? null : ruleMessage(code), taskIds));
        }

        int issues = results.stream().mapToInt(ReviewQualityRuleResult::affectedTaskCount).sum();
        int blocking = results.stream().filter(item -> "BLOCKING".equals(item.blockLevel())).mapToInt(ReviewQualityRuleResult::affectedTaskCount).sum();
        int warnings = results.stream().filter(item -> "WARNING".equals(item.blockLevel())).mapToInt(ReviewQualityRuleResult::affectedTaskCount).sum();
        int passed = (int) results.stream().filter(item -> "PASSED".equals(item.outcome())).count();
        ReviewQualityCheckSummary summary = new ReviewQualityCheckSummary(tasks.size(), results.size(), passed, issues, blocking, warnings, blocking > 0);
        return new Evaluation(summary, List.copyOf(results));
    }

    private Set<String> evaluateRecord(AuditRecordEntity record) {
        Set<String> codes = new LinkedHashSet<>();
        String payload = record.getNewPayload() == null ? record.getOldPayload() : record.getNewPayload();
        if (payload == null || payload.isBlank()) {
            codes.add("PAYLOAD_INVALID");
            return codes;
        }
        final JsonNode node;
        try {
            node = objectMapper.readTree(payload);
        } catch (JsonProcessingException ex) {
            codes.add("PAYLOAD_INVALID");
            return codes;
        }
        String targetType = lower(record.getTargetType());
        if ("relationship".equals(targetType)) {
            Long from = longValue(node, "fromPersonId", "from_person_id");
            Long to = longValue(node, "toPersonId", "to_person_id");
            if (from != null && Objects.equals(from, to)) {
                codes.add("RELATIONSHIP_CONFLICT");
            }
        }
        if ("person".equals(targetType)) {
            JsonNode generationNo = first(node, "generationNo", "generation_no");
            JsonNode generationWord = first(node, "generationWord", "generation_word");
            if (generationNo == null || generationNo.isNull() || generationWord == null || generationWord.asText("").isBlank()) {
                codes.add("GENERATION_MISMATCH");
            }
        }
        if (("person".equals(targetType) || "relationship".equals(targetType)) && !hasEvidence(node)) {
            codes.add("MISSING_SOURCE");
        }
        genealogyQualityRuleService.highestRisk(codes.stream().map(String::toLowerCase).toList());
        return codes;
    }

    private List<CheckTaskEntity> resolveTasks(Long clanId, String scopeType, ReviewQualityCheckTriggerRequest request) {
        if ("TASK_IDS".equals(scopeType)) {
            if (request.reviewTaskIds() == null || request.reviewTaskIds().isEmpty()) {
                throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "请选择至少一个审核任务");
            }
            List<Long> ids = request.reviewTaskIds().stream().filter(Objects::nonNull).distinct().toList();
            List<CheckTaskEntity> tasks = checkTaskRepository.findAllById(ids);
            if (tasks.size() != ids.size()) {
                throw new BusinessException("REVIEW_QUALITY_NOT_FOUND", "部分审核任务不存在");
            }
            return tasks;
        }
        ReviewQualityCheckTriggerRequest.QueryScope query = request.query();
        if (query == null) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "查询范围不能为空");
        }
        String view = lower(query.view() == null ? "pending" : query.view());
        if (!"pending".equals(view)) {
            throw new BusinessException("REVIEW_QUALITY_NOT_REVIEWABLE", "仅待审核列表可触发质量检查");
        }
        List<CheckTaskEntity> tasks = checkTaskRepository.findByClanIdAndStatus(clanId, STATUS_PENDING);
        if (query.branchId() != null) {
            tasks = tasks.stream().filter(task -> Objects.equals(query.branchId(), task.getBranchId())).toList();
        }
        if (query.targetType() != null && !query.targetType().isBlank()) {
            Map<Long, AuditRecordEntity> records = auditRecordRepository.findAllById(tasks.stream().map(CheckTaskEntity::getRevisionId).toList())
                    .stream().collect(Collectors.toMap(AuditRecordEntity::getId, Function.identity()));
            String targetType = lower(query.targetType());
            tasks = tasks.stream().filter(task -> {
                AuditRecordEntity record = records.get(task.getRevisionId());
                return record != null && targetType.equals(lower(record.getTargetType()));
            }).toList();
        }
        return tasks.stream().sorted(Comparator.comparing(CheckTaskEntity::getId)).limit(200).toList();
    }

    private void validateTaskScope(Long clanId, List<CheckTaskEntity> tasks, Long actorId) {
        for (CheckTaskEntity task : tasks) {
            if (!Objects.equals(clanId, task.getClanId())) {
                throw new BusinessException("REVIEW_QUALITY_FORBIDDEN", "审核任务不属于当前宗族");
            }
            if (!STATUS_PENDING.equals(lower(task.getStatus()))) {
                throw new BusinessException("REVIEW_QUALITY_TASK_STATE_CONFLICT", "仅待审核任务可执行质量检查");
            }
            authorizationApplicationService.requireBranchPermission(clanId, actorId, task.getBranchId(), REVIEW_APPROVE);
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
        List<String> normalized = values == null ? List.of() : values.stream().filter(Objects::nonNull).map(this::upper).distinct().toList();
        if ("REVIEW_GATE".equals(mode)) {
            return normalized.isEmpty() ? List.copyOf(GATE_RULES) : normalized.stream().filter(GATE_RULES::contains).toList();
        }
        return normalized;
    }

    private List<String> defaultRules(String mode) {
        return "REVIEW_GATE".equals(mode)
                ? List.copyOf(GATE_RULES)
                : List.of("PAYLOAD_INVALID", "RELATIONSHIP_CONFLICT", "GENERATION_MISMATCH", "MISSING_SOURCE");
    }

    private String blockLevel(String code) {
        return GATE_RULES.contains(code) ? "BLOCKING" : "WARNING";
    }

    private String ruleName(String code) {
        return switch (code) {
            case "PAYLOAD_INVALID" -> "审核快照完整性";
            case "RELATIONSHIP_CONFLICT" -> "人物关系冲突";
            case "GENERATION_MISMATCH" -> "字辈与世次一致性";
            case "MISSING_SOURCE" -> "来源证据覆盖";
            default -> code;
        };
    }

    private String ruleMessage(String code) {
        return switch (code) {
            case "PAYLOAD_INVALID" -> "审核快照缺失或无法解析";
            case "RELATIONSHIP_CONFLICT" -> "关系起点和终点不能是同一人物";
            case "GENERATION_MISMATCH" -> "人物字辈或世次信息不完整";
            case "MISSING_SOURCE" -> "变更对象缺少可识别的来源证据";
            default -> "发现数据质量问题";
        };
    }

    private String blockingMessage(ReviewQualityCheckResponse result) {
        return result.rules().stream()
                .filter(item -> "BLOCKING".equals(item.blockLevel()) && item.affectedTaskCount() > 0)
                .map(ReviewQualityRuleResult::message)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("存在阻断性质量问题，不能审核通过");
    }

    private boolean hasEvidence(JsonNode node) {
        for (String key : List.of("sourceId", "source_id", "sourceBindings", "source_bindings", "evidence", "attachments")) {
            JsonNode value = node.get(key);
            if (value != null && !value.isNull() && (!(value.isArray() || value.isObject()) || value.size() > 0)) {
                return true;
            }
        }
        return false;
    }

    private JsonNode first(JsonNode node, String... names) {
        for (String name : names) {
            JsonNode value = node.get(name);
            if (value != null) return value;
        }
        return null;
    }

    private Long longValue(JsonNode node, String... names) {
        JsonNode value = first(node, names);
        return value != null && value.canConvertToLong() ? value.longValue() : null;
    }

    private void add(Map<String, LinkedHashSet<Long>> affected, String code, Long taskId) {
        affected.computeIfAbsent(code, ignored -> new LinkedHashSet<>()).add(taskId);
    }

    private String fingerprint(String scopeType, String mode, List<Long> taskIds, Object query, List<String> rules) {
        String source = scopeType + "|" + mode + "|" + taskIds + "|" + write(query) + "|" + rules;
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

    private String lower(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String trim(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }

    private record Evaluation(ReviewQualityCheckSummary summary, List<ReviewQualityRuleResult> rules) {
    }
}
