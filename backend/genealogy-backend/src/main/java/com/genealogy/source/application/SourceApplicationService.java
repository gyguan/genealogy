package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.source.dto.SourceAttachmentSummaryResponse;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceBindingSummaryResponse;
import com.genealogy.source.dto.SourceCreateRequest;
import com.genealogy.source.dto.SourceDetailResponse;
import com.genealogy.source.dto.SourcePermissionView;
import com.genealogy.source.dto.SourceResponse;
import com.genealogy.source.dto.SourceSearchCriteria;
import com.genealogy.source.entity.SourceAttachmentEntity;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
public class SourceApplicationService {

    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_REJECTED = "rejected";
    private static final String STATUS_ARCHIVED = "archived";
    private static final String CONFIDENCE_UNKNOWN = "unknown";
    private static final String PRIVACY_CLAN_ONLY = "clan_only";
    private static final String SENSITIVE_NORMAL = "normal";
    private static final String SOURCE_VIEW = "source:view";
    private static final String SOURCE_CREATE = "source:create";
    private static final String SOURCE_UPDATE = "source:update";
    private static final String SOURCE_DELETE = "source:delete";
    private static final String SOURCE_BIND = "source:bind";
    private static final String SOURCE_SUBMIT_REVIEW = "source:submit_review";
    private static final String ATTACHMENT_UPLOAD = "attachment:upload";
    private static final String ATTACHMENT_VIEW = "attachment:view";
    private static final String ATTACHMENT_PREVIEW = "attachment:preview";
    private static final String ATTACHMENT_DOWNLOAD = "attachment:download";
    private static final Set<String> SOURCE_STATUSES = Set.of(STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_OFFICIAL, STATUS_REJECTED, STATUS_ARCHIVED);
    private static final Set<String> SOURCE_TYPES = Set.of("genealogy_book", "local_chronicle", "tombstone", "photo", "oral_history", "archive", "other");
    private static final Set<String> TARGET_TYPES = Set.of("person", "relationship", "branch", "clan", "generation_word");
    private static final Set<String> CONFIDENCE_LEVELS = Set.of("high", "medium", "low", CONFIDENCE_UNKNOWN);
    private static final Set<String> PRIVACY_LEVELS = Set.of("public", PRIVACY_CLAN_ONLY, "branch_only", "relatives_only", "private", "sealed");
    private static final Set<String> SENSITIVE_LEVELS = Set.of(SENSITIVE_NORMAL, "sensitive", "highly_sensitive");
    private static final Set<String> SORT_FIELDS = Set.of("id", "sourceName", "sourceType", "verificationStatus", "privacyLevel", "createdAt", "updatedAt");

    private final SourceRepository sourceRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final SourceAttachmentRepository sourceAttachmentRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final BranchRepository branchRepository;
    private final GenerationWordRepository generationWordRepository;
    private final GenerationSchemeRepository generationSchemeRepository;
    private final ClanRepository clanRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public SourceApplicationService(
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            SourceAttachmentRepository sourceAttachmentRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            BranchRepository branchRepository,
            GenerationWordRepository generationWordRepository,
            GenerationSchemeRepository generationSchemeRepository,
            ClanRepository clanRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.sourceRepository = sourceRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.sourceAttachmentRepository = sourceAttachmentRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.branchRepository = branchRepository;
        this.generationWordRepository = generationWordRepository;
        this.generationSchemeRepository = generationSchemeRepository;
        this.clanRepository = clanRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public SourceResponse create(Long clanId, SourceCreateRequest request) {
        return create(clanId, request, null);
    }

    @Transactional
    public SourceResponse create(Long clanId, SourceCreateRequest request, Long actorId) {
        return create(clanId, request, actorId, null, null);
    }

    @Transactional
    public SourceResponse create(Long clanId, SourceCreateRequest request, Long actorId, String requestId, String clientIp) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_CREATE);
        SourceEntity entity = new SourceEntity();
        entity.setClanId(clanId);
        applyRequest(entity, request);
        LocalDateTime now = LocalDateTime.now();
        entity.setVerificationStatus(STATUS_DRAFT);
        entity.setCreatedBy(actorId);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        SourceEntity saved = sourceRepository.save(entity);
        operationLogApplicationService.record(clanId, actorId, "source_create", "source", saved.getId(), "create source: " + saved.getSourceName(), null, requestId, clientIp);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SourceResponse get(Long id) {
        return toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public SourceResponse get(Long id, Long actorId) {
        SourceEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, SOURCE_VIEW);
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public SourceDetailResponse getDetail(Long id, Long actorId) {
        SourceEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, SOURCE_VIEW);
        return toDetailResponse(entity, actorId);
    }

