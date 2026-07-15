package com.genealogy.culture.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationTraceContext;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.application.SourceBindingReviewApplicationService;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingRevisionDeleteRequest;
import com.genealogy.source.dto.SourceBindingRevisionResponse;
import com.genealogy.source.dto.SourceBindingRevisionSubmitRequest;
import com.genealogy.source.dto.SourceBindingReviewDecisionRequest;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Primary
@Service
public class CultureAwareSourceBindingReviewApplicationService extends SourceBindingReviewApplicationService {

    private static final String TARGET_SOURCE_BINDING = "source_binding";
    private static final String STATUS_PENDING = "pending";
    private static final String BINDING_ARCHIVED = "archived";

    private final SourceRepository governedSourceRepository;
    private final SourceBindingRepository governedBindingRepository;
    private final RevisionRepository governedRevisionRepository;
    private final ReviewTaskRepository governedReviewTaskRepository;
    private final ClanRepository governedClanRepository;
    private final OperationLogApplicationService governedOperationLog;
    private final CultureItemRepository cultureItemRepository;
    private final CulturePermissionPolicyService culturePermissionPolicy;
    private final MigrationEventRepository migrationEventRepository;
    private final MigrationEventPermissionPolicyService migrationPermissionPolicy;
    private final ObjectMapper governedObjectMapper;

    public CultureAwareSourceBindingReviewApplicationService(
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            ClanRepository clanRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            ObjectMapper objectMapper,
            CultureItemRepository cultureItemRepository,
            CulturePermissionPolicyService culturePermissionPolicy,
            MigrationEventRepository migrationEventRepository,
            MigrationEventPermissionPolicyService migrationPermissionPolicy
    ) {
        super(
                sourceRepository,
                sourceBindingRepository,
                revisionRepository,
                reviewTaskRepository,
                clanRepository,
                operationLogApplicationService,
                authorizationApplicationService,
                objectMapper
        );
        this.governedSourceRepository = sourceRepository;
        this.governedBindingRepository = sourceBindingRepository;
        this.governedRevisionRepository = revisionRepository;
        this.governedReviewTaskRepository = reviewTaskRepository;
        this.governedClanRepository = clanRepository;
        this.governedOperationLog = operationLogApplicationService;
        this.cultureItemRepository = cultureItemRepository;
        this.culturePermissionPolicy = culturePermissionPolicy;
        this.migrationEventRepository = migrationEventRepository;
        this.migrationPermissionPolicy = migrationPermissionPolicy;
        this.governedObjectMapper = objectMapper;
    }

    @Override
    @Transactional
    public SourceBindingRevisionResponse submitCreate(
            Long clanId,
            SourceBindingRevisionSubmitRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        if (!isCulture(request.binding().targetType())) {
            return super.submitCreate(clanId, request, actorId, requestId, clientIp);
        }
        if (!governedClanRepository.existsById(clanId)) {
            throw new BusinessException("CLAN_NOT_FOUND", "宗族不存在");
        }
        CultureTarget target = requireCultureTarget(
                clanId, request.binding().targetType(), request.binding().targetId(),
                actorId, CulturePermissionPolicyService.UPDATE
        );
        SourceEntity source = requireOfficialSource(clanId, request.binding().sourceId());
        ensureNoActiveBinding(request.binding());
        ensureNoPendingRevision(request.binding().sourceId());
        RevisionEntity revision = createRevision(
                clanId,
                request.binding().sourceId(),
                "create",
                null,
                snapshot(request.binding(), source.getConfidenceLevel()),
                "新增文化对象来源绑定：source=" + source.getId() + " -> " + target.targetType() + ":" + target.targetId() + reason(request.changeReason()),
                actorId
        );
        ReviewTaskEntity task = createTask(revision, target.branchId());
        governedOperationLog.record(
                clanId, actorId, "culture_source_binding_submit", "revision", revision.getId(),
                "提交文化对象来源绑定审核", revision.getDiffSummary(), requestId, clientIp,
                trace(revision, task, "submitted")
        );
        return response(revision, task);
    }

