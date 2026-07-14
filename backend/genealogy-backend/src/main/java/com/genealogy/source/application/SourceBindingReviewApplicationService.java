package com.genealogy.source.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationTraceContext;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingRevisionDeleteRequest;
import com.genealogy.source.dto.SourceBindingRevisionResponse;
import com.genealogy.source.dto.SourceBindingRevisionSubmitRequest;
import com.genealogy.source.dto.SourceBindingReviewDecisionRequest;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class SourceBindingReviewApplicationService {

    private static final String TARGET_TYPE_SOURCE_BINDING = "source_binding";
    private static final String CHANGE_CREATE = "create";
    private static final String CHANGE_REPLACE = "replace";
    private static final String CHANGE_DELETE = "delete";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final String BINDING_STATUS_OFFICIAL = "official";
    private static final String BINDING_STATUS_ARCHIVED = "archived";
    private static final String SOURCE_STATUS_OFFICIAL = "official";
    private static final String CONFIDENCE_UNKNOWN = "unknown";
    private static final String SOURCE_BIND = "source:bind";
    private static final String SOURCE_REVIEW = "source:review";
    private static final Set<String> TARGET_TYPES = Set.of("person", "relationship", "branch", "clan", "generation_word");
    private static final Set<String> CONFIDENCE_LEVELS = Set.of("high", "medium", "low", CONFIDENCE_UNKNOWN);

    private final SourceRepository sourceRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final ClanRepository clanRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final ObjectMapper objectMapper;

    public SourceBindingReviewApplicationService(
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            ClanRepository clanRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            ObjectMapper objectMapper
    ) {
        this.sourceRepository = sourceRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.clanRepository = clanRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SourceBindingRevisionResponse submitCreate(Long clanId, SourceBindingRevisionSubmitRequest request, Long actorId, String requestId, String clientIp) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_BIND);
        SourceBindingCreateRequest binding = request.binding();
        SourceEntity source = getOfficialSourceInClan(binding.sourceId(), clanId);
        validateTargetType(binding.targetType());
        ensureNoActiveBinding(binding.sourceId(), binding.targetType(), binding.targetId());
        ensureNoPendingRevision(binding.sourceId(), "来源绑定新增正在审核中，不能重复提交");

        RevisionEntity revision = createRevision(
                clanId,
                binding.sourceId(),
                CHANGE_CREATE,
                null,
                bindingSnapshot(binding, source.getConfidenceLevel()),
                summary("新增来源绑定", binding, request.changeReason()),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(revision);
        operationLogApplicationService.record(clanId, actorId, "source_binding_revision_submit", "revision", revision.getId(),
                "submit source binding create revision", revision.getDiffSummary(), requestId, clientIp, trace(revision, task, "submitted"));
        return toResponse(revision, task);
    }

    @Transactional
    public SourceBindingRevisionResponse submitReplace(Long bindingId, SourceBindingRevisionSubmitRequest request, Long actorId, String requestId, String clientIp) {
        SourceBindingEntity before = getActiveBinding(bindingId);
        authorizationApplicationService.requirePermission(before.getClanId(), actorId, SOURCE_BIND);
        SourceBindingCreateRequest after = request.binding();
        SourceEntity source = getOfficialSourceInClan(after.sourceId(), before.getClanId());
        validateTargetType(after.targetType());
        if (!Objects.equals(before.getSourceId(), after.sourceId())
                || !Objects.equals(before.getTargetType(), after.targetType())
                || !Objects.equals(before.getTargetId(), after.targetId())) {
            ensureNoActiveBinding(after.sourceId(), after.targetType(), after.targetId());
        }
        ensureNoPendingRevision(bindingId, "来源绑定替换正在审核中，不能重复提交");

        RevisionEntity revision = createRevision(
                before.getClanId(),
                bindingId,
                CHANGE_REPLACE,
                bindingSnapshot(before),
                bindingSnapshot(after, source.getConfidenceLevel()),
                summary("替换来源绑定", after, request.changeReason()),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(revision);
        operationLogApplicationService.record(before.getClanId(), actorId, "source_binding_revision_submit", "revision", revision.getId(),
                "submit source binding replace revision", revision.getDiffSummary(), requestId, clientIp, trace(revision, task, "submitted"));
        return toResponse(revision, task);
    }

    @Transactional
    public SourceBindingRevisionResponse submitDelete(Long bindingId, SourceBindingRevisionDeleteRequest request, Long actorId, String requestId, String clientIp) {
        SourceBindingEntity before = getActiveBinding(bindingId);
        authorizationApplicationService.requirePermission(before.getClanId(), actorId, SOURCE_BIND);
        ensureNoPendingRevision(bindingId, "来源绑定删除正在审核中，不能重复提交");

        RevisionEntity revision = createRevision(
                before.getClanId(),
                bindingId,
                CHANGE_DELETE,
                bindingSnapshot(before),
                null,
                "删除来源绑定：" + before.getTargetType() + ":" + before.getTargetId() + optionalReason(request.changeReason()),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(revision);
        operationLogApplicationService.record(before.getClanId(), actorId, "source_binding_revision_submit", "revision", revision.getId(),
                "submit source binding delete revision", revision.getDiffSummary(), requestId, clientIp, trace(revision, task, "submitted"));
        return toResponse(revision, task);
    }

    @Transactional
    public SourceBindingRevisionResponse approve(Long revisionId, SourceBindingReviewDecisionRequest request, Long actorId, String requestId, String clientIp) {
        RevisionEntity revision = getPendingRevision(revisionId);
        authorizationApplicationService.requirePermission(revision.getClanId(), actorId, SOURCE_REVIEW);
        if (Objects.equals(revision.getSubmitterId(), actorId)) {
            throw new BusinessException("SOURCE_BINDING_REVIEW_SELF_FORBIDDEN", "审核员不能审核自己提交的来源绑定变更");
        }
        ReviewTaskEntity task = getPendingTask(revisionId);
        applyRevision(revision);
        revision.setStatus(STATUS_APPROVED);
        revision.setApprovedAt(LocalDateTime.now());
        RevisionEntity savedRevision = revisionRepository.save(revision);
        task.setStatus(STATUS_APPROVED);
        task.setReviewerId(actorId);
        task.setReviewComment(request.reviewComment());
        task.setReviewedAt(LocalDateTime.now());
        ReviewTaskEntity savedTask = reviewTaskRepository.save(task);
        operationLogApplicationService.record(
                revision.getClanId(), actorId, "source_binding_revision_apply", "revision", revision.getId(),
                "apply source binding revision", revision.getDiffSummary(), requestId, clientIp, trace(savedRevision, savedTask, "applied")
        );
        operationLogApplicationService.record(
                revision.getClanId(), actorId, "source_binding_revision_approve", "revision", revision.getId(),
                "approve source binding revision", revision.getDiffSummary(), requestId, clientIp, trace(savedRevision, savedTask, "approved")
        );
        return toResponse(savedRevision, savedTask);
    }

    @Transactional
    public SourceBindingRevisionResponse reject(Long revisionId, SourceBindingReviewDecisionRequest request, Long actorId, String requestId, String clientIp) {
        RevisionEntity revision = getPendingRevision(revisionId);
        authorizationApplicationService.requirePermission(revision.getClanId(), actorId, SOURCE_REVIEW);
        if (Objects.equals(revision.getSubmitterId(), actorId)) {
            throw new BusinessException("SOURCE_BINDING_REVIEW_SELF_FORBIDDEN", "审核员不能审核自己提交的来源绑定变更");
        }
        ReviewTaskEntity task = getPendingTask(revisionId);
        revision.setStatus(STATUS_REJECTED);
        revision.setRejectedReason(request.reviewComment());
        RevisionEntity savedRevision = revisionRepository.save(revision);
        task.setStatus(STATUS_REJECTED);
        task.setReviewerId(actorId);
        task.setReviewComment(request.reviewComment());
        task.setReviewedAt(LocalDateTime.now());
        ReviewTaskEntity savedTask = reviewTaskRepository.save(task);
        operationLogApplicationService.record(
                revision.getClanId(), actorId, "source_binding_revision_reject", "revision", revision.getId(),
                "reject source binding revision", request.reviewComment(), requestId, clientIp, trace(savedRevision, savedTask, "rejected")
        );
        return toResponse(savedRevision, savedTask);
    }

    private void applyRevision(RevisionEntity revision) {
        switch (revision.getChangeType()) {
            case CHANGE_CREATE -> createBindingFromRevision(revision);
            case CHANGE_REPLACE -> replaceBindingFromRevision(revision);
            case CHANGE_DELETE -> archiveBindingFromRevision(revision);
            default -> throw new BusinessException("SOURCE_BINDING_CHANGE_TYPE_INVALID", "来源绑定变更类型不合法");
        }
    }

    private void createBindingFromRevision(RevisionEntity revision) {
        Map<String, Object> data = parseJson(revision.getAfterData());
        Long sourceId = longValue(data.get("sourceId"));
        String targetType = stringValue(data.get("targetType"));
        Long targetId = longValue(data.get("targetId"));
        ensureNoActiveBinding(sourceId, targetType, targetId);
        SourceBindingEntity entity = new SourceBindingEntity();
        applyBindingData(entity, revision.getClanId(), data, revision.getSubmitterId());
        sourceBindingRepository.save(entity);
    }

    private void replaceBindingFromRevision(RevisionEntity revision) {
        SourceBindingEntity entity = getActiveBinding(revision.getTargetId());
        Map<String, Object> data = parseJson(revision.getAfterData());
        if (!Objects.equals(entity.getSourceId(), longValue(data.get("sourceId")))
                || !Objects.equals(entity.getTargetType(), stringValue(data.get("targetType")))
                || !Objects.equals(entity.getTargetId(), longValue(data.get("targetId")))) {
            ensureNoActiveBinding(longValue(data.get("sourceId")), stringValue(data.get("targetType")), longValue(data.get("targetId")));
        }
        applyBindingData(entity, revision.getClanId(), data, entity.getCreatedBy());
        sourceBindingRepository.save(entity);
    }

    private void archiveBindingFromRevision(RevisionEntity revision) {
        SourceBindingEntity entity = getActiveBinding(revision.getTargetId());
        entity.setBindingStatus(BINDING_STATUS_ARCHIVED);
        entity.setUpdatedAt(LocalDateTime.now());
        sourceBindingRepository.save(entity);
    }

    private void applyBindingData(SourceBindingEntity entity, Long clanId, Map<String, Object> data, Long createdBy) {
        entity.setClanId(clanId);
        entity.setSourceId(longValue(data.get("sourceId")));
        entity.setTargetType(stringValue(data.get("targetType")));
        entity.setTargetId(longValue(data.get("targetId")));
        entity.setBindingReason(stringValue(data.get("bindingReason")));
        entity.setExcerpt(stringValue(data.get("excerpt")));
        entity.setConfidenceLevel(normalizeConfidenceLevel(stringValue(data.get("confidenceLevel")), CONFIDENCE_UNKNOWN));
        entity.setBindingStatus(BINDING_STATUS_OFFICIAL);
        if (entity.getCreatedAt() == null) {
            entity.setCreatedBy(createdBy);
            entity.setCreatedAt(LocalDateTime.now());
        }
        entity.setUpdatedAt(LocalDateTime.now());
    }

    private RevisionEntity createRevision(Long clanId, Long targetId, String changeType, Map<String, Object> beforeData, Map<String, Object> afterData, String diffSummary, Long actorId) {
        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(clanId);
        revision.setTargetType(TARGET_TYPE_SOURCE_BINDING);
        revision.setTargetId(targetId);
        revision.setChangeType(changeType);
        revision.setBeforeData(toJson(beforeData));
        revision.setAfterData(toJson(afterData));
        revision.setDiffSummary(diffSummary);
        revision.setSubmitterId(actorId);
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus(STATUS_PENDING);
        return revisionRepository.save(revision);
    }

    private ReviewTaskEntity createReviewTask(RevisionEntity revision) {
        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setClanId(revision.getClanId());
        task.setRevisionId(revision.getId());
        task.setTraceId(revision.getTraceId());
        task.setReviewLevel(1);
        task.setReviewerRole("reviewer");
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(LocalDateTime.now());
        return reviewTaskRepository.save(task);
    }

    private SourceEntity getOfficialSourceInClan(Long sourceId, Long clanId) {
        SourceEntity source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "source not found"));
        if (!Objects.equals(source.getClanId(), clanId)) {
            throw new BusinessException("SOURCE_CLAN_MISMATCH", "source is not in clan");
        }
        String status = source.getVerificationStatus() == null ? null : source.getVerificationStatus().toLowerCase(Locale.ROOT);
        if ("verified".equals(status) || "reviewed".equals(status) || "approved".equals(status)) {
            status = SOURCE_STATUS_OFFICIAL;
        }
        if (!SOURCE_STATUS_OFFICIAL.equals(status)) {
            throw new BusinessException("SOURCE_NOT_OFFICIAL", "资料来源审核通过后才能绑定业务对象");
        }
        return source;
    }

    private SourceBindingEntity getActiveBinding(Long bindingId) {
        SourceBindingEntity binding = sourceBindingRepository.findById(bindingId)
                .orElseThrow(() -> new BusinessException("SOURCE_BINDING_NOT_FOUND", "来源绑定不存在"));
        if (BINDING_STATUS_ARCHIVED.equals(binding.getBindingStatus())) {
            throw new BusinessException("SOURCE_BINDING_ARCHIVED", "来源绑定已归档，不能直接变更");
        }
        return binding;
    }

    private RevisionEntity getPendingRevision(Long revisionId) {
        RevisionEntity revision = revisionRepository.findByIdAndTargetType(revisionId, TARGET_TYPE_SOURCE_BINDING)
                .orElseThrow(() -> new BusinessException("SOURCE_BINDING_REVISION_NOT_FOUND", "来源绑定变更不存在"));
        if (!STATUS_PENDING.equals(revision.getStatus())) {
            throw new BusinessException("SOURCE_BINDING_REVISION_NOT_PENDING", "来源绑定变更不是待审核状态");
        }
        return revision;
    }

    private ReviewTaskEntity getPendingTask(Long revisionId) {
        ReviewTaskEntity task = reviewTaskRepository.findFirstByRevisionIdOrderByReviewLevelAsc(revisionId)
                .orElseThrow(() -> new BusinessException("SOURCE_BINDING_REVIEW_TASK_NOT_FOUND", "来源绑定审核任务不存在"));
        if (!STATUS_PENDING.equals(task.getStatus())) {
            throw new BusinessException("SOURCE_BINDING_REVIEW_TASK_NOT_PENDING", "来源绑定审核任务不是待审核状态");
        }
        return task;
    }

    private void ensureNoActiveBinding(Long sourceId, String targetType, Long targetId) {
        if (sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(sourceId, targetType, targetId, BINDING_STATUS_ARCHIVED)) {
            throw new BusinessException("SOURCE_BINDING_DUPLICATED", "source binding already exists");
        }
    }

    private void ensureNoPendingRevision(Long targetId, String message) {
        if (revisionRepository.existsByTargetTypeAndTargetIdAndStatus(TARGET_TYPE_SOURCE_BINDING, targetId, STATUS_PENDING)) {
            throw new BusinessException("SOURCE_BINDING_REVISION_PENDING", message);
        }
    }

    private void validateTargetType(String targetType) {
        if (targetType == null || !TARGET_TYPES.contains(targetType)) {
            throw new BusinessException("SOURCE_TARGET_TYPE_INVALID", "来源绑定对象类型不合法");
        }
    }

    private Map<String, Object> bindingSnapshot(SourceBindingCreateRequest request, String defaultConfidence) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("sourceId", request.sourceId());
        map.put("targetType", request.targetType());
        map.put("targetId", request.targetId());
        map.put("bindingReason", request.bindingReason());
        map.put("excerpt", request.excerpt());
        map.put("confidenceLevel", normalizeConfidenceLevel(request.confidenceLevel(), defaultConfidence));
        map.put("bindingStatus", BINDING_STATUS_OFFICIAL);
        return map;
    }

    private Map<String, Object> bindingSnapshot(SourceBindingEntity entity) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entity.getId());
        map.put("sourceId", entity.getSourceId());
        map.put("targetType", entity.getTargetType());
        map.put("targetId", entity.getTargetId());
        map.put("bindingReason", entity.getBindingReason());
        map.put("excerpt", entity.getExcerpt());
        map.put("confidenceLevel", normalizeConfidenceLevel(entity.getConfidenceLevel(), CONFIDENCE_UNKNOWN));
        map.put("bindingStatus", entity.getBindingStatus());
        return map;
    }

    private SourceBindingRevisionResponse toResponse(RevisionEntity revision, ReviewTaskEntity task) {
        return new SourceBindingRevisionResponse(
                revision.getId(),
                task == null ? null : task.getId(),
                revision.getClanId(),
                revision.getTargetId(),
                revision.getChangeType(),
                revision.getStatus(),
                revision.getDiffSummary(),
                revision.getSubmitterId(),
                revision.getSubmitTime(),
                revision.getApprovedAt(),
                revision.getRejectedReason(),
                revision.getTraceId()
        );
    }

    private OperationTraceContext trace(RevisionEntity revision, ReviewTaskEntity task, String result) {
        return OperationTraceContext.of(
                revision.getTraceId(), revision.getId(), task == null ? null : task.getId(),
                revision.getTargetType(), revision.getTargetId(), result
        );
    }

    private String summary(String action, SourceBindingCreateRequest binding, String reason) {
        return action + "：source=" + binding.sourceId() + " -> " + binding.targetType() + ":" + binding.targetId() + optionalReason(reason);
    }

    private String optionalReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "";
        }
        return "，原因：" + reason.trim();
    }

    private String normalizeConfidenceLevel(String value, String defaultValue) {
        String normalized = value == null || value.isBlank() ? defaultValue : value.trim().toLowerCase(Locale.ROOT);
        if (!CONFIDENCE_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_CONFIDENCE_INVALID", "来源可信度不合法");
        }
        return normalized;
    }

    private String toJson(Map<String, Object> data) {
        if (data == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("SOURCE_BINDING_REVISION_SERIALIZE_FAILED", "来源绑定变更序列化失败");
        }
    }

    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException exception) {
            throw new BusinessException("SOURCE_BINDING_REVISION_PARSE_FAILED", "来源绑定变更解析失败");
        }
    }

    private Long longValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String string && !string.isBlank()) {
            return Long.parseLong(string);
        }
        return null;
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
