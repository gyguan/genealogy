package com.genealogy.culture.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
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

    public static final String TARGET_TYPE = MigrationEventApplicationService.TARGET_TYPE;
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
            Long migrationEventId,
            CultureSubmitReviewRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        MigrationEventEntity event = requireEvent(migrationEventId, actorId);
        permissionPolicyService.requireAction(event, actorId, CulturePermissionPolicyService.SUBMIT_REVIEW);
        String status = normalize(event.getDataStatus());
        if (!STATUS_DRAFT.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new BusinessException("MIGRATION_REVIEW_STATUS_INVALID", "只有草稿或驳回迁徙事件可以提交审核");
        }
        ensureNoPendingRevision(event.getId());
        if (sourceBindingRepository.findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                event.getClanId(), TARGET_TYPE, event.getId(), BINDING_ARCHIVED).isEmpty()) {
            throw new BusinessException("MIGRATION_SOURCE_REQUIRED", "迁徙事件至少绑定一条正式来源后才能提交审核");
        }
        Map<String, Object> before = safeSnapshot(event);
        event.setDataStatus(STATUS_PENDING_REVIEW);
        MigrationEventEntity saved = migrationEventRepository.save(event);
        RevisionEntity revision = createRevision(
                saved,
                CHANGE_PUBLISH,
                before,
                safeSnapshot(saved),
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
        permissionPolicyService.requireAction(event, actorId, CulturePermissionPolicyService.UPDATE);
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
                safeSnapshot(event),
                safeUpdateSnapshot(request),
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
        permissionPolicyService.requireAction(event, actorId, CulturePermissionPolicyService.DELETE);
        if (!STATUS_OFFICIAL.equals(normalize(event.getDataStatus()))) {
            throw new BusinessException("MIGRATION_REVIEW_STATUS_INVALID", "只有正式迁徙事件需要创建删除审核");
        }
        ensureNoPendingRevision(event.getId());
        RevisionEntity revision = createRevision(
                event,
                CHANGE_DELETE,
                safeSnapshot(event),
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
            Long migrationEventId,
            CultureArchiveRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        MigrationEventEntity event = requireEvent(migrationEventId, actorId);
        permissionPolicyService.requireAction(event, actorId, CulturePermissionPolicyService.ARCHIVE);
        String status = normalize(event.getDataStatus());
        if (STATUS_ARCHIVED.equals(status)) {
            throw new BusinessException("MIGRATION_EVENT_ALREADY_ARCHIVED", "迁徙事件已归档");
        }
        if (STATUS_PENDING_REVIEW.equals(status)) {
            throw new BusinessException("MIGRATION_EVENT_PENDING_REVIEW", "迁徙事件正在审核中，不能归档");
        }
        String reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.isBlank()) {
            throw new BusinessException("MIGRATION_ARCHIVE_REASON_REQUIRED", "归档迁徙事件必须填写原因");
        }
        if (!STATUS_OFFICIAL.equals(status)) {
            event.setDataStatus(STATUS_ARCHIVED);
            MigrationEventEntity saved = migrationEventRepository.save(event);
            record(saved, actorId, "migration_event_archive", "归档迁徙事件", "reason=" + reason, requestId, clientIp);
            return command(saved, STATUS_ARCHIVED, null, "迁徙事件已归档");
        }
        ensureNoPendingRevision(event.getId());
        RevisionEntity revision = createRevision(
                event,
                CHANGE_ARCHIVE,
                safeSnapshot(event),
                Map.of("dataStatus", STATUS_ARCHIVED, "reason", reason),
                summary("提交正式迁徙事件归档", event, reason),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(event, revision);
        record(event, actorId, "migration_event_archive_submit", "提交正式迁徙事件归档", revision.getDiffSummary(), requestId, clientIp);
        return command(event, STATUS_PENDING_REVIEW, task.getId(), "正式迁徙事件归档已提交审核");
    }

    @Transactional(readOnly = true)
    public boolean hasPendingRevision(Long migrationEventId) {
        return revisionRepository.existsByTargetTypeAndTargetIdAndStatus(TARGET_TYPE, migrationEventId, STATUS_PENDING);
    }

    private MigrationEventEntity requireEvent(Long id, Long actorId) {
        MigrationEventEntity event = migrationEventRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见"));
        permissionPolicyService.requireVisible(event, actorId);
        return event;
    }

    private void ensureNoPendingRevision(Long id) {
        if (hasPendingRevision(id)) {
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

    private Map<String, Object> safeSnapshot(MigrationEventEntity event) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("branchId", event.getBranchId());
        value.put("sequenceNo", event.getSequenceNo());
        value.put("fromLocation", event.getFromLocation());
        value.put("toLocation", event.getToLocation());
        value.put("migrationTimeText", event.getMigrationTimeText());
        value.put("founderPersonId", event.getFounderPersonId());
        value.put("reason", event.getReason());
        value.put("descriptionLength", event.getDescription() == null ? 0 : event.getDescription().length());
        value.put("confidenceLevel", event.getConfidenceLevel());
        value.put("privacyLevel", event.getPrivacyLevel());
        value.put("sensitiveLevel", event.getSensitiveLevel());
        value.put("dataStatus", event.getDataStatus());
        value.put("version", event.getVersion());
        return value;
    }

    private Map<String, Object> safeUpdateSnapshot(MigrationEventUpdateRequest request) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("branchId", request.branchId());
        value.put("sequenceNo", request.sequenceNo());
        value.put("fromLocation", request.fromLocation());
        value.put("toLocation", request.toLocation());
        value.put("migrationTimeText", request.migrationTimeText());
        value.put("founderPersonId", request.founderPersonId());
        value.put("reason", request.reason());
        value.put("descriptionLength", request.description() == null ? 0 : request.description().length());
        value.put("confidenceLevel", request.confidenceLevel());
        value.put("privacyLevel", request.privacyLevel());
        value.put("sensitiveLevel", request.sensitiveLevel());
        value.put("expectedVersion", request.version());
        return value;
    }

    private String summary(String action, MigrationEventEntity event, String note) {
        String route = event.getFromLocation() + " → " + event.getToLocation();
        return note == null || note.isBlank() ? action + "：" + route : action + "：" + route + "，说明：" + note.trim();
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

    private CultureCommandResponse command(MigrationEventEntity event, String status, Long taskId, String message) {
        return new CultureCommandResponse(TARGET_TYPE, event.getId(), status, taskId, message);
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("MIGRATION_REVISION_SERIALIZE_FAILED", "迁徙事件审核载荷序列化失败");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