    @Override
    @Transactional
    public SourceBindingRevisionResponse submitReplace(
            Long bindingId,
            SourceBindingRevisionSubmitRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        SourceBindingEntity before = governedBindingRepository.findById(bindingId).orElse(null);
        boolean cultureChange = isCulture(request.binding().targetType())
                || before != null && isCulture(before.getTargetType());
        if (!cultureChange) {
            return super.submitReplace(bindingId, request, actorId, requestId, clientIp);
        }
        if (before == null || BINDING_ARCHIVED.equals(normalize(before.getBindingStatus()))) {
            throw new BusinessException("SOURCE_BINDING_NOT_FOUND", "来源绑定不存在或已归档");
        }
        CultureTarget target = requireCultureTarget(
                before.getClanId(), request.binding().targetType(), request.binding().targetId(),
                actorId, CulturePermissionPolicyService.UPDATE
        );
        SourceEntity source = requireOfficialSource(before.getClanId(), request.binding().sourceId());
        if (!Objects.equals(before.getSourceId(), request.binding().sourceId())
                || !Objects.equals(normalize(before.getTargetType()), normalize(request.binding().targetType()))
                || !Objects.equals(before.getTargetId(), request.binding().targetId())) {
            ensureNoActiveBinding(request.binding());
        }
        ensureNoPendingRevision(bindingId);
        RevisionEntity revision = createRevision(
                before.getClanId(),
                bindingId,
                "replace",
                snapshot(before),
                snapshot(request.binding(), source.getConfidenceLevel()),
                "变更文化对象来源绑定：binding=" + bindingId + " -> " + target.targetType() + ":" + target.targetId() + reason(request.changeReason()),
                actorId
        );
        ReviewTaskEntity task = createTask(revision, target.branchId());
        governedOperationLog.record(
                before.getClanId(), actorId, "culture_source_binding_submit", "revision", revision.getId(),
                "提交文化对象来源绑定变更", revision.getDiffSummary(), requestId, clientIp,
                trace(revision, task, "submitted")
        );
        return response(revision, task);
    }

    @Override
    @Transactional
    public SourceBindingRevisionResponse submitDelete(
            Long bindingId,
            SourceBindingRevisionDeleteRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        SourceBindingEntity binding = governedBindingRepository.findById(bindingId).orElse(null);
        if (binding != null && isCulture(binding.getTargetType())) {
            requireCultureTarget(
                    binding.getClanId(), binding.getTargetType(), binding.getTargetId(),
                    actorId, CulturePermissionPolicyService.UPDATE
            );
        }
        return super.submitDelete(bindingId, request, actorId, requestId, clientIp);
    }

    @Override
    @Transactional
    public SourceBindingRevisionResponse approve(
            Long revisionId,
            SourceBindingReviewDecisionRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureTarget target = cultureTargetFromRevision(revisionId);
        if (target != null) {
            requireCultureTarget(
                    target.clanId(), target.targetType(), target.targetId(),
                    actorId, CulturePermissionPolicyService.REVIEW
            );
        }
        return super.approve(revisionId, request, actorId, requestId, clientIp);
    }

    @Override
    @Transactional
    public SourceBindingRevisionResponse reject(
            Long revisionId,
            SourceBindingReviewDecisionRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureTarget target = cultureTargetFromRevision(revisionId);
        if (target != null) {
            requireCultureTarget(
                    target.clanId(), target.targetType(), target.targetId(),
                    actorId, CulturePermissionPolicyService.REVIEW
            );
            if (request.reviewComment() == null || request.reviewComment().isBlank()) {
                throw new BusinessException("CULTURE_REVIEW_REASON_REQUIRED", "驳回文化对象来源绑定必须填写原因");
            }
        }
        return super.reject(revisionId, request, actorId, requestId, clientIp);
    }

