package com.genealogy.culture.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.dto.CultureArchiveRequest;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.dto.CultureSubmitReviewRequest;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.CultureRevisionPayloadRepository;
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
public class CultureItemGovernanceApplicationService {

    public static final String TARGET_TYPE = "culture_item";
    public static final String CHANGE_PUBLISH = "culture_publish";
    public static final String CHANGE_UPDATE = "culture_update";
    public static final String CHANGE_DELETE = "culture_delete";
    public static final String CHANGE_ARCHIVE = "culture_archive";

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_REJECTED = "rejected";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_ARCHIVED = "archived";
    private static final String BINDING_ARCHIVED = "archived";

    private final CultureItemRepository cultureItemRepository;
    private final CultureRevisionPayloadRepository payloadRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final CulturePermissionPolicyService permissionPolicyService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ObjectMapper objectMapper;

    public CultureItemGovernanceApplicationService(
            CultureItemRepository cultureItemRepository,
            CultureRevisionPayloadRepository payloadRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            SourceBindingRepository sourceBindingRepository,
            CulturePermissionPolicyService permissionPolicyService,
            OperationLogApplicationService operationLogApplicationService,
            ObjectMapper objectMapper
    ) {
        this.cultureItemRepository = cultureItemRepository;
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
            Long cultureItemId,
            CultureSubmitReviewRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureItemEntity item = requireItem(cultureItemId, actorId);
        permissionPolicyService.requireAction(item, actorId, CulturePermissionPolicyService.SUBMIT_REVIEW);
        String status = normalize(item.getDataStatus());
        if (!STATUS_DRAFT.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new BusinessException("CULTURE_REVIEW_STATUS_INVALID", "只有草稿或驳回资料可以提交审核");
        }
        ensureNoPendingRevision(item.getId());
        if (sourceBindingRepository.findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                item.getClanId(), TARGET_TYPE, item.getId(), BINDING_ARCHIVED).isEmpty()) {
            throw new BusinessException("CULTURE_SOURCE_REQUIRED", "文化资料至少绑定一条正式来源后才能提交审核");
        }

        Map<String, Object> before = safeSnapshot(item);
        item.setDataStatus(STATUS_PENDING_REVIEW);
        CultureItemEntity saved = cultureItemRepository.save(item);
        RevisionEntity revision = createRevision(
                saved,
                CHANGE_PUBLISH,
                before,
                safeSnapshot(saved),
                summary("提交文化资料审核", saved, request == null ? null : request.comment()),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(saved, revision);
        record(saved, actorId, "culture_item_review_submit", "提交文化资料审核", revision.getDiffSummary(), requestId, clientIp);
        return command(saved, STATUS_PENDING_REVIEW, task.getId(), "文化资料已提交审核");
    }

    @Transactional
    public CultureCommandResponse submitOfficialUpdate(
            CultureItemEntity item,
            CultureItemUpdateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        permissionPolicyService.requireAction(item, actorId, CulturePermissionPolicyService.UPDATE);
        if (!STATUS_OFFICIAL.equals(normalize(item.getDataStatus()))) {
            throw new BusinessException("CULTURE_REVIEW_STATUS_INVALID", "只有正式文化资料需要创建变更审核");
        }
        if (!Objects.equals(item.getVersion(), request.version())) {
            throw new BusinessException("CULTURE_ITEM_VERSION_CONFLICT", "文化资料版本已变化，请刷新后重试");
        }
        if (item.isFeaturedOnHome() != Boolean.TRUE.equals(request.featuredOnHome())) {
            permissionPolicyService.requireAction(item, actorId, CulturePermissionPolicyService.FEATURE);
        }
        ensureNoPendingRevision(item.getId());
        RevisionEntity revision = createRevision(
                item,
                CHANGE_UPDATE,
                safeSnapshot(item),
                safeUpdateSnapshot(request),
                summary("提交正式文化资料变更", item, null),
                actorId
        );
        savePayload(revision.getId(), request);
        ReviewTaskEntity task = createReviewTask(item, revision);
        record(item, actorId, "culture_item_change_submit", "提交正式文化资料变更", revision.getDiffSummary(), requestId, clientIp);
        return command(item, "pending_review", task.getId(), "正式文化资料变更已提交审核");
    }