    @Transactional(readOnly = true)
    public PageResponse<SourceResponse> listByClan(Long clanId, int pageNo, int pageSize) {
        return searchByClan(clanId, new SourceSearchCriteria(null, null, null, null, null, null, null, null), pageNo, pageSize, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<SourceResponse> listByClan(Long clanId, int pageNo, int pageSize, Long actorId) {
        return searchByClan(clanId, new SourceSearchCriteria(null, null, null, null, null, null, null, null), pageNo, pageSize, actorId);
    }

    @Transactional(readOnly = true)
    public PageResponse<SourceResponse> searchByClan(Long clanId, SourceSearchCriteria criteria, int pageNo, int pageSize, Long actorId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        if (actorId != null) {
            authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_VIEW);
        }
        SourceSearchCriteria normalizedCriteria = normalizeSearchCriteria(criteria);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, resolveSort(normalizedCriteria.sort()));
        Page<SourceResponse> page = sourceRepository.findAll(buildSourceSearchSpec(clanId, normalizedCriteria), pageRequest).map(this::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional
    public SourceResponse update(Long id, SourceCreateRequest request, Long actorId) {
        SourceEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, SOURCE_UPDATE);
        ensureMutableSource(entity);
        String before = sourceSnapshot(entity);
        applyRequest(entity, request);
        entity.setUpdatedAt(LocalDateTime.now());
        SourceEntity saved = sourceRepository.save(entity);
        operationLogApplicationService.record(saved.getClanId(), actorId, "source_update", "source", saved.getId(), "update source: " + saved.getSourceName(), "before=" + before + "; after=" + sourceSnapshot(saved));
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        SourceEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, SOURCE_DELETE);
        ensureMutableSource(entity);
        if (!sourceBindingRepository.findBySourceIdOrderByCreatedAtDesc(id).isEmpty()) {
            throw new BusinessException("SOURCE_HAS_BINDINGS", "资料来源已绑定业务对象，不能直接删除");
        }
        sourceRepository.delete(entity);
        operationLogApplicationService.record(entity.getClanId(), actorId, "source_delete", "source", entity.getId(), "delete source: " + entity.getSourceName(), null);
    }