    private CultureTarget requireCultureTarget(
            Long clanId,
            String targetType,
            Long targetId,
            Long actorId,
            String action
    ) {
        String normalizedType = normalize(targetType);
        if (CultureItemGovernanceApplicationService.TARGET_TYPE.equals(normalizedType)) {
            CultureItemEntity item = cultureItemRepository.findByIdAndDeletedAtIsNull(targetId)
                    .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
            if (!Objects.equals(clanId, item.getClanId())) throw clanMismatch();
            culturePermissionPolicy.requireAction(item, actorId, action);
            if (BINDING_ARCHIVED.equals(normalize(item.getDataStatus()))) throw archivedTarget();
            return new CultureTarget(clanId, item.getBranchId(), normalizedType, targetId);
        }
        if (MigrationEventGovernanceApplicationService.TARGET_TYPE.equals(normalizedType)) {
            MigrationEventEntity event = migrationEventRepository.findByIdAndDeletedAtIsNull(targetId)
                    .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见"));
            if (!Objects.equals(clanId, event.getClanId())) throw clanMismatch();
            migrationPermissionPolicy.requireAction(event, actorId, action);
            if (BINDING_ARCHIVED.equals(normalize(event.getDataStatus()))) throw archivedTarget();
            return new CultureTarget(clanId, event.getBranchId(), normalizedType, targetId);
        }
        throw new BusinessException("SOURCE_TARGET_TYPE_UNSUPPORTED", "不支持的文化对象类型");
    }

