package com.genealogy.culture.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureSitePermissionPolicyService;
import com.genealogy.culture.dto.CultureArchiveRequest;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureSiteUpdateRequest;
import com.genealogy.culture.dto.CultureSubmitReviewRequest;
import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.repository.CultureRevisionPayloadRepository;
import com.genealogy.culture.repository.CultureSiteRepository;
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
public class CultureSiteGovernanceApplicationService {

    public static final String TARGET_TYPE = "culture_site";
    public static final String CHANGE_PUBLISH = "culture_site_publish";
    public static final String CHANGE_UPDATE = "culture_site_update";
    public static final String CHANGE_DELETE = "culture_site_delete";
    public static final String CHANGE_ARCHIVE = "culture_site_archive";

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_REJECTED = "rejected";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_ARCHIVED = "archived";
    private static final String BINDING_ARCHIVED = "archived";

    private final CultureSiteRepository siteRepository;
    private final CultureRevisionPayloadRepository payloadRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final CultureSitePermissionPolicyService permissionPolicyService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ObjectMapper objectMapper;

    public CultureSiteGovernanceApplicationService(
            CultureSiteRepository siteRepository,
            CultureRevisionPayloadRepository payloadRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            SourceBindingRepository sourceBindingRepository,
            CultureSitePermissionPolicyService permissionPolicyService,
            OperationLogApplicationService operationLogApplicationService,
            ObjectMapper objectMapper
    ) {
        this.siteRepository = siteRepository;
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
            Long siteId,
            CultureSubmitReviewRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureSiteEntity site = requireSite(siteId, actorId);
        permissionPolicyService.requireAction(site, actorId, CultureSitePermissionPolicyService.SUBMIT_REVIEW);
        String status = normalize(site.getDataStatus());
        if (!STATUS_DRAFT.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new BusinessException("CULTURE_SITE_REVIEW_STATUS_INVALID", "只有草稿或驳回文化场所可以提交审核");
        }
        ensureNoPendingRevision(siteId);
        if (sourceBindingRepository.findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                site.getClanId(), TARGET_TYPE, siteId, BINDING_ARCHIVED).isEmpty()) {
            throw new BusinessException("CULTURE_SITE_SOURCE_REQUIRED", "文化场所至少绑定一条来源后才能提交审核");
        }
        Map<String, Object> before = snapshot(site);
        site.setDataStatus(STATUS_PENDING_REVIEW);
        CultureSiteEntity saved = siteRepository.save(site);
        RevisionEntity revision = createRevision(
                saved, CHANGE_PUBLISH, before, snapshot(saved), summary("提交文化场所审核", saved, request == null ? null : request.comment()), actorId
        );
        ReviewTaskEntity task = createReviewTask(saved, revision);
        record(saved, actorId, "culture_site_review_submit", "提交文化场所审核", revision.getDiffSummary(), requestId, clientIp);
        return command(saved, STATUS_PENDING_REVIEW, task.getId(), "文化场所已提交审核");
    }

    @Transactional
    public CultureCommandResponse submitOfficialUpdate(
            CultureSiteEntity site,
            CultureSiteUpdateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        permissionPolicyService.requireAction(site, actorId, CultureSitePermissionPolicyService.UPDATE);
        if (!STATUS_OFFICIAL.equals(normalize(site.getDataStatus()))) {
            throw new BusinessException("CULTURE_SITE_REVIEW_STATUS_INVALID", "只有正式文化场所需要创建变更审核");
        }
        if (!Objects.equals(site.getVersion(), request.version())) {
            throw new BusinessException("CULTURE_SITE_VERSION_CONFLICT", "文化场所版本已变化，请刷新后重试");
        }
        ensureNoPendingRevision(site.getId());
        RevisionEntity revision = createRevision(
                site, CHANGE_UPDATE, snapshot(site), updateSnapshot(request), summary("提交正式文化场所变更", site, null), actorId
        );
        savePayload(revision.getId(), request);
        ReviewTaskEntity task = createReviewTask(site, revision);
        record(site, actorId, "culture_site_change_submit", "提交正式文化场所变更", revision.getDiffSummary(), requestId, clientIp);
        return command(site, STATUS_PENDING_REVIEW, task.getId(), "正式文化场所变更已提交审核");
    }

    @Transactional
    public CultureCommandResponse submitOfficialDelete(
            CultureSiteEntity site,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        permissionPolicyService.requireAction(site, actorId, CultureSitePermissionPolicyService.DELETE);
        if (!STATUS_OFFICIAL.equals(normalize(site.getDataStatus()))) {
            throw new BusinessException("CULTURE_SITE_REVIEW_STATUS_INVALID", "只有正式文化场所需要创建删除审核");
        }
        ensureNoPendingRevision(site.getId());
        RevisionEntity revision = createRevision(
                site, CHANGE_DELETE, snapshot(site), Map.of("deleted", true), summary("提交正式文化场所删除", site, null), actorId
        );
        ReviewTaskEntity task = createReviewTask(site, revision);
        record(site, actorId, "culture_site_delete_submit", "提交正式文化场所删除", revision.getDiffSummary(), requestId, clientIp);
        return command(site, STATUS_PENDING_REVIEW, task.getId(), "正式文化场所删除已提交审核");
    }

    @Transactional
    public CultureCommandResponse archive(
            Long siteId,
            CultureArchiveRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureSiteEntity site = requireSite(siteId, actorId);
        permissionPolicyService.requireAction(site, actorId, CultureSitePermissionPolicyService.ARCHIVE);
        String status = normalize(site.getDataStatus());
        if (STATUS_ARCHIVED.equals(status)) throw new BusinessException("CULTURE_SITE_ALREADY_ARCHIVED", "文化场所已归档");
        if (STATUS_PENDING_REVIEW.equals(status)) throw new BusinessException("CULTURE_SITE_PENDING_REVIEW", "文化场所正在审核中，不能归档");
        String reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.isBlank()) throw new BusinessException("CULTURE_SITE_ARCHIVE_REASON_REQUIRED", "归档文化场所必须填写原因");
        if (!STATUS_OFFICIAL.equals(status)) {
            site.setDataStatus(STATUS_ARCHIVED);
            CultureSiteEntity saved = siteRepository.save(site);
            record(saved, actorId, "culture_site_archive", "归档文化场所", "reason=" + reason, requestId, clientIp);
            return command(saved, STATUS_ARCHIVED, null, "文化场所已归档");
        }
        ensureNoPendingRevision(siteId);
        RevisionEntity revision = createRevision(
                site, CHANGE_ARCHIVE, snapshot(site), Map.of("dataStatus", STATUS_ARCHIVED, "reason", reason),
                summary("提交正式文化场所归档", site, reason), actorId
        );
        ReviewTaskEntity task = createReviewTask(site, revision);
        record(site, actorId, "culture_site_archive_submit", "提交正式文化场所归档", revision.getDiffSummary(), requestId, clientIp);
        return command(site, STATUS_PENDING_REVIEW, task.getId(), "正式文化场所归档已提交审核");
    }

    @Transactional(readOnly = true)
    public boolean hasPendingRevision(Long siteId) {
        return revisionRepository.existsByTargetTypeAndTargetIdAndStatus(TARGET_TYPE, siteId, STATUS_PENDING);
    }

    private CultureSiteEntity requireSite(Long siteId, Long actorId) {
        CultureSiteEntity site = siteRepository.findByIdAndDeletedAtIsNull(siteId)
                .orElseThrow(() -> new BusinessException("CULTURE_SITE_NOT_FOUND", "文化场所不存在或不可见"));
        permissionPolicyService.requireVisible(site, actorId);
        return site;
    }

    private void ensureNoPendingRevision(Long siteId) {
        if (hasPendingRevision(siteId)) {
            throw new BusinessException("CULTURE_SITE_REVISION_PENDING", "文化场所已有待审核变更，不能重复提交");
        }
    }

    private RevisionEntity createRevision(
            CultureSiteEntity site,
            String changeType,
            Map<String, Object> before,
            Map<String, Object> after,
            String diffSummary,
            Long actorId
    ) {
        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(site.getClanId());
        revision.setTargetType(TARGET_TYPE);
        revision.setTargetId(site.getId());
        revision.setChangeType(changeType);
        revision.setBeforeData(toJson(before));
        revision.setAfterData(toJson(after));
        revision.setDiffSummary(diffSummary);
        revision.setSubmitterId(actorId);
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus(STATUS_PENDING);
        return revisionRepository.save(revision);
    }

    private ReviewTaskEntity createReviewTask(CultureSiteEntity site, RevisionEntity revision) {
        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setClanId(site.getClanId());
        task.setRevisionId(revision.getId());
        task.setTraceId(revision.getTraceId());
        task.setReviewLevel(1);
        task.setReviewerRole("reviewer");
        task.setBranchId(site.getBranchId());
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(LocalDateTime.now());
        return reviewTaskRepository.save(task);
    }

    private void savePayload(Long revisionId, CultureSiteUpdateRequest request) {
        CultureRevisionPayloadEntity payload = new CultureRevisionPayloadEntity();
        payload.setRevisionId(revisionId);
        payload.setPayloadJson(toJson(request));
        payloadRepository.save(payload);
    }

    private Map<String, Object> snapshot(CultureSiteEntity site) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("branchId", site.getBranchId());
        data.put("relatedPersonId", site.getRelatedPersonId());
        data.put("siteType", site.getSiteType());
        data.put("siteName", safeName(site));
        data.put("hasAddress", site.getAddressText() != null && !site.getAddressText().isBlank());
        data.put("hasCoordinates", site.getLatitude() != null && site.getLongitude() != null);
        data.put("foundedPeriod", site.getFoundedPeriod());
        data.put("currentStatus", site.getCurrentStatus());
        data.put("summaryLength", length(site.getSummary()));
        data.put("descriptionLength", length(site.getDescription()));
        data.put("confidenceLevel", site.getConfidenceLevel());
        data.put("privacyLevel", site.getPrivacyLevel());
        data.put("sensitiveLevel", site.getSensitiveLevel());
        data.put("dataStatus", site.getDataStatus());
        data.put("featuredOnHome", site.isFeaturedOnHome());
        data.put("sortOrder", site.getSortOrder());
        data.put("version", site.getVersion());
        return data;
    }

    private Map<String, Object> updateSnapshot(CultureSiteUpdateRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("branchId", request.branchId());
        data.put("relatedPersonId", request.relatedPersonId());
        data.put("siteType", request.siteType());
        data.put("siteNameLength", length(request.siteName()));
        data.put("hasAddress", request.addressText() != null && !request.addressText().isBlank());
        data.put("hasCoordinates", request.latitude() != null && request.longitude() != null);
        data.put("foundedPeriod", request.foundedPeriod());
        data.put("currentStatus", request.currentStatus());
        data.put("summaryLength", length(request.summary()));
        data.put("descriptionLength", length(request.description()));
        data.put("confidenceLevel", request.confidenceLevel());
        data.put("privacyLevel", request.privacyLevel());
        data.put("sensitiveLevel", request.sensitiveLevel());
        data.put("featuredOnHome", request.featuredOnHome());
        data.put("sortOrder", request.sortOrder());
        data.put("expectedVersion", request.version());
        return data;
    }

    private String summary(String action, CultureSiteEntity site, String note) {
        String base = action + "：" + safeName(site) + "（" + site.getSiteType() + "）";
        return note == null || note.isBlank() ? base : base + "；" + note.trim();
    }

    private String safeName(CultureSiteEntity site) {
        String privacy = normalize(site.getPrivacyLevel());
        String sensitive = normalize(site.getSensitiveLevel());
        return "sealed".equals(privacy) || "highly_sensitive".equals(sensitive) ? "封存文化场所" : site.getSiteName();
    }

    private int length(String value) {
        return value == null ? 0 : value.length();
    }

    private CultureCommandResponse command(CultureSiteEntity site, String status, Long reviewTaskId, String message) {
        return new CultureCommandResponse(TARGET_TYPE, site.getId(), status, reviewTaskId, message);
    }

    private void record(CultureSiteEntity site, Long actorId, String action, String summary, String detail, String requestId, String clientIp) {
        operationLogApplicationService.record(site.getClanId(), actorId, action, TARGET_TYPE, site.getId(), summary, detail, requestId, clientIp);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("CULTURE_SITE_REVISION_SERIALIZE_FAILED", "文化场所审核数据无法序列化");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
