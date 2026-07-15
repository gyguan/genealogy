package com.genealogy.culture.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.dto.CultureArchiveRequest;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureSubmitReviewRequest;
import com.genealogy.culture.dto.MigrationEventUpdateRequest;
import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureRevisionPayloadRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class MigrationEventGovernanceApplicationService {

    public static final String TARGET_TYPE = "migration_event";
    public static final String CHANGE_PUBLISH = "migration_publish";
    public static final String CHANGE_UPDATE = "migration_update";
    public static final String CHANGE_DELETE = "migration_delete";
    public static final String CHANGE_ARCHIVE = "migration_archive";

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_REJECTED = "rejected";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_ARCHIVED = "archived";
    private static final String BINDING_ARCHIVED = "archived";

    private final MigrationEventRepository migrationEventRepository;
    private final CultureRevisionPayloadRepository payloadRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final MigrationEventPermissionPolicyService permissionPolicyService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ObjectMapper objectMapper;

    public MigrationEventGovernanceApplicationService(
            MigrationEventRepository migrationEventRepository,
            CultureRevisionPayloadRepository payloadRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            SourceBindingRepository sourceBindingRepository,
            MigrationEventPermissionPolicyService permissionPolicyService,
            OperationLogApplicationService operationLogApplicationService,
            ObjectMapper objectMapper
    ) {
        this.migrationEventRepository = migrationEventRepository;
        this.payloadRepository = payloadRepository;
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.permissionPolicyService = permissionPolicyService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CultureCommandResponse submitReview(
            Long eventId,
            CultureSubmitReviewRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        MigrationEventEntity event = requireEvent(eventId, actorId);
        permissionPolicyService.requireAction(event, actorId, MigrationEventPermissionPolicyService.SUBMIT_REVIEW);
        String status = normalize(event.getDataStatus());
        if (!STATUS_DRAFT.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new BusinessException("MIGRATION_REVIEW_STATUS_INVALID", "只有草稿或驳回迁徙事件可以提交审核");
        }
        ensureNoPendingRevision(eventId);
        if (sourceBindingRepository.findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                event.getClanId(), TARGET_TYPE, eventId, BINDING_ARCHIVED).isEmpty()) {
            throw new BusinessException("MIGRATION_SOURCE_REQUIRED", "迁徙事件至少绑定一条来源后才能提交审核");
        }

        Map<String, Object> before = snapshot(event);
        event.setDataStatus(STATUS_PENDING_REVIEW);
        MigrationEventEntity saved = migrationEventRepository.save(event);
        RevisionEntity revision = createRevision(
                saved,
                CHANGE_PUBLISH,
                before,
                snapshot(saved),
                summary("提交迁徙事件审核", saved, request == null ? null : request.comment()),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(saved, revision);
        record(saved, actorId, "migration_event_review_submit", "提交迁徙事件审核", revision.getDiffSummary(), requestId, clientIp);
        return command(saved, STATUS_PENDING_REVIEW, task.getId(), "迁徙事件已提交审核");
    }

    @Transactional
    public CultureCommandResponse submitOfficialUpdate(
            MigrationEventEntity event,
            MigrationEventUpdateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        permissionPolicyService.requireAction(event, actorId, MigrationEventPermissionPolicyService.UPDATE);
        if (!STATUS_OFFICIAL.equals(normalize(event.getDataStatus()))) {
            throw new BusinessException("MIGRATION_REVIEW_STATUS_INVALID", "只有正式迁徙事件需要创建变更审核");
        }
        if (!Objects.equals(event.getVersion(), request.version())) {
            throw new BusinessException("MIGRATION_EVENT_VERSION_CONFLICT", "迁徙事件版本已变化，请刷新后重试");
        }
        ensureNoPendingRevision(event.getId());
        RevisionEntity revision = createRevision(
                event,
                CHANGE_UPDATE,
                snapshot(event),
                updateSnapshot(request),
                summary("提交正式迁徙事件变更", event, null),
                actorId
        );
        savePayload(revision.getId(), request);
        ReviewTaskEntity task = createReviewTask(event, revision);
        record(event, actorId, "migration_event_change_submit", "提交正式迁徙事件变更", revision.getDiffSummary(), requestId, clientIp);
        return command(event, STATUS_PENDING_REVIEW, task.getId(), "正式迁徙事件变更已提交审核");
    }

    @Transactional
    public CultureCommandResponse submitOfficialDelete(
            MigrationEventEntity event,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        permissionPolicyService.requireAction(event, actorId, MigrationEventPermissionPolicyService.DELETE);
        if (!STATUS_OFFICIAL.equals(normalize(event.getDataStatus()))) {
            throw new BusinessException("MIGRATION_REVIEW_STATUS_INVALID", "只有正式迁徙事件需要创建删除审核");
        }
        ensureNoPendingRevision(event.getId());
        RevisionEntity revision = createRevision(
                event,
                CHANGE_DELETE,
                snapshot(event),
                Map.of("deleted", true),
                summary("提交正式迁徙事件删除", event, null),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(event, revision);
        record(event, actorId, "migration_event_delete_submit", "提交正式迁徙事件删除", revision.getDiffSummary(), requestId, clientIp);
        return command(event, STATUS_PENDING_REVIEW, task.getId(), "正式迁徙事件删除已提交审核");
    }

    @Transactional
    public CultureCommandResponse archive(
            Long eventId,
            CultureArchiveRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        MigrationEventEntity event = requireEvent(eventId, actorId);
        permissionPolicyService.requireAction(event, actorId, MigrationEventPermissionPolicyService.ARCHIVE);
        String status = normalize(event.getDataStatus());
        if (STATUS_ARCHIVED.equals(status)) {
            throw new BusinessException("MIGRATION_EVENT_ALREADY_ARCHIVED", "迁徙事件已归档");
        }
        if (STATUS_PENDING_REVIEW.equals(status)) {
            throw new BusinessException("MIGRATION_EVENT_PENDING_REVIEW", "迁徙事件正在审核中，不能归档");
        }
        String reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.isBlank()) throw new BusinessException("MIGRATION_ARCHIVE_REASON_REQUIRED", "归档迁徙事件必须填写原因");

        if (!STATUS_OFFICIAL.equals(status)) {
            event.setDataStatus(STATUS_ARCHIVED);
            MigrationEventEntity saved = migrationEventRepository.save(event);
            record(saved, actorId, "migration_event_archive", "归档迁徙事件", "reason=" + reason, requestId, clientIp);
            return command(saved, STATUS_ARCHIVED, null, "迁徙事件已归档");
        }

        ensureNoPendingRevision(eventId);
        RevisionEntity revision = createRevision(
                event,
                CHANGE_ARCHIVE,
                snapshot(event),
                Map.of("dataStatus", STATUS_ARCHIVED, "reason", reason),
                summary("提交正式迁徙事件归档", event, reason),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(event, revision);
        record(event, actorId, "migration_event_archive_submit", "提交正式迁徙事件归档", revision.getDiffSummary(), requestId, clientIp);
        return command(event, STATUS_PENDING_REVIEW, task.getId(), "正式迁徙事件归档已提交审核");
    }

    @Transactional(readOnly = true)
    public boolean hasPendingRevision(Long eventId) {
        return revisionRepository.existsByTargetTypeAndTargetIdAndStatus(TARGET_TYPE, eventId, STATUS_PENDING);
    }

    private MigrationEventEntity requireEvent(Long eventId, Long actorId) {
        MigrationEventEntity event = migrationEventRepository.findByIdAndDeletedAtIsNull(eventId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见"));
        permissionPolicyService.requireVisible(event, actorId);
        return event;
    }

    private void ensureNoPendingRevision(Long eventId) {
        if (hasPendingRevision(eventId)) {
            throw new BusinessException("MIGRATION_REVISION_PENDING", "迁徙事件已有待审核变更，不能重复提交");
        }
    }

    private RevisionEntity createRevision(
            MigrationEventEntity event,
            String changeType,
            Map<String, Object> before,
            Map<String, Object> after,
            String diffSummary,
            Long actorId
    ) {
        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(event.getClanId());
        revision.setTargetType(TARGET_TYPE);
        revision.setTargetId(event.getId());
        revision.setChangeType(changeType);
        revision.setBeforeData(toJson(before));
        revision.setAfterData(toJson(after));
        revision.setDiffSummary(diffSummary);
        revision.setSubmitterId(actorId);
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus(STATUS_PENDING);
        return revisionRepository.save(revision);
    }

    private ReviewTaskEntity createReviewTask(MigrationEventEntity event, RevisionEntity revision) {
        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setClanId(event.getClanId());
        task.setRevisionId(revision.getId());
        task.setTraceId(revision.getTraceId());
        task.setReviewLevel(1);
        task.setReviewerRole("reviewer");
        task.setBranchId(event.getBranchId());
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(LocalDateTime.now());
        return reviewTaskRepository.save(task);
    }

    private void savePayload(Long revisionId, MigrationEventUpdateRequest request) {
        CultureRevisionPayloadEntity payload = new CultureRevisionPayloadEntity();
        payload.setRevisionId(revisionId);
        payload.setPayloadJson(toJson(request));
        payloadRepository.save(payload);
    }

    private Map<String, Object> snapshot(MigrationEventEntity event) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("branchId", event.getBranchId());
        data.put("sequenceNo", event.getSequenceNo());
        data.put("fromLocation", event.getFromLocation());
        data.put("toLocation", event.getToLocation());
        data.put("migrationTimeText", event.getMigrationTimeText());
        data.put("founderPersonId", event.getFounderPersonId());
        data.put("reason", event.getReason());
        data.put("descriptionLength", event.getDescription() == null ? 0 : event.getDescription().length());
        data.put("confidenceLevel", event.getConfidenceLevel());
        data.put("privacyLevel", event.getPrivacyLevel());
        data.put("sensitiveLevel", event.getSensitiveLevel());
        data.put("dataStatus", event.getDataStatus());
        data.put("version", event.getVersion());
        return data;
    }

    private Map<String, Object> updateSnapshot(MigrationEventUpdateRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("branchId", request.branchId());
        data.put("sequenceNo", request.sequenceNo());
        data.put("fromLocation", request.fromLocation());
        data.put("toLocation", request.toLocation());
        data.put("migrationTimeText", request.migrationTimeText());
        data.put("founderPersonId", request.founderPersonId());
        data.put("reason", request.reason());
        data.put("descriptionLength", request.description() == null ? 0 : request.description().length());
        data.put("confidenceLevel", request.confidenceLevel());
        data.put("privacyLevel", request.privacyLevel());
        data.put("sensitiveLevel", request.sensitiveLevel());
        data.put("expectedVersion", request.version());
        return data;
    }

    private String summary(String action, MigrationEventEntity event, String note) {
        String base = action + "：" + event.getFromLocation() + " → " + event.getToLocation();
        return note == null || note.isBlank() ? base : base + "；" + note.trim();
    }

    private CultureCommandResponse command(MigrationEventEntity event, String status, Long reviewTaskId, String message) {
        return new CultureCommandResponse(TARGET_TYPE, event.getId(), status, reviewTaskId, message);
    }

    private void record(
            MigrationEventEntity event,
            Long actorId,
            String action,
            String summary,
            String detail,
            String requestId,
            String clientIp
    ) {
        operationLogApplicationService.record(
                event.getClanId(), actorId, action, TARGET_TYPE, event.getId(), summary, detail, requestId, clientIp
        );
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("MIGRATION_REVISION_PAYLOAD_INVALID", "迁徙事件审核载荷无法序列化");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