    @Transactional
    public SourceBindingResponse bind(Long clanId, SourceBindingCreateRequest request, Long actorId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        SourceEntity source = getEntity(request.sourceId());
        if (!source.getClanId().equals(clanId)) {
            throw new BusinessException("SOURCE_CLAN_MISMATCH", "source is not in clan");
        }
        if (!STATUS_OFFICIAL.equals(source.getVerificationStatus())) {
            throw new BusinessException("SOURCE_NOT_OFFICIAL", "资料来源审核通过后才能绑定业务对象");
        }
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_BIND);
        if (sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetId(request.sourceId(), request.targetType(), request.targetId())) {
            throw new BusinessException("SOURCE_BINDING_DUPLICATED", "source binding already exists");
        }
        SourceBindingEntity entity = new SourceBindingEntity();
        entity.setClanId(clanId);
        entity.setSourceId(request.sourceId());
        entity.setTargetType(request.targetType());
        entity.setTargetId(request.targetId());
        entity.setBindingReason(request.bindingReason());
        entity.setExcerpt(request.excerpt());
        entity.setConfidenceLevel(normalizeConfidenceLevel(request.confidenceLevel(), source.getConfidenceLevel()));
        entity.setBindingStatus(STATUS_OFFICIAL);
        entity.setCreatedBy(actorId);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        SourceBindingEntity saved = sourceBindingRepository.save(entity);
        operationLogApplicationService.record(clanId, actorId, "source_bind", "source_binding", saved.getId(), "bind source " + request.sourceId() + " to " + request.targetType() + ":" + request.targetId(), request.bindingReason());
        return toBindingResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listBindingsBySource(Long sourceId, Long actorId) {
        SourceEntity source = getEntity(sourceId);
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, SOURCE_VIEW);
        return sourceBindingRepository.findBySourceIdOrderByCreatedAtDesc(sourceId).stream().map(this::toBindingResponse).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<SourceBindingSummaryResponse> listBindingSummariesBySource(Long sourceId, String targetType, int pageNo, int pageSize, Long actorId) {
        SourceEntity source = getEntity(sourceId);
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, SOURCE_VIEW);
        String normalizedTargetType = normalizeOptionalTargetType(targetType);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SourceBindingSummaryResponse> page = (normalizedTargetType == null
                ? sourceBindingRepository.findBySourceIdOrderByCreatedAtDesc(sourceId, pageRequest)
                : sourceBindingRepository.findBySourceIdAndTargetTypeOrderByCreatedAtDesc(sourceId, normalizedTargetType, pageRequest)
        ).map(this::toBindingSummaryResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listBindingsByTarget(String targetType, Long targetId, Long clanId, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_VIEW);
        return sourceBindingRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId).stream()
                .filter(binding -> clanId.equals(binding.getClanId()))
                .map(this::toBindingResponse)
                .toList();
    }

    private Specification<SourceEntity> buildSourceSearchSpec(Long clanId, SourceSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("clanId"), clanId));

            if (criteria.keyword() != null) {
                String pattern = "%" + criteria.keyword().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        likeIgnoreCase(cb, root, "sourceName", pattern),
                        likeIgnoreCase(cb, root, "providerName", pattern),
                        likeIgnoreCase(cb, root, "bookTitle", pattern),
                        likeIgnoreCase(cb, root, "volumeNo", pattern),
                        likeIgnoreCase(cb, root, "pageNo", pattern),
                        likeIgnoreCase(cb, root, "excerpt", pattern),
                        likeIgnoreCase(cb, root, "description", pattern)
                ));
            }
            if (criteria.sourceType() != null) {
                predicates.add(cb.equal(root.get("sourceType"), criteria.sourceType()));
            }
            if (criteria.verificationStatus() != null) {
                predicates.add(cb.equal(root.get("verificationStatus"), criteria.verificationStatus()));
            }
            if (criteria.privacyLevel() != null) {
                predicates.add(cb.equal(root.get("privacyLevel"), criteria.privacyLevel()));
            }
            if (criteria.targetType() != null) {
                predicates.add(cb.exists(sourceBindingExists(root, query, cb, criteria.targetType())));
            }
            if (criteria.hasAttachment() != null) {
                Predicate exists = cb.exists(sourceAttachmentExists(root, query, cb));
                predicates.add(criteria.hasAttachment() ? exists : cb.not(exists));
            }
            if (criteria.hasBinding() != null) {
                Predicate exists = cb.exists(sourceBindingExists(root, query, cb, null));
                predicates.add(criteria.hasBinding() ? exists : cb.not(exists));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Predicate likeIgnoreCase(CriteriaBuilder cb, Root<SourceEntity> root, String field, String pattern) {
        return cb.like(cb.lower(root.get(field)), pattern);
    }

    private Subquery<Long> sourceBindingExists(Root<SourceEntity> root, CriteriaQuery<?> query, CriteriaBuilder cb, String targetType) {
        Subquery<Long> subquery = query.subquery(Long.class);
        Root<SourceBindingEntity> binding = subquery.from(SourceBindingEntity.class);
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(binding.get("sourceId"), root.get("id")));
        if (targetType != null) {
            predicates.add(cb.equal(binding.get("targetType"), targetType));
        }
        subquery.select(binding.get("id")).where(predicates.toArray(Predicate[]::new));
        return subquery;
    }

    private Subquery<Long> sourceAttachmentExists(Root<SourceEntity> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
        Subquery<Long> subquery = query.subquery(Long.class);
        Root<SourceAttachmentEntity> attachment = subquery.from(SourceAttachmentEntity.class);
        subquery.select(attachment.get("id")).where(
                cb.equal(attachment.get("sourceId"), root.get("id")),
                cb.isNull(attachment.get("deletedAt"))
        );
        return subquery;
    }

    private SourceEntity getEntity(Long id) {
        SourceEntity entity = sourceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "source not found"));
        normalizePersistedSource(entity);
        return entity;
    }

    private void ensureMutableSource(SourceEntity entity) {
        if (!isDirectlyMutableSource(entity)) {
            if (STATUS_PENDING_REVIEW.equals(entity.getVerificationStatus())) {
                throw new BusinessException("SOURCE_PENDING_REVIEW", "来源正在审核中，不能直接修改");
            }
            throw new BusinessException("SOURCE_OFFICIAL_REVIEW_REQUIRED", "正式来源变更需先提交变更审核");
        }
    }

    private boolean isDirectlyMutableSource(SourceEntity entity) {
        return STATUS_DRAFT.equals(entity.getVerificationStatus()) || STATUS_REJECTED.equals(entity.getVerificationStatus());
    }

    private void applyRequest(SourceEntity entity, SourceCreateRequest request) {
        entity.setSourceName(request.sourceName());
        entity.setSourceType(normalizeSourceType(request.sourceType()));
        entity.setProviderName(request.providerName());
        entity.setBookTitle(request.bookTitle());
        entity.setVolumeNo(request.volumeNo());
        entity.setPageNo(request.pageNo());
        entity.setSourceDate(request.sourceDate());
        entity.setExcerpt(request.excerpt());
        entity.setDescription(request.description());
        entity.setConfidenceLevel(normalizeConfidenceLevel(request.confidenceLevel(), CONFIDENCE_UNKNOWN));
        entity.setPrivacyLevel(normalizePrivacyLevel(request.privacyLevel()));
        entity.setSensitiveLevel(normalizeSensitiveLevel(request.sensitiveLevel()));
        if (entity.getVerificationStatus() == null || entity.getVerificationStatus().isBlank()) {
            entity.setVerificationStatus(STATUS_DRAFT);
        } else {
            entity.setVerificationStatus(normalizeSourceStatus(entity.getVerificationStatus()));
        }
    }

    private void normalizePersistedSource(SourceEntity entity) {
        entity.setSourceType(normalizeSourceType(entity.getSourceType()));
        entity.setVerificationStatus(normalizeSourceStatus(entity.getVerificationStatus()));
        entity.setConfidenceLevel(normalizeConfidenceLevel(entity.getConfidenceLevel(), CONFIDENCE_UNKNOWN));
        entity.setPrivacyLevel(normalizePrivacyLevel(entity.getPrivacyLevel()));
        entity.setSensitiveLevel(normalizeSensitiveLevel(entity.getSensitiveLevel()));
        if (entity.getUpdatedAt() == null) {
            entity.setUpdatedAt(entity.getCreatedAt());
        }
    }

    private SourceSearchCriteria normalizeSearchCriteria(SourceSearchCriteria criteria) {
        SourceSearchCriteria safeCriteria = criteria == null ? new SourceSearchCriteria(null, null, null, null, null, null, null, null) : criteria;
        return new SourceSearchCriteria(
                normalizeOptional(safeCriteria.keyword()),
                normalizeOptionalSourceType(safeCriteria.sourceType()),
                normalizeOptionalSourceStatus(safeCriteria.verificationStatus()),
                normalizeOptionalPrivacyLevel(safeCriteria.privacyLevel()),
                normalizeOptionalTargetType(safeCriteria.targetType()),
                safeCriteria.hasAttachment(),
                safeCriteria.hasBinding(),
                normalizeOptional(safeCriteria.sort())
        );
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeOptionalSourceType(String value) {
        String normalized = normalizeOptional(value);
        return normalized == null ? null : normalizeSourceType(normalized);
    }

    private String normalizeSourceType(String value) {
        String normalized = normalizeEnum(value, "other");
        if ("oral_record".equals(normalized)) {
            return "oral_history";
        }
        if (!SOURCE_TYPES.contains(normalized)) {
            throw new BusinessException("SOURCE_TYPE_INVALID", "来源类型不合法");
        }
        return normalized;
    }

    private String normalizeOptionalSourceStatus(String value) {
        String normalized = normalizeOptional(value);
        return normalized == null ? null : normalizeSourceStatus(normalized);
    }

    private String normalizeSourceStatus(String status) {
        if (status == null || status.isBlank()) {
            return STATUS_DRAFT;
        }
        String normalized = status.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "unverified" -> STATUS_DRAFT;
            case "verified", "reviewed", "approved" -> STATUS_OFFICIAL;
            default -> {
                if (!SOURCE_STATUSES.contains(normalized)) {
                    throw new BusinessException("SOURCE_STATUS_INVALID", "来源状态不合法");
                }
                yield normalized;
            }
        };
    }

    private String normalizeOptionalPrivacyLevel(String value) {
        String normalized = normalizeOptional(value);
        return normalized == null ? null : normalizePrivacyLevel(normalized);
    }

    private String normalizeOptionalTargetType(String value) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (!TARGET_TYPES.contains(normalized)) {
            throw new BusinessException("SOURCE_TARGET_TYPE_INVALID", "来源绑定对象类型不合法");
        }
        return normalized;
    }

    private String normalizeConfidenceLevel(String value, String defaultValue) {
        String normalized = normalizeEnum(value, defaultValue);
        if (!CONFIDENCE_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_CONFIDENCE_INVALID", "来源可信度不合法");
        }
        return normalized;
    }

    private String normalizePrivacyLevel(String value) {
        String normalized = normalizeEnum(value, PRIVACY_CLAN_ONLY);
        if (!PRIVACY_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_PRIVACY_INVALID", "来源隐私级别不合法");
        }
        return normalized;
    }

    private String normalizeSensitiveLevel(String value) {
        String normalized = normalizeEnum(value, SENSITIVE_NORMAL);
        if (!SENSITIVE_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_SENSITIVE_INVALID", "来源敏感级别不合法");
        }
        return normalized;
    }

    private String normalizeEnum(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private Sort resolveSort(String sort) {
        if (sort == null) {
            return Sort.by(Sort.Direction.DESC, "updatedAt");
        }
        String[] parts = sort.split(",", 2);
        String field = SORT_FIELDS.contains(parts[0]) ? parts[0] : "updatedAt";
        Sort.Direction direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1]) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, field);
    }

    private SourceDetailResponse toDetailResponse(SourceEntity entity, Long actorId) {
        SourceResponse source = toResponse(entity);
        SourcePermissionView permissions = toPermissionView(entity, actorId, source.bindingCount());
        List<SourceBindingSummaryResponse> bindings = sourceBindingRepository.findTop5BySourceIdOrderByCreatedAtDesc(entity.getId())
                .stream()
                .map(this::toBindingSummaryResponse)
                .toList();
        List<SourceAttachmentSummaryResponse> attachments = sourceAttachmentRepository.findTop5BySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(entity.getId())
                .stream()
                .map(attachment -> toAttachmentSummaryResponse(attachment, permissions))
                .toList();
        return new SourceDetailResponse(source, permissions, bindings, attachments);
    }

    private SourcePermissionView toPermissionView(SourceEntity entity, Long actorId, int bindingCount) {
        Long clanId = entity.getClanId();
        boolean mutable = isDirectlyMutableSource(entity);
        boolean canUpdate = authorizationApplicationService.can(clanId, actorId, SOURCE_UPDATE);
        boolean canDeletePermission = authorizationApplicationService.can(clanId, actorId, SOURCE_DELETE);
        boolean canBindPermission = authorizationApplicationService.can(clanId, actorId, SOURCE_BIND);
        boolean canSubmitReview = authorizationApplicationService.can(clanId, actorId, SOURCE_SUBMIT_REVIEW) || canUpdate;
        boolean canUploadAttachment = authorizationApplicationService.can(clanId, actorId, ATTACHMENT_UPLOAD);
        boolean canPreviewAttachment = authorizationApplicationService.can(clanId, actorId, ATTACHMENT_PREVIEW)
                || authorizationApplicationService.can(clanId, actorId, ATTACHMENT_VIEW)
                || authorizationApplicationService.can(clanId, actorId, ATTACHMENT_DOWNLOAD);
        boolean canDownloadAttachment = authorizationApplicationService.can(clanId, actorId, ATTACHMENT_DOWNLOAD);
        return new SourcePermissionView(
                canUpdate && mutable,
                canDeletePermission && mutable && bindingCount == 0,
                canBindPermission && STATUS_OFFICIAL.equals(entity.getVerificationStatus()),
                canSubmitReview && (STATUS_DRAFT.equals(entity.getVerificationStatus()) || STATUS_REJECTED.equals(entity.getVerificationStatus())),
                canUploadAttachment,
                canPreviewAttachment,
                canDownloadAttachment
        );
    }

    private SourceBindingSummaryResponse toBindingSummaryResponse(SourceBindingEntity entity) {
        if (entity.getConfidenceLevel() == null || entity.getConfidenceLevel().isBlank()) {
            entity.setConfidenceLevel(CONFIDENCE_UNKNOWN);
        }
        if (entity.getBindingStatus() == null || entity.getBindingStatus().isBlank()) {
            entity.setBindingStatus(STATUS_OFFICIAL);
        }
        TargetDisplay targetDisplay = resolveTargetDisplay(entity.getClanId(), entity.getTargetType(), entity.getTargetId());
        return new SourceBindingSummaryResponse(
                entity.getId(),
                entity.getTargetType(),
                entity.getTargetId(),
                targetDisplay.displayName(),
                targetDisplay.branchName(),
                targetDisplay.summary(),
                entity.getBindingReason(),
                entity.getExcerpt(),
                entity.getConfidenceLevel(),
                entity.getBindingStatus(),
                entity.getCreatedBy(),
                entity.getCreatedAt()
        );
    }

    private TargetDisplay resolveTargetDisplay(Long clanId, String targetType, Long targetId) {
        if (targetType == null || targetId == null) {
            return fallbackTargetDisplay(targetType, targetId);
        }
        return switch (targetType) {
            case "person" -> resolvePersonDisplay(clanId, targetId);
            case "relationship" -> resolveRelationshipDisplay(clanId, targetId);
            case "branch" -> resolveBranchDisplay(clanId, targetId);
            case "clan" -> resolveClanDisplay(clanId, targetId);
            case "generation_word" -> resolveGenerationWordDisplay(clanId, targetId);
            default -> fallbackTargetDisplay(targetType, targetId);
        };
    }

    private TargetDisplay resolvePersonDisplay(Long clanId, Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .filter(person -> Objects.equals(clanId, person.getClanId()))
                .map(person -> {
                    String displayName = personDisplayName(person);
                    String branchName = person.getBranchId() == null ? null : branchRepository.findByIdAndClanId(person.getBranchId(), clanId).map(BranchEntity::getBranchName).orElse(null);
                    String summary = "人物：" + displayName + optionalPart("，字辈：", person.getGenerationWord()) + optionalPart("，排行：", person.getRankInFamily());
                    return new TargetDisplay(displayName, branchName, summary);
                })
                .orElseGet(() -> fallbackTargetDisplay("person", personId));
    }

    private TargetDisplay resolveRelationshipDisplay(Long clanId, Long relationshipId) {
        return relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(relationshipId, clanId)
                .map(relationship -> {
                    String fromName = personNameOrFallback(relationship.getFromPersonId());
                    String toName = personNameOrFallback(relationship.getToPersonId());
                    String relationName = nonBlank(relationship.getRelationLabel(), relationship.getRelationType());
                    String displayName = fromName + " -[" + relationName + "]-> " + toName;
                    String branchName = personRepository.findByIdAndDeletedAtIsNull(relationship.getFromPersonId())
                            .filter(person -> Objects.equals(clanId, person.getClanId()))
                            .map(PersonEntity::getBranchId)
                            .flatMap(branchId -> branchId == null ? Optional.empty() : branchRepository.findByIdAndClanId(branchId, clanId))
                            .map(BranchEntity::getBranchName)
                            .orElse(null);
                    String summary = "关系：" + fromName + " 与 " + toName + "，类型：" + relationName + optionalPart("，说明：", relationship.getDescription());
                    return new TargetDisplay(displayName, branchName, summary);
                })
                .orElseGet(() -> fallbackTargetDisplay("relationship", relationshipId));
    }

    private TargetDisplay resolveBranchDisplay(Long clanId, Long branchId) {
        return branchRepository.findByIdAndClanId(branchId, clanId)
                .map(branch -> new TargetDisplay(branch.getBranchName(), branch.getBranchName(), "支派：" + branch.getBranchName() + optionalPart("，路径：", branch.getBranchPath())))
                .orElseGet(() -> fallbackTargetDisplay("branch", branchId));
    }

    private TargetDisplay resolveClanDisplay(Long clanId, Long targetId) {
        return clanRepository.findById(targetId)
                .filter(clan -> Objects.equals(clanId, clan.getId()))
                .map(clan -> new TargetDisplay(clan.getClanName(), null, "宗族：" + clan.getClanName() + optionalPart("，姓氏：", clan.getSurname()) + optionalPart("，堂号：", clan.getHallName())))
                .orElseGet(() -> fallbackTargetDisplay("clan", targetId));
    }

    private TargetDisplay resolveGenerationWordDisplay(Long clanId, Long generationWordId) {
        return generationWordRepository.findById(generationWordId)
                .flatMap(word -> generationSchemeRepository.findByIdAndClanId(word.getSchemeId(), clanId).map(scheme -> toGenerationWordDisplay(word, scheme)))
                .orElseGet(() -> fallbackTargetDisplay("generation_word", generationWordId));
    }

    private TargetDisplay toGenerationWordDisplay(GenerationWordEntity word, GenerationSchemeEntity scheme) {
        String branchName = scheme.getBranchId() == null ? null : branchRepository.findByIdAndClanId(scheme.getBranchId(), scheme.getClanId()).map(BranchEntity::getBranchName).orElse(null);
        String displayName = "字辈：" + word.getWord();
        String summary = scheme.getSchemeName() + "，第" + word.getGenerationNo() + "世：" + word.getWord() + optionalPart("，说明：", word.getDescription());
        return new TargetDisplay(displayName, branchName, summary);
    }

    private TargetDisplay fallbackTargetDisplay(String targetType, Long targetId) {
        String fallback = nonBlank(targetType, "target") + ":" + targetId;
        return new TargetDisplay(fallback, null, fallback);
    }

    private String personNameOrFallback(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .map(this::personDisplayName)
                .orElse("person:" + personId);
    }

    private String personDisplayName(PersonEntity person) {
        String name = nonBlank(person.getGenealogyName(), person.getName());
        if (person.getPersonCode() == null || person.getPersonCode().isBlank()) {
            return name;
        }
        return name + "（" + person.getPersonCode() + "）";
    }

    private String optionalPart(String prefix, String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return prefix + value;
    }

    private String nonBlank(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }

    private SourceAttachmentSummaryResponse toAttachmentSummaryResponse(SourceAttachmentEntity entity, SourcePermissionView permissions) {
        return new SourceAttachmentSummaryResponse(
                entity.getId(),
                entity.getOriginalFilename(),
                entity.getContentType(),
                entity.getFileSize(),
                entity.getUploadStatus(),
                permissions.canPreviewAttachment(),
                permissions.canDownloadAttachment(),
                entity.getCreatedBy(),
                entity.getCreatedAt()
        );
    }

    private SourceResponse toResponse(SourceEntity entity) {
        normalizePersistedSource(entity);
        Long sourceId = entity.getId();
        int bindingCount = sourceId == null ? 0 : sourceBindingRepository.countBySourceId(sourceId);
        int attachmentCount = sourceId == null ? 0 : sourceAttachmentRepository.countBySourceIdAndDeletedAtIsNull(sourceId);
        return new SourceResponse(
                entity.getId(), entity.getClanId(), entity.getSourceName(), entity.getSourceType(), entity.getProviderName(),
                entity.getBookTitle(), entity.getVolumeNo(), entity.getPageNo(), entity.getSourceDate(), entity.getExcerpt(),
                entity.getDescription(), entity.getVerificationStatus(), entity.getConfidenceLevel(), entity.getPrivacyLevel(),
                entity.getSensitiveLevel(), bindingCount, attachmentCount, entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }

    private SourceBindingResponse toBindingResponse(SourceBindingEntity entity) {
        if (entity.getConfidenceLevel() == null || entity.getConfidenceLevel().isBlank()) {
            entity.setConfidenceLevel(CONFIDENCE_UNKNOWN);
        }
        if (entity.getBindingStatus() == null || entity.getBindingStatus().isBlank()) {
            entity.setBindingStatus(STATUS_OFFICIAL);
        }
        if (entity.getUpdatedAt() == null) {
            entity.setUpdatedAt(entity.getCreatedAt());
        }
        return new SourceBindingResponse(
                entity.getId(), entity.getClanId(), entity.getSourceId(), entity.getTargetType(), entity.getTargetId(),
                entity.getBindingReason(), entity.getExcerpt(), entity.getConfidenceLevel(), entity.getBindingStatus(),
                entity.getCreatedBy(), entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }

    private String sourceSnapshot(SourceEntity entity) {
        return "name=" + entity.getSourceName()
                + ",type=" + entity.getSourceType()
                + ",verificationStatus=" + entity.getVerificationStatus()
                + ",confidenceLevel=" + entity.getConfidenceLevel()
                + ",privacyLevel=" + entity.getPrivacyLevel()
                + ",sensitiveLevel=" + entity.getSensitiveLevel();
    }

    private record TargetDisplay(String displayName, String branchName, String summary) {
    }
}
