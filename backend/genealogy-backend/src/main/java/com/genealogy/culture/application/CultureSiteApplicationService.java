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
import com.genealogy.culture.domain.CultureSiteDomainService;
import com.genealogy.culture.domain.CultureSitePermissionPolicyService;
import com.genealogy.culture.dto.CultureAttachmentSummaryResponse;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CulturePageMetadata;
import com.genealogy.culture.dto.CultureReviewSummaryResponse;
import com.genealogy.culture.dto.CultureScopeResponse;
import com.genealogy.culture.dto.CultureSiteCreateRequest;
import com.genealogy.culture.dto.CultureSiteDetailResponse;
import com.genealogy.culture.dto.CultureSitePageResponse;
import com.genealogy.culture.dto.CultureSiteSearchCriteria;
import com.genealogy.culture.dto.CultureSiteSummaryResponse;
import com.genealogy.culture.dto.CultureSiteUpdateRequest;
import com.genealogy.culture.dto.CultureSourceSummaryResponse;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.repository.CultureSiteRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
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
import jakarta.persistence.criteria.Predicate;
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
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CultureSiteApplicationService {

    private static final String TARGET_TYPE = CultureSiteGovernanceApplicationService.TARGET_TYPE;
    private static final String STATUS_ARCHIVED = "archived";
    private static final String ATTACHMENT_VIEW = "attachment:view";
    private static final String ATTACHMENT_PREVIEW = "attachment:preview";
    private static final String ATTACHMENT_DOWNLOAD = "attachment:download";
    private static final Set<String> RESTRICTED_PRIVACY = Set.of("relatives_only", "private", "sealed");

    private final CultureSiteRepository siteRepository;
    private final CultureSiteDomainService domainService;
    private final CultureSitePermissionPolicyService permissionPolicyService;
    private final CultureSiteGovernanceApplicationService governanceApplicationService;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final PersonRepository personRepository;
    private final AppUserRepository appUserRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final SourceRepository sourceRepository;
    private final SourceAttachmentRepository sourceAttachmentRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public CultureSiteApplicationService(
            CultureSiteRepository siteRepository,
            CultureSiteDomainService domainService,
            CultureSitePermissionPolicyService permissionPolicyService,
            CultureSiteGovernanceApplicationService governanceApplicationService,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            PersonRepository personRepository,
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
        this.siteRepository = siteRepository;
        this.domainService = domainService;
        this.permissionPolicyService = permissionPolicyService;
        this.governanceApplicationService = governanceApplicationService;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.personRepository = personRepository;
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
    public CultureSiteDetailResponse create(
            Long clanId,
            CultureSiteCreateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        ClanEntity clan = requireClan(clanId);
        authorizationApplicationService.requireClanMember(clanId, actorId);
        CultureSiteDomainService.NormalizedSiteInput input = domainService.normalize(request);
        requireBranchInClan(clanId, input.branchId());
        validateRelatedPerson(clanId, input.branchId(), input.relatedPersonId());
        if (!permissionPolicyService.canCreate(clanId, input.branchId(), actorId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限在该范围新增文化场所");
        }
        CultureSiteEntity site = new CultureSiteEntity();
        site.setClanId(clanId);
        site.setCreatedBy(actorId);
        site.setDataStatus(CultureSiteDomainService.STATUS_DRAFT);
        domainService.apply(site, input);
        CultureSiteEntity saved = siteRepository.save(site);
        record(saved, actorId, "culture_site_create", "新增文化场所", safeSnapshot(saved), requestId, clientIp);
        return buildDetail(saved, clan, actorId);
    }

    @Transactional(readOnly = true)
    public CultureSitePageResponse search(
            Long clanId,
            CultureSiteSearchCriteria criteria,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        ClanEntity clan = requireClan(clanId);
        authorizationApplicationService.requireClanMember(clanId, actorId);
        AccessScope readScope = requireReadableScope(clanId, actorId);
        AccessScope sensitiveScope = permissionScope(clanId, actorId, CultureSitePermissionPolicyService.VIEW_SENSITIVE);
        CultureSiteSearchCriteria normalized = domainService.normalize(criteria);
        if (normalized.branchId() != null) {
            requireBranchInClan(clanId, normalized.branchId());
            if (!readScope.canReadBranch(normalized.branchId())) throw notFound();
        }
        int safePageNo = Math.max(1, pageNo);
        int safePageSize = Math.max(1, Math.min(pageSize, CultureSiteDomainService.MAX_PAGE_SIZE));
        Sort.Direction direction = domainService.sortAscending(normalized.sort()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(direction, domainService.sortField(normalized.sort()))
                .and(Sort.by(Sort.Direction.ASC, "sortOrder"))
                .and(Sort.by(Sort.Direction.DESC, "id"));
        Page<CultureSiteEntity> page = siteRepository.findAll(
                buildSpecification(clanId, actorId, normalized, readScope, sensitiveScope),
                PageRequest.of(safePageNo - 1, safePageSize, sort)
        );
        List<CultureSiteEntity> rows = page.getContent();
        Aggregation aggregation = aggregate(clanId, rows);
        List<CultureSiteSummaryResponse> items = rows.stream()
                .map(site -> toSummary(site, clan, aggregation, actorId))
                .toList();
        return new CultureSitePageResponse(
                items,
                new CulturePageMetadata(safePageNo, safePageSize, page.getTotalElements(), page.getTotalPages())
        );
    }

    @Transactional(readOnly = true)
    public CultureSiteDetailResponse getDetail(Long siteId, Long actorId) {
        CultureSiteEntity site = requireVisible(siteId, actorId);
        return buildDetail(site, requireClan(site.getClanId()), actorId);
    }

    @Transactional
    public CultureSiteDetailResponse update(
            Long siteId,
            CultureSiteUpdateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureSiteEntity site = requireVisible(siteId, actorId);
        permissionPolicyService.requireAction(site, actorId, CultureSitePermissionPolicyService.UPDATE);
        CultureSiteDomainService.NormalizedSiteInput input = domainService.normalize(request);
        requireBranchInClan(site.getClanId(), input.branchId());
        validateRelatedPerson(site.getClanId(), input.branchId(), input.relatedPersonId());
        if (CultureSiteDomainService.STATUS_OFFICIAL.equals(normalize(site.getDataStatus()))) {
            governanceApplicationService.submitOfficialUpdate(site, request, actorId, requestId, clientIp);
            return getDetail(siteId, actorId);
        }
        domainService.requireDirectlyMutable(site);
        domainService.requireExpectedVersion(site, request.version());
        if (!permissionPolicyService.canCreate(site.getClanId(), input.branchId(), actorId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限将文化场所移动到该范围");
        }
        String before = safeSnapshot(site);
        domainService.apply(site, input);
        CultureSiteEntity saved = siteRepository.save(site);
        record(saved, actorId, "culture_site_update", "更新文化场所", "before=" + before + "; after=" + safeSnapshot(saved), requestId, clientIp);
        return buildDetail(saved, requireClan(saved.getClanId()), actorId);
    }

    @Transactional
    public CultureCommandResponse delete(Long siteId, Long actorId, String requestId, String clientIp) {
        CultureSiteEntity site = requireVisible(siteId, actorId);
        permissionPolicyService.requireAction(site, actorId, CultureSitePermissionPolicyService.DELETE);
        if (CultureSiteDomainService.STATUS_OFFICIAL.equals(normalize(site.getDataStatus()))) {
            return governanceApplicationService.submitOfficialDelete(site, actorId, requestId, clientIp);
        }
        domainService.requireDirectlyMutable(site);
        site.setDeletedAt(OffsetDateTime.now());
        CultureSiteEntity saved = siteRepository.save(site);
        record(saved, actorId, "culture_site_delete", "删除文化场所", safeSnapshot(saved), requestId, clientIp);
        return new CultureCommandResponse(TARGET_TYPE, saved.getId(), "deleted", null, "文化场所已删除");
    }

    private CultureSiteDetailResponse buildDetail(CultureSiteEntity site, ClanEntity clan, Long actorId) {
        Aggregation aggregation = aggregate(site.getClanId(), List.of(site));
        CultureSiteSummaryResponse summary = toSummary(site, clan, aggregation, actorId);
        List<SourceBindingEntity> bindings = sourceBindingRepository
                .findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                        site.getClanId(), TARGET_TYPE, site.getId(), STATUS_ARCHIVED);
        Map<Long, SourceEntity> sourcesById = sourceRepository.findAllById(
                        bindings.stream().map(SourceBindingEntity::getSourceId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(source -> Objects.equals(source.getClanId(), site.getClanId()))
                .collect(Collectors.toMap(SourceEntity::getId, Function.identity()));
        boolean sensitiveAccess = permissionPolicyService.canViewSensitive(site, actorId);
        List<CultureSourceSummaryResponse> sources = bindings.stream()
                .map(binding -> toSourceSummary(binding, sourcesById.get(binding.getSourceId()), sensitiveAccess))
                .filter(Objects::nonNull)
                .toList();
        List<Long> sourceIds = sources.stream().map(CultureSourceSummaryResponse::sourceId).distinct().toList();
        boolean canPreview = sensitiveAccess && (
                authorizationApplicationService.can(site.getClanId(), actorId, ATTACHMENT_PREVIEW)
                        || authorizationApplicationService.can(site.getClanId(), actorId, ATTACHMENT_VIEW)
                        || authorizationApplicationService.can(site.getClanId(), actorId, ATTACHMENT_DOWNLOAD));
        boolean canDownload = sensitiveAccess && authorizationApplicationService.can(site.getClanId(), actorId, ATTACHMENT_DOWNLOAD);
        List<CultureAttachmentSummaryResponse> attachments = sourceIds.isEmpty()
                ? List.of()
                : sourceAttachmentRepository.findTop10BySourceIdInAndDeletedAtIsNullOrderByCreatedAtDesc(sourceIds)
                .stream()
                .map(attachment -> toAttachmentSummary(attachment, canPreview, canDownload))
                .toList();
        CultureReviewSummaryResponse review = latestReview(site);
        return new CultureSiteDetailResponse(
                summary.id(), summary.scope(), summary.siteType(), summary.name(), summary.addressText(),
                summary.foundedPeriod(), summary.currentStatus(), summary.summary(), summary.latitude(), summary.longitude(),
                site.getRelatedPersonId(), aggregation.personNames().get(site.getRelatedPersonId()),
                summary.confidenceLevel(), summary.privacyLevel(), summary.sensitiveLevel(), summary.dataStatus(),
                summary.featuredOnHome(), summary.sortOrder(), summary.sourceCount(), summary.attachmentCount(),
                summary.allowedActions(), summary.version(), summary.createdAt(), summary.updatedAt(),
                site.getDescription(), sources, attachments, review
        );
    }

    private CultureSiteSummaryResponse toSummary(
            CultureSiteEntity site,
            ClanEntity clan,
            Aggregation aggregation,
            Long actorId
    ) {
        boolean pending = governanceApplicationService.hasPendingRevision(site.getId());
        boolean sensitiveAccess = permissionPolicyService.canViewSensitive(site, actorId);
        return new CultureSiteSummaryResponse(
                site.getId(),
                new CultureScopeResponse(clan.getId(), clan.getClanName(), site.getBranchId(), aggregation.branchNames().get(site.getBranchId())),
                site.getSiteType(),
                site.getSiteName(),
                sensitiveAccess ? site.getAddressText() : null,
                site.getFoundedPeriod(),
                site.getCurrentStatus(),
                site.getSummary(),
                sensitiveAccess ? site.getLatitude() : null,
                sensitiveAccess ? site.getLongitude() : null,
                site.getConfidenceLevel(),
                site.getPrivacyLevel(),
                site.getSensitiveLevel(),
                site.getDataStatus(),
                site.isFeaturedOnHome(),
                site.getSortOrder(),
                aggregation.sourceCounts().getOrDefault(site.getId(), 0),
                aggregation.attachmentCounts().getOrDefault(site.getId(), 0),
                permissionPolicyService.allowedActions(site, actorId, pending),
                site.getVersion(),
                site.getCreatedAt(),
                site.getUpdatedAt()
        );
    }

    private Aggregation aggregate(Long clanId, List<CultureSiteEntity> rows) {
        List<Long> ids = rows.stream().map(CultureSiteEntity::getId).filter(Objects::nonNull).toList();
        Map<Long, Integer> sourceCounts = countMap(ids.isEmpty()
                ? List.of()
                : sourceBindingRepository.countActiveByTargets(clanId, TARGET_TYPE, ids, STATUS_ARCHIVED));
        Map<Long, Integer> attachmentCounts = countMap(ids.isEmpty()
                ? List.of()
                : sourceAttachmentRepository.countActiveByTargets(clanId, TARGET_TYPE, ids, STATUS_ARCHIVED));
        Map<Long, String> branchNames = branchRepository.findAllById(rows.stream()
                        .map(CultureSiteEntity::getBranchId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(branch -> Objects.equals(branch.getClanId(), clanId))
                .collect(Collectors.toMap(BranchEntity::getId, BranchEntity::getBranchName));
        Map<Long, String> personNames = personRepository.findAllById(rows.stream()
                        .map(CultureSiteEntity::getRelatedPersonId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(person -> Objects.equals(person.getClanId(), clanId) && person.getDeletedAt() == null)
                .collect(Collectors.toMap(PersonEntity::getId, PersonEntity::getName));
        return new Aggregation(sourceCounts, attachmentCounts, branchNames, personNames);
    }

    private Specification<CultureSiteEntity> buildSpecification(
            Long clanId,
            Long actorId,
            CultureSiteSearchCriteria criteria,
            AccessScope readScope,
            AccessScope sensitiveScope
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("clanId"), clanId));
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (!readScope.fullClanAccess()) {
                predicates.add(cb.or(cb.isNull(root.get("branchId")), root.get("branchId").in(readScope.branchIds())));
            }
            if (!sensitiveScope.fullClanAccess()) {
                List<Predicate> visiblePrivacy = new ArrayList<>();
                visiblePrivacy.add(cb.and(
                        cb.not(root.get("privacyLevel").in(RESTRICTED_PRIVACY)),
                        cb.notEqual(root.get("sensitiveLevel"), "sensitive"),
                        cb.notEqual(root.get("sensitiveLevel"), "highly_sensitive")
                ));
                visiblePrivacy.add(cb.equal(root.get("createdBy"), actorId));
                if (!sensitiveScope.branchIds().isEmpty()) visiblePrivacy.add(root.get("branchId").in(sensitiveScope.branchIds()));
                predicates.add(cb.or(visiblePrivacy.toArray(Predicate[]::new)));
            }
            if (criteria.keyword() != null) {
                String pattern = "%" + criteria.keyword().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("siteName"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("addressText"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("foundedPeriod"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("currentStatus"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("summary"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern)
                ));
            }
            if (criteria.siteType() != null) predicates.add(cb.equal(root.get("siteType"), criteria.siteType()));
            if (criteria.branchId() != null) predicates.add(cb.equal(root.get("branchId"), criteria.branchId()));
            if (criteria.relatedPersonId() != null) predicates.add(cb.equal(root.get("relatedPersonId"), criteria.relatedPersonId()));
            if (criteria.dataStatus() != null) predicates.add(cb.equal(root.get("dataStatus"), criteria.dataStatus()));
            if (criteria.privacyLevel() != null) predicates.add(cb.equal(root.get("privacyLevel"), criteria.privacyLevel()));
            if (criteria.featuredOnHome() != null) predicates.add(cb.equal(root.get("featuredOnHome"), criteria.featuredOnHome()));
            addContains(predicates, root.get("addressText"), criteria.addressText(), cb);
            addContains(predicates, root.get("foundedPeriod"), criteria.foundedPeriod(), cb);
            addContains(predicates, root.get("currentStatus"), criteria.currentStatus(), cb);
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private CultureSiteEntity requireVisible(Long siteId, Long actorId) {
        CultureSiteEntity site = siteRepository.findByIdAndDeletedAtIsNull(siteId).orElseThrow(this::notFound);
        permissionPolicyService.requireVisible(site, actorId);
        return site;
    }

    private AccessScope requireReadableScope(Long clanId, Long actorId) {
        AccessScope scope = permissionScope(clanId, actorId, CultureSitePermissionPolicyService.VIEW);
        if (!scope.hasAnyAccess()) throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看文化场所");
        return scope;
    }

    private AccessScope permissionScope(Long clanId, Long actorId, String permission) {
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) return AccessScope.full();
        RbacAuthorizationApplicationService.PermissionDataScope scope =
                rbacAuthorizationApplicationService.permissionDataScope(actorId, clanId, permission);
        return new AccessScope(scope.fullClanAccess(), scope.visibleBranchIds());
    }

    private void requireBranchInClan(Long clanId, Long branchId) {
        if (branchId != null && branchRepository.findByIdAndClanId(branchId, clanId).isEmpty()) {
            throw new BusinessException("CULTURE_SITE_BRANCH_INVALID", "支派不属于当前宗族");
        }
    }

    private void validateRelatedPerson(Long clanId, Long branchId, Long personId) {
        if (personId == null) return;
        PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException("CULTURE_SITE_PERSON_INVALID", "关联人物不存在"));
        if (!Objects.equals(person.getClanId(), clanId)) {
            throw new BusinessException("CULTURE_SITE_PERSON_CLAN_MISMATCH", "关联人物不属于当前宗族");
        }
        if (branchId != null && person.getBranchId() != null
                && !branchRepository.isDescendantOrSelf(clanId, branchId, person.getBranchId())) {
            throw new BusinessException("CULTURE_SITE_PERSON_BRANCH_MISMATCH", "关联人物不属于场所支派或其下级支派");
        }
    }

    private CultureSourceSummaryResponse toSourceSummary(SourceBindingEntity binding, SourceEntity source, boolean sensitiveAccess) {
        if (source == null || STATUS_ARCHIVED.equals(source.getVerificationStatus())) return null;
        boolean restricted = RESTRICTED_PRIVACY.contains(normalize(source.getPrivacyLevel()));
        return new CultureSourceSummaryResponse(
                source.getId(), source.getSourceName(), source.getSourceType(),
                restricted && !sensitiveAccess ? null : binding.getExcerpt(),
                binding.getConfidenceLevel(), binding.getBindingStatus()
        );
    }

    private CultureAttachmentSummaryResponse toAttachmentSummary(SourceAttachmentEntity attachment, boolean canPreview, boolean canDownload) {
        return new CultureAttachmentSummaryResponse(
                attachment.getId(), attachment.getOriginalFilename(), attachment.getContentType(), attachment.getFileSize(),
                canPreview, canDownload
        );
    }

    private CultureReviewSummaryResponse latestReview(CultureSiteEntity site) {
        RevisionEntity revision = revisionRepository
                .findFirstByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(site.getClanId(), TARGET_TYPE, site.getId())
                .orElse(null);
        if (revision == null) return CultureReviewSummaryResponse.empty();
        ReviewTaskEntity task = reviewTaskRepository.findFirstByRevisionIdOrderByReviewLevelAsc(revision.getId()).orElse(null);
        return new CultureReviewSummaryResponse(
                task == null ? null : task.getId(),
                task == null ? revision.getStatus() : task.getStatus(),
                userName(revision.getSubmitterId()),
                task == null ? null : userName(task.getReviewerId()),
                revision.getSubmitTime(),
                task == null ? null : task.getReviewedAt(),
                revision.getRejectedReason()
        );
    }

    private String userName(Long userId) {
        if (userId == null) return null;
        return appUserRepository.findById(userId).map(AppUserEntity::getDisplayName).orElse(null);
    }

    private ClanEntity requireClan(Long clanId) {
        return clanRepository.findById(clanId).orElseThrow(() -> new BusinessException("CLAN_NOT_FOUND", "宗族不存在"));
    }

    private Map<Long, Integer> countMap(Collection<TargetCountProjection> counts) {
        Map<Long, Integer> result = new LinkedHashMap<>();
        counts.forEach(item -> result.put(item.getTargetId(), Math.toIntExact(item.getCount())));
        return result;
    }

    private void addContains(List<Predicate> predicates, jakarta.persistence.criteria.Path<String> path, String value, jakarta.persistence.criteria.CriteriaBuilder cb) {
        if (value != null) predicates.add(cb.like(cb.lower(cb.coalesce(path, "")), "%" + value.toLowerCase(Locale.ROOT) + "%"));
    }

    private void record(CultureSiteEntity site, Long actorId, String action, String summary, String detail, String requestId, String clientIp) {
        operationLogApplicationService.record(site.getClanId(), actorId, action, TARGET_TYPE, site.getId(), summary, detail, requestId, clientIp);
    }

    private String safeSnapshot(CultureSiteEntity site) {
        return "type=" + site.getSiteType()
                + "; nameLength=" + (site.getSiteName() == null ? 0 : site.getSiteName().length())
                + "; branchId=" + site.getBranchId()
                + "; personId=" + site.getRelatedPersonId()
                + "; hasAddress=" + (site.getAddressText() != null)
                + "; hasCoordinates=" + (site.getLatitude() != null && site.getLongitude() != null)
                + "; status=" + site.getDataStatus()
                + "; privacy=" + site.getPrivacyLevel()
                + "; featured=" + site.isFeaturedOnHome()
                + "; version=" + site.getVersion();
    }

    private BusinessException notFound() {
        return new BusinessException("CULTURE_SITE_NOT_FOUND", "文化场所不存在或不可见");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private record Aggregation(
            Map<Long, Integer> sourceCounts,
            Map<Long, Integer> attachmentCounts,
            Map<Long, String> branchNames,
            Map<Long, String> personNames
    ) {}

    private record AccessScope(boolean fullClanAccess, Set<Long> branchIds) {
        private AccessScope {
            branchIds = branchIds == null ? Set.of() : Set.copyOf(branchIds);
        }
        static AccessScope full() { return new AccessScope(true, Set.of()); }
        boolean hasAnyAccess() { return fullClanAccess || !branchIds.isEmpty(); }
        boolean canReadBranch(Long branchId) { return fullClanAccess || branchId == null || branchIds.contains(branchId); }
    }
}