    @Transactional
    public CultureCommandResponse submitOfficialDelete(
            CultureItemEntity item,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        permissionPolicyService.requireAction(item, actorId, CulturePermissionPolicyService.DELETE);
        if (!STATUS_OFFICIAL.equals(normalize(item.getDataStatus()))) {
            throw new BusinessException("CULTURE_REVIEW_STATUS_INVALID", "只有正式文化资料需要创建删除审核");
        }
        ensureNoPendingRevision(item.getId());
        RevisionEntity revision = createRevision(
                item,
                CHANGE_DELETE,
                safeSnapshot(item),
                Map.of("deleted", true),
                summary("提交正式文化资料删除", item, null),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(item, revision);
        record(item, actorId, "culture_item_delete_submit", "提交正式文化资料删除", revision.getDiffSummary(), requestId, clientIp);
        return command(item, "pending_review", task.getId(), "正式文化资料删除已提交审核");
    }

    @Transactional
    public CultureCommandResponse archive(
            Long cultureItemId,
            CultureArchiveRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureItemEntity item = requireItem(cultureItemId, actorId);
        permissionPolicyService.requireAction(item, actorId, CulturePermissionPolicyService.ARCHIVE);
        String status = normalize(item.getDataStatus());
        if (STATUS_ARCHIVED.equals(status)) {
            throw new BusinessException("CULTURE_ITEM_ALREADY_ARCHIVED", "文化资料已归档");
        }
        if (STATUS_PENDING_REVIEW.equals(status)) {
            throw new BusinessException("CULTURE_ITEM_PENDING_REVIEW", "文化资料正在审核中，不能归档");
        }
        String reason = request.reason().trim();
        if (!STATUS_OFFICIAL.equals(status)) {
            item.setDataStatus(STATUS_ARCHIVED);
            CultureItemEntity saved = cultureItemRepository.save(item);
            record(saved, actorId, "culture_item_archive", "归档文化资料", "reason=" + reason, requestId, clientIp);
            return command(saved, STATUS_ARCHIVED, null, "文化资料已归档");
        }

        ensureNoPendingRevision(item.getId());
        RevisionEntity revision = createRevision(
                item,
                CHANGE_ARCHIVE,
                safeSnapshot(item),
                Map.of("dataStatus", STATUS_ARCHIVED, "reason", reason),
                summary("提交正式文化资料归档", item, reason),
                actorId
        );
        ReviewTaskEntity task = createReviewTask(item, revision);
        record(item, actorId, "culture_item_archive_submit", "提交正式文化资料归档", revision.getDiffSummary(), requestId, clientIp);
        return command(item, "pending_review", task.getId(), "正式文化资料归档已提交审核");
    }

    @Transactional(readOnly = true)
    public boolean hasPendingRevision(Long cultureItemId) {
        return revisionRepository.existsByTargetTypeAndTargetIdAndStatus(TARGET_TYPE, cultureItemId, STATUS_PENDING);
    }

    private CultureItemEntity requireItem(Long itemId, Long actorId) {
        CultureItemEntity item = cultureItemRepository.findByIdAndDeletedAtIsNull(itemId)
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
        permissionPolicyService.requireVisible(item, actorId);
        return item;
    }

    private void ensureNoPendingRevision(Long itemId) {
        if (hasPendingRevision(itemId)) {
            throw new BusinessException("CULTURE_REVISION_PENDING", "文化资料已有待审核变更，不能重复提交");
        }
    }

    private RevisionEntity createRevision(
            CultureItemEntity item,
            String changeType,
            Map<String, Object> before,
            Map<String, Object> after,
            String diffSummary,
            Long actorId
    ) {
        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(item.getClanId());
        revision.setTargetType(TARGET_TYPE);
        revision.setTargetId(item.getId());
        revision.setChangeType(changeType);
        revision.setBeforeData(toJson(before));
        revision.setAfterData(toJson(after));
        revision.setDiffSummary(diffSummary);
        revision.setSubmitterId(actorId);
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus(STATUS_PENDING);
        return revisionRepository.save(revision);
    }

    private ReviewTaskEntity createReviewTask(CultureItemEntity item, RevisionEntity revision) {
        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setClanId(item.getClanId());
        task.setRevisionId(revision.getId());
        task.setReviewLevel(1);
        task.setReviewerRole("reviewer");
        task.setBranchId(item.getBranchId());
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(LocalDateTime.now());
        return reviewTaskRepository.save(task);
    }

    private void savePayload(Long revisionId, CultureItemUpdateRequest request) {
        CultureRevisionPayloadEntity payload = new CultureRevisionPayloadEntity();
        payload.setRevisionId(revisionId);
        payload.setPayloadJson(toJson(request));
        payloadRepository.save(payload);
    }

    private Map<String, Object> safeSnapshot(CultureItemEntity item) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("branchId", item.getBranchId());
        data.put("category", item.getCategory());
        data.put("title", item.getTitle());
        data.put("summary", item.getSummary());
        data.put("contentLength", item.getContent() == null ? 0 : item.getContent().length());
        data.put("historicalPeriod", item.getHistoricalPeriod());
        data.put("locationText", item.getLocationText());
        data.put("confidenceLevel", item.getConfidenceLevel());
        data.put("privacyLevel", item.getPrivacyLevel());
        data.put("sensitiveLevel", item.getSensitiveLevel());
        data.put("dataStatus", item.getDataStatus());
        data.put("featuredOnHome", item.isFeaturedOnHome());
        data.put("sortOrder", item.getSortOrder());
        data.put("version", item.getVersion());
        return data;
    }

    private Map<String, Object> safeUpdateSnapshot(CultureItemUpdateRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("branchId", request.branchId());
        data.put("category", request.category());
        data.put("title", request.title());
        data.put("summary", request.summary());
        data.put("contentLength", request.content() == null ? 0 : request.content().length());
        data.put("historicalPeriod", request.historicalPeriod());
        data.put("locationText", request.locationText());
        data.put("confidenceLevel", request.confidenceLevel());
        data.put("privacyLevel", request.privacyLevel());
        data.put("sensitiveLevel", request.sensitiveLevel());
        data.put("featuredOnHome", request.featuredOnHome());
        data.put("sortOrder", request.sortOrder());
        data.put("expectedVersion", request.version());
        return data;
    }

    private void record(
            CultureItemEntity item,
            Long actorId,
            String action,
            String summary,
            String detail,
            String requestId,
            String clientIp
    ) {
        operationLogApplicationService.record(
                item.getClanId(), actorId, action, TARGET_TYPE, item.getId(), summary, detail, requestId, clientIp
        );
    }

    private CultureCommandResponse command(CultureItemEntity item, String status, Long reviewTaskId, String message) {
        return new CultureCommandResponse(TARGET_TYPE, item.getId(), status, reviewTaskId, message);
    }

    private String summary(String action, CultureItemEntity item, String reason) {
        String value = action + "：" + item.getTitle() + " [" + item.getCategory() + "]";
        return reason == null || reason.isBlank() ? value : value + "，说明：" + reason.trim();
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("CULTURE_REVISION_SERIALIZE_FAILED", "文化资料审核数据序列化失败");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