    private SourceEntity requireOfficialSource(Long clanId, Long sourceId) {
        SourceEntity source = governedSourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "来源资料不存在"));
        if (!Objects.equals(clanId, source.getClanId())) {
            throw new BusinessException("SOURCE_CLAN_MISMATCH", "来源资料不属于当前宗族");
        }
        if (!"official".equals(normalize(source.getVerificationStatus()))) {
            throw new BusinessException("SOURCE_NOT_OFFICIAL", "来源资料审核通过后才能绑定文化对象");
        }
        return source;
    }

    private void ensureNoActiveBinding(SourceBindingCreateRequest request) {
        if (governedBindingRepository.existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(
                request.sourceId(), request.targetType(), request.targetId(), BINDING_ARCHIVED)) {
            throw new BusinessException("SOURCE_BINDING_DUPLICATED", "来源绑定已存在");
        }
    }

    private void ensureNoPendingRevision(Long targetId) {
        if (governedRevisionRepository.existsByTargetTypeAndTargetIdAndStatus(
                TARGET_SOURCE_BINDING, targetId, STATUS_PENDING)) {
            throw new BusinessException("SOURCE_BINDING_REVISION_PENDING", "来源绑定已有待审核变更");
        }
    }

    private RevisionEntity createRevision(
            Long clanId,
            Long targetId,
            String changeType,
            Map<String, Object> before,
            Map<String, Object> after,
            String summary,
            Long actorId
    ) {
        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(clanId);
        revision.setTargetType(TARGET_SOURCE_BINDING);
        revision.setTargetId(targetId);
        revision.setChangeType(changeType);
        revision.setBeforeData(toJson(before));
        revision.setAfterData(toJson(after));
        revision.setDiffSummary(summary);
        revision.setSubmitterId(actorId);
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus(STATUS_PENDING);
        return governedRevisionRepository.save(revision);
    }

    private ReviewTaskEntity createTask(RevisionEntity revision, Long branchId) {
        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setClanId(revision.getClanId());
        task.setRevisionId(revision.getId());
        task.setTraceId(revision.getTraceId());
        task.setReviewLevel(1);
        task.setReviewerRole("reviewer");
        task.setBranchId(branchId);
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(LocalDateTime.now());
        return governedReviewTaskRepository.save(task);
    }

    private Map<String, Object> snapshot(SourceBindingCreateRequest request, String fallbackConfidence) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("sourceId", request.sourceId());
        value.put("targetType", normalize(request.targetType()));
        value.put("targetId", request.targetId());
        value.put("bindingReason", request.bindingReason());
        value.put("excerpt", request.excerpt());
        value.put("confidenceLevel", request.confidenceLevel() == null ? fallbackConfidence : request.confidenceLevel());
        value.put("bindingStatus", "official");
        return value;
    }

    private Map<String, Object> snapshot(SourceBindingEntity binding) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", binding.getId());
        value.put("sourceId", binding.getSourceId());
        value.put("targetType", normalize(binding.getTargetType()));
        value.put("targetId", binding.getTargetId());
        value.put("bindingReason", binding.getBindingReason());
        value.put("excerpt", binding.getExcerpt());
        value.put("confidenceLevel", binding.getConfidenceLevel());
        value.put("bindingStatus", binding.getBindingStatus());
        return value;
    }

    private CultureTarget cultureTargetFromRevision(Long revisionId) {
        RevisionEntity revision = governedRevisionRepository.findByIdAndTargetType(revisionId, TARGET_SOURCE_BINDING).orElse(null);
        if (revision == null) return null;
        String json = revision.getAfterData() == null ? revision.getBeforeData() : revision.getAfterData();
        if (json == null || json.isBlank()) return null;
        try {
            JsonNode data = governedObjectMapper.readTree(json);
            String targetType = normalize(data.path("targetType").asText(null));
            if (!isCulture(targetType)) return null;
            return new CultureTarget(revision.getClanId(), null, targetType, data.path("targetId").longValue());
        } catch (JsonProcessingException exception) {
            throw new BusinessException("SOURCE_BINDING_REVISION_DATA_INVALID", "来源绑定变更数据无法解析");
        }
    }

    private SourceBindingRevisionResponse response(RevisionEntity revision, ReviewTaskEntity task) {
        return new SourceBindingRevisionResponse(
                revision.getId(), task.getId(), revision.getClanId(), revision.getTargetId(),
                revision.getChangeType(), revision.getStatus(), revision.getDiffSummary(),
                revision.getSubmitterId(), revision.getSubmitTime(), revision.getApprovedAt(), revision.getRejectedReason(), revision.getTraceId()
        );
    }

    private OperationTraceContext trace(RevisionEntity revision, ReviewTaskEntity task, String result) {
        String businessTargetType = revision.getTargetType();
        Long businessTargetId = revision.getTargetId();
        if ("create".equals(revision.getChangeType()) && revision.getAfterData() != null) {
            try {
                JsonNode data = governedObjectMapper.readTree(revision.getAfterData());
                businessTargetType = normalize(data.path("targetType").asText(null));
                businessTargetId = data.path("targetId").isIntegralNumber()
                        ? data.path("targetId").longValue()
                        : null;
            } catch (JsonProcessingException exception) {
                throw new BusinessException("SOURCE_BINDING_REVISION_DATA_INVALID", "来源绑定变更数据无法解析");
            }
        }
        return OperationTraceContext.of(
                revision.getTraceId(), revision.getId(), task == null ? null : task.getId(),
                businessTargetType, businessTargetId, result
        );
    }

    private String toJson(Map<String, Object> value) {
        if (value == null) return null;
        try {
            return governedObjectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("SOURCE_BINDING_REVISION_SERIALIZE_FAILED", "来源绑定变更序列化失败");
        }
    }

    private boolean isCulture(String targetType) {
        String normalizedType = normalize(targetType);
        return CultureItemGovernanceApplicationService.TARGET_TYPE.equals(normalizedType)
                || MigrationEventGovernanceApplicationService.TARGET_TYPE.equals(normalizedType);
    }

    private String reason(String value) {
        return value == null || value.isBlank() ? "" : "，原因：" + value.trim();
    }

    private BusinessException clanMismatch() {
        return new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "文化对象不属于当前宗族");
    }

    private BusinessException archivedTarget() {
        return new BusinessException("SOURCE_TARGET_ARCHIVED", "已归档文化对象不能变更来源绑定");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private record CultureTarget(Long clanId, Long branchId, String targetType, Long targetId) {
    }
}
