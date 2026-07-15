package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.persistence.TargetCountProjection;
import com.genealogy.culture.domain.CultureItemDomainService;
import com.genealogy.culture.dto.CultureAttachmentSummaryResponse;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureItemCreateRequest;
import com.genealogy.culture.dto.CultureItemDetailResponse;
import com.genealogy.culture.dto.CultureItemPageResponse;
import com.genealogy.culture.dto.CultureItemSearchCriteria;
import com.genealogy.culture.dto.CultureItemSummaryResponse;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.dto.CultureOverviewResponse;
import com.genealogy.culture.dto.CultureOverviewStatisticsResponse;
import com.genealogy.culture.dto.CulturePageMetadata;
import com.genealogy.culture.dto.CultureReviewSummaryResponse;
import com.genealogy.culture.dto.CultureSourceSummaryResponse;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
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

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CultureItemApplicationService {

    private static final String TARGET_TYPE = "culture_item";
    private static final String STATUS_ARCHIVED = "archived";
    private static final String READ_PERMISSION = "source:view";
    private static final String CREATE_PERMISSION = "source:create";
    private static final String UPDATE_PERMISSION = "source:update";
    private static final String DELETE_PERMISSION = "source:delete";
    private static final String ATTACHMENT_VIEW = "attachment:view";
    private static final String ATTACHMENT_PREVIEW = "attachment:preview";
    private static final String ATTACHMENT_DOWNLOAD = "attachment:download";
    private static final Set<String> RESTRICTED_PRIVACY = Set.of("private", "sealed");

    private final CultureItemRepository cultureItemRepository;
    private final CultureItemDomainService domainService;
    private final CultureItemMapper mapper;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final AppUserRepository appUserRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final SourceRepository sourceRepository;
    private final SourceAttachmentRepository sourceAttachmentRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public CultureItemApplicationService(
            CultureItemRepository cultureItemRepository,
            CultureItemDomainService domainService,
            CultureItemMapper mapper,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            AppUserRepository appUserRepository,
            SourceBindingRepository sourceBindingRepository,
            SourceRepository sourceRepository,
            SourceAttachmentRepository sourceAttachmentRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.cultureItemRepository = cultureItemRepository;
        this.domainService = domainService;
        this.mapper = mapper;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.appUserRepository = appUserRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.sourceRepository = sourceRepository;
        this.sourceAttachmentRepository = sourceAttachmentRepository;
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional
    public CultureItemDetailResponse create(
            Long clanId,
            CultureItemCreateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        ClanEntity clan = requireClan(clanId);
        authorizationApplicationService.requireClanMember(clanId, actorId);
        CultureItemDomainService.NormalizedCultureItemInput input = domainService.normalize(request);
        requireBranchInClan(clanId, input.branchId());
        AccessScope createScope = permissionScope(clanId, actorId, CREATE_PERMISSION);
        requireWriteScope(createScope, input.branchId());

        CultureItemEntity entity = new CultureItemEntity();
        entity.setClanId(clanId);
        entity.setDataStatus(CultureItemDomainService.STATUS_DRAFT);
        entity.setCreatedBy(actorId);
        domainService.apply(entity, input);
        CultureItemEntity saved = cultureItemRepository.save(entity);
        operationLogApplicationService.record(
                clanId,
                actorId,
                "culture_item_create",
                TARGET_TYPE,
                saved.getId(),
                "create culture item: " + safeLabel(saved),
                safeSnapshot(saved),
                requestId,
                clientIp
        );
        return buildDetail(saved, clan, actorId);
    }

    @Transactional(readOnly = true)
    public CultureItemPageResponse search(
            Long clanId,
            CultureItemSearchCriteria criteria,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        ClanEntity clan = requireClan(clanId);
        authorizationApplicationService.requireClanMember(clanId, actorId);
        AccessScope readScope = requireReadableScope(clanId, actorId);
        AccessScope updateScope = permissionScope(clanId, actorId, UPDATE_PERMISSION);
        AccessScope deleteScope = permissionScope(clanId, actorId, DELETE_PERMISSION);
        CultureItemSearchCriteria normalized = domainService.normalize(criteria);
        for (Long branchId : normalized.branchIds()) {
            requireBranchInClan(clanId, branchId);
            if (!readScope.canReadBranch(branchId)) {
                throw new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见");
            }
        }
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, CultureItemDomainService.MAX_PAGE_SIZE));
        Sort.Direction direction = domainService.sortAscending(normalized.sort()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(direction, domainService.sortField(normalized.sort())).and(Sort.by(Sort.Direction.DESC, "id"));
        PageRequest pageRequest = PageRequest.of(normalizedPageNo - 1, normalizedPageSize, sort);
        Page<CultureItemEntity> page = cultureItemRepository.findAll(
                buildSearchSpecification(clanId, actorId, normalized, readScope, updateScope),
                pageRequest
        );

        List<CultureItemEntity> rows = page.getContent();
        AggregationContext aggregation = aggregatePage(clan, rows, actorId, updateScope, deleteScope);
        List<CultureItemSummaryResponse> items = rows.stream()
                .map(entity -> toSummary(entity, clan, aggregation, updateScope, deleteScope))
                .toList();
        return new CultureItemPageResponse(
                items,
                new CulturePageMetadata(normalizedPageNo, normalizedPageSize, page.getTotalElements(), page.getTotalPages())
        );
    }


    @Transactional(readOnly = true)
    public CultureOverviewResponse getOverview(Long clanId, Long actorId) {
        ClanEntity clan = requireClan(clanId);
        authorizationApplicationService.requireClanMember(clanId, actorId);
        AccessScope readScope = requireReadableScope(clanId, actorId);
        AccessScope updateScope = permissionScope(clanId, actorId, UPDATE_PERMISSION);
        AccessScope deleteScope = permissionScope(clanId, actorId, DELETE_PERMISSION);

        CultureItemSearchCriteria officialCriteria = new CultureItemSearchCriteria(
                null, null, null, CultureItemDomainService.STATUS_OFFICIAL, null, null, null, "updatedAt,desc");
        long officialItemCount = cultureItemRepository.count(
                buildSearchSpecification(clanId, actorId, officialCriteria, readScope, updateScope));

        CultureItemSearchCriteria pendingCriteria = new CultureItemSearchCriteria(
                null, null, null, CultureItemDomainService.STATUS_PENDING_REVIEW, null, null, null, "updatedAt,desc");
        long pendingReviewCount = cultureItemRepository.count(
                buildSearchSpecification(clanId, actorId, pendingCriteria, readScope, updateScope));

        CultureItemSearchCriteria officialWithSourceCriteria = new CultureItemSearchCriteria(
                null, null, null, CultureItemDomainService.STATUS_OFFICIAL, null, true, null, "updatedAt,desc");
        long officialWithSourceCount = cultureItemRepository.count(
                buildSearchSpecification(clanId, actorId, officialWithSourceCriteria, readScope, updateScope));
        double sourceCoverageRate = officialItemCount == 0 ? 0D : (double) officialWithSourceCount / officialItemCount;

        CultureItemSearchCriteria featuredCriteria = new CultureItemSearchCriteria(
                null, null, null, CultureItemDomainService.STATUS_OFFICIAL, null, null, true, "sortOrder,asc");
        PageRequest featuredPage = PageRequest.of(0, 6, Sort.by(Sort.Direction.ASC, "sortOrder").and(Sort.by(Sort.Direction.DESC, "updatedAt")));
        List<CultureItemEntity> featuredRows = cultureItemRepository.findAll(
                buildSearchSpecification(clanId, actorId, featuredCriteria, readScope, updateScope), featuredPage).getContent();
        AggregationContext aggregation = aggregatePage(clan, featuredRows, actorId, updateScope, deleteScope);
        List<CultureItemSummaryResponse> featuredItems = featuredRows.stream()
                .map(entity -> toSummary(entity, clan, aggregation, updateScope, deleteScope))
                .toList();

        List<String> missingHints = new ArrayList<>();
        if (featuredItems.isEmpty()) {
            missingHints.add("暂无可展示的首页精选文化资料，请维护并审核正式文化资料后设为精选。");
        }
        if (officialItemCount > 0 && officialWithSourceCount < officialItemCount) {
            missingHints.add("部分正式文化资料尚未绑定来源证据。");
        }

        return new CultureOverviewResponse(
                clan.getId(),
                clan.getClanName(),
                new CultureOverviewStatisticsResponse(officialItemCount, pendingReviewCount, sourceCoverageRate),
                featuredItems,
                List.of(),
                List.of(),
                missingHints
        );
    }

    @Transactional(readOnly = true)
    public CultureItemDetailResponse getDetail(Long cultureItemId, Long actorId) {
        CultureItemEntity entity = requireVisibleEntity(cultureItemId, actorId);
        return buildDetail(entity, requireClan(entity.getClanId()), actorId);
    }

    @Transactional
    public CultureItemDetailResponse update(
            Long cultureItemId,
            CultureItemUpdateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureItemEntity entity = requireVisibleEntity(cultureItemId, actorId);
        domainService.requireDirectlyMutable(entity);
        domainService.requireExpectedVersion(entity, request.version());
        CultureItemDomainService.NormalizedCultureItemInput input = domainService.normalize(request);
        requireBranchInClan(entity.getClanId(), input.branchId());
        AccessScope updateScope = permissionScope(entity.getClanId(), actorId, UPDATE_PERMISSION);
        requireWriteScope(updateScope, entity.getBranchId());
        requireWriteScope(updateScope, input.branchId());
        String before = safeSnapshot(entity);
        domainService.apply(entity, input);
        CultureItemEntity saved = cultureItemRepository.save(entity);
        operationLogApplicationService.record(
                saved.getClanId(),
                actorId,
                "culture_item_update",
                TARGET_TYPE,
                saved.getId(),
                "update culture item: " + safeLabel(saved),
                "before=" + before + "; after=" + safeSnapshot(saved),
                requestId,
                clientIp
        );
        return buildDetail(saved, requireClan(saved.getClanId()), actorId);
    }

    @Transactional
    public CultureCommandResponse delete(
            Long cultureItemId,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureItemEntity entity = requireVisibleEntity(cultureItemId, actorId);
        domainService.requireDirectlyMutable(entity);
        AccessScope deleteScope = permissionScope(entity.getClanId(), actorId, DELETE_PERMISSION);
        requireWriteScope(deleteScope, entity.getBranchId());
        entity.setDeletedAt(OffsetDateTime.now());
        CultureItemEntity saved = cultureItemRepository.save(entity);
        operationLogApplicationService.record(
                saved.getClanId(),
                actorId,
                "culture_item_delete",
                TARGET_TYPE,
                saved.getId(),
                "delete culture item: " + safeLabel(saved),
                safeSnapshot(saved),
                requestId,
                clientIp
        );
        return new CultureCommandResponse(TARGET_TYPE, saved.getId(), "deleted", null, "文化资料已删除");
    }

    private CultureItemDetailResponse buildDetail(CultureItemEntity entity, ClanEntity clan, Long actorId) {
        AccessScope updateScope = permissionScope(entity.getClanId(), actorId, UPDATE_PERMISSION);
        AccessScope deleteScope = permissionScope(entity.getClanId(), actorId, DELETE_PERMISSION);
        AggregationContext aggregation = aggregatePage(clan, List.of(entity), actorId, updateScope, deleteScope);
        CultureItemSummaryResponse summary = toSummary(entity, clan, aggregation, updateScope, deleteScope);

        List<SourceBindingEntity> bindings = sourceBindingRepository
                .findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                        entity.getClanId(), TARGET_TYPE, entity.getId(), STATUS_ARCHIVED);
        Map<Long, SourceEntity> sourcesById = sourceRepository.findAllById(
                        bindings.stream().map(SourceBindingEntity::getSourceId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(source -> Objects.equals(source.getClanId(), entity.getClanId()))
                .collect(Collectors.toMap(SourceEntity::getId, Function.identity()));
        boolean canManageSources = updateScope.canWriteBranch(entity.getBranchId());
        List<CultureSourceSummaryResponse> sources = bindings.stream()
                .map(binding -> toSourceSummary(binding, sourcesById.get(binding.getSourceId()), canManageSources))
                .filter(Objects::nonNull)
                .toList();
        List<Long> sourceIds = sources.stream().map(CultureSourceSummaryResponse::sourceId).distinct().toList();
        boolean canPreview = authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_PREVIEW)
                || authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_VIEW)
                || authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
        boolean canDownload = authorizationApplicationService.can(entity.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
        List<CultureAttachmentSummaryResponse> attachments = sourceIds.isEmpty()
                ? List.of()
                : sourceAttachmentRepository.findTop10BySourceIdInAndDeletedAtIsNullOrderByCreatedAtDesc(sourceIds)
                .stream()
                .map(attachment -> toAttachmentSummary(attachment, canPreview, canDownload))
                .toList();
        CultureReviewSummaryResponse review = latestReview(entity, aggregation.userNames());
        return mapper.toDetail(summary, entity.getContent(), sources, attachments, review);
    }

    private AggregationContext aggregatePage(
            ClanEntity clan,
            List<CultureItemEntity> rows,
            Long actorId,
            AccessScope updateScope,
            AccessScope deleteScope
    ) {
        List<Long> ids = rows.stream().map(CultureItemEntity::getId).filter(Objects::nonNull).toList();
        Map<Long, Integer> sourceCounts = countMap(ids.isEmpty()
                ? List.of()
                : sourceBindingRepository.countActiveByTargets(clan.getId(), TARGET_TYPE, ids, STATUS_ARCHIVED));
        Map<Long, Integer> attachmentCounts = countMap(ids.isEmpty()
                ? List.of()
                : sourceAttachmentRepository.countActiveByTargets(clan.getId(), TARGET_TYPE, ids, STATUS_ARCHIVED));
        Map<Long, Integer> reviewCounts = countMap(ids.isEmpty()
                ? List.of()
                : revisionRepository.countByTargets(clan.getId(), TARGET_TYPE, ids));
        Map<Long, String> branchNames = branchRepository.findAllById(rows.stream()
                        .map(CultureItemEntity::getBranchId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList())
                .stream()
                .filter(branch -> Objects.equals(branch.getClanId(), clan.getId()))
                .collect(Collectors.toMap(BranchEntity::getId, BranchEntity::getBranchName));
        Map<Long, String> userNames = appUserRepository.findAllById(rows.stream()
                        .map(CultureItemEntity::getCreatedBy)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList())
                .stream()
                .collect(Collectors.toMap(AppUserEntity::getId, AppUserEntity::getDisplayName));
        return new AggregationContext(sourceCounts, attachmentCounts, reviewCounts, branchNames, userNames);
    }

    private CultureItemSummaryResponse toSummary(
            CultureItemEntity entity,
            ClanEntity clan,
            AggregationContext aggregation,
            AccessScope updateScope,
            AccessScope deleteScope
    ) {
        return mapper.toSummary(
                entity,
                clan.getClanName(),
                aggregation.branchNames().get(entity.getBranchId()),
                aggregation.userNames().get(entity.getCreatedBy()),
                aggregation.sourceCounts().getOrDefault(entity.getId(), 0),
                aggregation.attachmentCounts().getOrDefault(entity.getId(), 0),
                aggregation.reviewCounts().getOrDefault(entity.getId(), 0),
                allowedActions(entity, updateScope, deleteScope)
        );
    }

    private Specification<CultureItemEntity> buildSearchSpecification(
            Long clanId,
            Long actorId,
            CultureItemSearchCriteria criteria,
            AccessScope readScope,
            AccessScope updateScope
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("clanId"), clanId));
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (!readScope.fullClanAccess()) {
                predicates.add(cb.or(
                        cb.isNull(root.get("branchId")),
                        root.get("branchId").in(readScope.branchIds())
                ));
            }
            if (!updateScope.fullClanAccess()) {
                List<Predicate> privacyOptions = new ArrayList<>();
                privacyOptions.add(cb.not(root.get("privacyLevel").in(RESTRICTED_PRIVACY)));
                privacyOptions.add(cb.equal(root.get("createdBy"), actorId));
                if (!updateScope.branchIds().isEmpty()) {
                    privacyOptions.add(root.get("branchId").in(updateScope.branchIds()));
                }
                predicates.add(cb.or(privacyOptions.toArray(Predicate[]::new)));
            }
            if (criteria.keyword() != null) {
                String pattern = "%" + criteria.keyword().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        likeIgnoreCase(cb, root, "title", pattern),
                        likeIgnoreCase(cb, root, "summary", pattern),
                        likeIgnoreCase(cb, root, "content", pattern),
                        likeIgnoreCase(cb, root, "historicalPeriod", pattern),
                        likeIgnoreCase(cb, root, "locationText", pattern)
                ));
            }
            if (!criteria.categories().isEmpty()) {
                predicates.add(root.get("category").in(criteria.categories()));
            }
            if (!criteria.branchIds().isEmpty()) {
                predicates.add(root.get("branchId").in(criteria.branchIds()));
            }
            if (!criteria.dataStatuses().isEmpty()) {
                predicates.add(root.get("dataStatus").in(criteria.dataStatuses()));
            }
            if (!criteria.privacyLevels().isEmpty()) {
                predicates.add(root.get("privacyLevel").in(criteria.privacyLevels()));
            }
            if (criteria.featuredOnHomeValues().size() == 1) {
                predicates.add(cb.equal(root.get("featuredOnHome"), criteria.featuredOnHomeValues().get(0)));
            }
            if (criteria.hasSourceValues().size() == 1) {
                Predicate sourceExists = cb.exists(sourceBindingSubquery(root, query, cb, clanId));
                predicates.add(criteria.hasSourceValues().get(0) ? sourceExists : cb.not(sourceExists));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Subquery<Long> sourceBindingSubquery(
            Root<CultureItemEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder cb,
            Long clanId
    ) {
        Subquery<Long> subquery = query.subquery(Long.class);
        Root<SourceBindingEntity> binding = subquery.from(SourceBindingEntity.class);
        subquery.select(binding.get("id")).where(
                cb.equal(binding.get("clanId"), clanId),
                cb.equal(binding.get("targetType"), TARGET_TYPE),
                cb.equal(binding.get("targetId"), root.get("id")),
                cb.notEqual(binding.get("bindingStatus"), STATUS_ARCHIVED)
        );
        return subquery;
    }

    private Predicate likeIgnoreCase(CriteriaBuilder cb, Root<CultureItemEntity> root, String field, String pattern) {
        return cb.like(cb.lower(cb.coalesce(root.get(field), "")), pattern);
    }

    private CultureItemEntity requireVisibleEntity(Long id, Long actorId) {
        CultureItemEntity entity = cultureItemRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
        authorizationApplicationService.requireClanMember(entity.getClanId(), actorId);
        AccessScope readScope = requireReadableScope(entity.getClanId(), actorId);
        AccessScope updateScope = permissionScope(entity.getClanId(), actorId, UPDATE_PERMISSION);
        if (!readScope.canReadBranch(entity.getBranchId()) || !canReadPrivacy(entity, actorId, updateScope)) {
            throw new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见");
        }
        return entity;
    }

    private boolean canReadPrivacy(CultureItemEntity entity, Long actorId, AccessScope updateScope) {
        if (!RESTRICTED_PRIVACY.contains(entity.getPrivacyLevel())) {
            return true;
        }
        return Objects.equals(entity.getCreatedBy(), actorId) || updateScope.canWriteBranch(entity.getBranchId());
    }

    private AccessScope requireReadableScope(Long clanId, Long actorId) {
        AccessScope scope = permissionScope(clanId, actorId, READ_PERMISSION);
        if (!scope.hasAnyAccess()) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看文化资料");
        }
        return scope;
    }

    private AccessScope permissionScope(Long clanId, Long actorId, String permissionCode) {
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) {
            return AccessScope.full();
        }
        RbacAuthorizationApplicationService.PermissionDataScope scope =
                rbacAuthorizationApplicationService.permissionDataScope(actorId, clanId, permissionCode);
        return new AccessScope(scope.fullClanAccess(), scope.visibleBranchIds());
    }

    private void requireWriteScope(AccessScope scope, Long branchId) {
        if (!scope.canWriteBranch(branchId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限维护该范围的文化资料");
        }
    }

    private void requireBranchInClan(Long clanId, Long branchId) {
        if (branchId != null && branchRepository.findByIdAndClanId(branchId, clanId).isEmpty()) {
            throw new BusinessException("CULTURE_ITEM_BRANCH_INVALID", "支派不属于当前宗族");
        }
    }

    private ClanEntity requireClan(Long clanId) {
        return clanRepository.findById(clanId)
                .orElseThrow(() -> new BusinessException("CLAN_NOT_FOUND", "宗族不存在"));
    }

    private List<String> allowedActions(CultureItemEntity entity, AccessScope updateScope, AccessScope deleteScope) {
        LinkedHashSet<String> actions = new LinkedHashSet<>();
        actions.add("view");
        if (domainService.isDirectlyMutable(entity) && updateScope.canWriteBranch(entity.getBranchId())) {
            actions.add("update");
        }
        if (domainService.isDirectlyMutable(entity) && deleteScope.canWriteBranch(entity.getBranchId())) {
            actions.add("delete");
        }
        return List.copyOf(actions);
    }

    private CultureSourceSummaryResponse toSourceSummary(
            SourceBindingEntity binding,
            SourceEntity source,
            boolean canManageSources
    ) {
        if (source == null || STATUS_ARCHIVED.equals(source.getVerificationStatus())) {
            return null;
        }
        boolean restricted = RESTRICTED_PRIVACY.contains(source.getPrivacyLevel());
        return new CultureSourceSummaryResponse(
                source.getId(),
                source.getSourceName(),
                source.getSourceType(),
                restricted && !canManageSources ? null : binding.getExcerpt(),
                binding.getConfidenceLevel(),
                binding.getBindingStatus()
        );
    }

    private CultureAttachmentSummaryResponse toAttachmentSummary(
            SourceAttachmentEntity attachment,
            boolean canPreview,
            boolean canDownload
    ) {
        return new CultureAttachmentSummaryResponse(
                attachment.getId(),
                attachment.getOriginalFilename(),
                attachment.getContentType(),
                attachment.getFileSize(),
                canPreview,
                canDownload
        );
    }

    private CultureReviewSummaryResponse latestReview(CultureItemEntity entity, Map<Long, String> userNames) {
        RevisionEntity revision = revisionRepository
                .findFirstByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(entity.getClanId(), TARGET_TYPE, entity.getId())
                .orElse(null);
        if (revision == null) {
            return CultureReviewSummaryResponse.empty();
        }
        ReviewTaskEntity task = reviewTaskRepository.findFirstByRevisionIdOrderByReviewLevelAsc(revision.getId()).orElse(null);
        Set<Long> missingUserIds = new LinkedHashSet<>();
        if (revision.getSubmitterId() != null && !userNames.containsKey(revision.getSubmitterId())) {
            missingUserIds.add(revision.getSubmitterId());
        }
        if (task != null && task.getReviewerId() != null && !userNames.containsKey(task.getReviewerId())) {
            missingUserIds.add(task.getReviewerId());
        }
        Map<Long, String> names = new LinkedHashMap<>(userNames);
        appUserRepository.findAllById(missingUserIds).forEach(user -> names.put(user.getId(), user.getDisplayName()));
        return new CultureReviewSummaryResponse(
                task == null ? null : task.getId(),
                task == null ? revision.getStatus() : task.getStatus(),
                names.get(revision.getSubmitterId()),
                task == null ? null : names.get(task.getReviewerId()),
                revision.getSubmitTime(),
                task == null ? null : task.getReviewedAt(),
                revision.getRejectedReason()
        );
    }

    private Map<Long, Integer> countMap(Collection<TargetCountProjection> counts) {
        Map<Long, Integer> result = new LinkedHashMap<>();
        counts.forEach(item -> result.put(item.getTargetId(), Math.toIntExact(item.getCount())));
        return result;
    }

    private String safeLabel(CultureItemEntity entity) {
        return entity.getTitle() + " [" + entity.getCategory() + "]";
    }

    private String safeSnapshot(CultureItemEntity entity) {
        return "title=" + entity.getTitle()
                + ",category=" + entity.getCategory()
                + ",branchId=" + entity.getBranchId()
                + ",status=" + entity.getDataStatus()
                + ",privacy=" + entity.getPrivacyLevel()
                + ",sensitive=" + entity.getSensitiveLevel()
                + ",featured=" + entity.isFeaturedOnHome();
    }

    private record AggregationContext(
            Map<Long, Integer> sourceCounts,
            Map<Long, Integer> attachmentCounts,
            Map<Long, Integer> reviewCounts,
            Map<Long, String> branchNames,
            Map<Long, String> userNames
    ) {
    }

    private record AccessScope(boolean fullClanAccess, Set<Long> branchIds) {

        private AccessScope {
            branchIds = branchIds == null ? Set.of() : Set.copyOf(branchIds);
        }

        static AccessScope full() {
            return new AccessScope(true, Set.of());
        }

        boolean hasAnyAccess() {
            return fullClanAccess || !branchIds.isEmpty();
        }

        boolean canReadBranch(Long branchId) {
            return fullClanAccess || branchId == null || branchIds.contains(branchId);
        }

        boolean canWriteBranch(Long branchId) {
            return fullClanAccess || branchId != null && branchIds.contains(branchId);
        }
    }
}
