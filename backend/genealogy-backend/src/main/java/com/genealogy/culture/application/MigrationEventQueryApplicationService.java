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
import com.genealogy.culture.domain.MigrationEventDomainService;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.dto.CulturePageMetadata;
import com.genealogy.culture.dto.CultureReviewSummaryResponse;
import com.genealogy.culture.dto.CultureScopeResponse;
import com.genealogy.culture.dto.CultureSourceSummaryResponse;
import com.genealogy.culture.dto.MigrationEventDetailResponse;
import com.genealogy.culture.dto.MigrationEventPageResponse;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import com.genealogy.culture.dto.MigrationEventSummaryResponse;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
public class MigrationEventQueryApplicationService {

    private static final String TARGET_TYPE = MigrationEventGovernanceApplicationService.TARGET_TYPE;
    private static final String BINDING_ARCHIVED = "archived";
    private static final String SOURCE_UPDATE_PERMISSION = "source:update";
    private static final Set<String> RESTRICTED_PRIVACY = Set.of("relatives_only", "private", "sealed");

    private final MigrationEventRepository eventRepository;
    private final MigrationEventDomainService domainService;
    private final MigrationEventPermissionPolicyService permissionPolicy;
    private final MigrationEventGovernanceApplicationService governanceService;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final PersonRepository personRepository;
    private final AppUserRepository userRepository;
    private final SourceBindingRepository bindingRepository;
    private final SourceRepository sourceRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final AuthorizationApplicationService authorizationService;
    private final RbacAuthorizationApplicationService rbacService;

    public MigrationEventQueryApplicationService(
            MigrationEventRepository eventRepository,
            MigrationEventDomainService domainService,
            MigrationEventPermissionPolicyService permissionPolicy,
            MigrationEventGovernanceApplicationService governanceService,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            PersonRepository personRepository,
            AppUserRepository userRepository,
            SourceBindingRepository bindingRepository,
            SourceRepository sourceRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            AuthorizationApplicationService authorizationService,
            RbacAuthorizationApplicationService rbacService
    ) {
        this.eventRepository = eventRepository;
        this.domainService = domainService;
        this.permissionPolicy = permissionPolicy;
        this.governanceService = governanceService;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.bindingRepository = bindingRepository;
        this.sourceRepository = sourceRepository;
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.authorizationService = authorizationService;
        this.rbacService = rbacService;
    }

    @Transactional(readOnly = true)
    public MigrationEventPageResponse search(
            Long clanId,
            MigrationEventSearchCriteria criteria,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        ClanEntity clan = requireClan(clanId);
        authorizationService.requireClanMember(clanId, actorId);
        MigrationEventSearchCriteria normalized = domainService.normalize(criteria);
        List<BranchEntity> branches = branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId);
        Map<Long, BranchEntity> branchesById = branches.stream()
                .collect(Collectors.toMap(BranchEntity::getId, Function.identity()));
        List<Long> readableBranchIds = branchIdsWithPermission(
                branches, actorId, clanId, MigrationEventPermissionPolicyService.VIEW
        );
        if (readableBranchIds.isEmpty()) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看迁徙事件");
        }
        if (normalized.branchId() != null && !readableBranchIds.contains(normalized.branchId())) {
            throw notFound();
        }
        List<Long> sensitiveBranchIds = branchIdsWithPermission(
                branches, actorId, clanId, MigrationEventPermissionPolicyService.VIEW_SENSITIVE
        );
        int safePageNo = Math.max(1, pageNo);
        int safePageSize = Math.max(1, Math.min(pageSize, MigrationEventDomainService.MAX_PAGE_SIZE));
        Sort.Direction direction = domainService.sortAscending(normalized.sort())
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(direction, domainService.sortField(normalized.sort()))
                .and(Sort.by(Sort.Direction.ASC, "branchId"))
                .and(Sort.by(Sort.Direction.ASC, "sequenceNo"))
                .and(Sort.by(Sort.Direction.ASC, "id"));
        Page<MigrationEventEntity> page = eventRepository.findAll(
                specification(clanId, actorId, normalized, readableBranchIds, sensitiveBranchIds),
                PageRequest.of(safePageNo - 1, safePageSize, sort)
        );
        List<MigrationEventEntity> rows = page.getContent();
        Map<Long, PersonEntity> founders = personRepository.findAllById(
                        rows.stream().map(MigrationEventEntity::getFounderPersonId)
                                .filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(person -> Objects.equals(person.getClanId(), clanId) && person.getDeletedAt() == null)
                .collect(Collectors.toMap(PersonEntity::getId, Function.identity()));
        Map<Long, Integer> sourceCounts = countMap(rows.isEmpty() ? List.of()
                : bindingRepository.countActiveByTargets(
                        clanId, TARGET_TYPE, rows.stream().map(MigrationEventEntity::getId).toList(), BINDING_ARCHIVED));
        List<MigrationEventSummaryResponse> items = rows.stream()
                .map(event -> toSummary(
                        event, clan, branchesById.get(event.getBranchId()),
                        founders.get(event.getFounderPersonId()), sourceCounts.getOrDefault(event.getId(), 0), actorId))
                .toList();
        return new MigrationEventPageResponse(
                items,
                new CulturePageMetadata(safePageNo, safePageSize, page.getTotalElements(), page.getTotalPages())
        );
    }

    @Transactional(readOnly = true)
    public MigrationEventDetailResponse getDetail(Long eventId, Long actorId) {
        MigrationEventEntity event = eventRepository.findByIdAndDeletedAtIsNull(eventId)
                .orElseThrow(this::notFound);
        permissionPolicy.requireVisible(event, actorId);
        ClanEntity clan = requireClan(event.getClanId());
        BranchEntity branch = branchRepository.findByIdAndClanId(event.getBranchId(), event.getClanId())
                .orElseThrow(this::notFound);
        PersonEntity founder = event.getFounderPersonId() == null ? null
                : personRepository.findByIdAndDeletedAtIsNull(event.getFounderPersonId()).orElse(null);
        if (founder != null && !Objects.equals(founder.getClanId(), event.getClanId())) founder = null;

        List<SourceBindingEntity> bindings = bindingRepository
                .findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                        event.getClanId(), TARGET_TYPE, event.getId(), BINDING_ARCHIVED);
        Map<Long, SourceEntity> sourcesById = sourceRepository.findAllById(
                        bindings.stream().map(SourceBindingEntity::getSourceId)
                                .filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(source -> Objects.equals(source.getClanId(), event.getClanId()))
                .collect(Collectors.toMap(SourceEntity::getId, Function.identity()));
        boolean canManageSources = canOnBranch(
                actorId, event.getClanId(), event.getBranchId(), SOURCE_UPDATE_PERMISSION
        );
        List<CultureSourceSummaryResponse> sources = bindings.stream()
                .map(binding -> sourceSummary(binding, sourcesById.get(binding.getSourceId()), canManageSources))
                .filter(Objects::nonNull)
                .toList();
        MigrationEventSummaryResponse summary = toSummary(
                event, clan, branch, founder, sources.size(), actorId
        );
        return new MigrationEventDetailResponse(
                summary.id(), summary.scope(), summary.sequenceNo(), summary.fromLocation(), summary.toLocation(),
                summary.migrationTimeText(), summary.founderPersonId(), summary.founderPersonName(), summary.reason(),
                summary.confidenceLevel(), summary.privacyLevel(), summary.sensitiveLevel(), summary.dataStatus(),
                summary.sourceCount(), summary.allowedActions(), summary.version(), summary.createdAt(), summary.updatedAt(),
                event.getDescription(), sources, latestReview(event)
        );
    }

    private CultureSourceSummaryResponse sourceSummary(
            SourceBindingEntity binding,
            SourceEntity source,
            boolean canManageSources
    ) {
        if (source == null || BINDING_ARCHIVED.equals(normalize(source.getVerificationStatus()))) return null;
        boolean restricted = RESTRICTED_PRIVACY.contains(normalize(source.getPrivacyLevel()));
        String excerpt = restricted && !canManageSources
                ? null
                : binding.getExcerpt() == null ? source.getExcerpt() : binding.getExcerpt();
        return new CultureSourceSummaryResponse(
                source.getId(), source.getSourceName(), source.getSourceType(), excerpt,
                binding.getConfidenceLevel(), binding.getBindingStatus()
        );
    }

    private MigrationEventSummaryResponse toSummary(
            MigrationEventEntity event,
            ClanEntity clan,
            BranchEntity branch,
            PersonEntity founder,
            int sourceCount,
            Long actorId
    ) {
        boolean pending = governanceService.hasPendingRevision(event.getId());
        return new MigrationEventSummaryResponse(
                event.getId(),
                new CultureScopeResponse(
                        clan.getId(), clan.getClanName(), event.getBranchId(),
                        branch == null ? null : branch.getBranchName()),
                event.getSequenceNo(), event.getFromLocation(), event.getToLocation(),
                event.getMigrationTimeText(), event.getFounderPersonId(), founder == null ? null : founder.getName(),
                event.getReason(), event.getConfidenceLevel(), event.getPrivacyLevel(), event.getSensitiveLevel(),
                event.getDataStatus(), sourceCount, permissionPolicy.allowedActions(event, actorId, pending),
                event.getVersion(), event.getCreatedAt(), event.getUpdatedAt()
        );
    }

    private Specification<MigrationEventEntity> specification(
            Long clanId,
            Long actorId,
            MigrationEventSearchCriteria criteria,
            Collection<Long> readableBranchIds,
            Collection<Long> sensitiveBranchIds
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("clanId"), clanId));
            predicates.add(cb.isNull(root.get("deletedAt")));
            predicates.add(root.get("branchId").in(readableBranchIds));
            if (criteria.branchId() != null) predicates.add(cb.equal(root.get("branchId"), criteria.branchId()));
            if (criteria.founderPersonId() != null) predicates.add(cb.equal(root.get("founderPersonId"), criteria.founderPersonId()));
            if (criteria.dataStatus() != null) predicates.add(cb.equal(root.get("dataStatus"), criteria.dataStatus()));
            if (criteria.privacyLevel() != null) predicates.add(cb.equal(root.get("privacyLevel"), criteria.privacyLevel()));
            contains(predicates, root.get("fromLocation"), criteria.fromLocation(), cb);
            contains(predicates, root.get("toLocation"), criteria.toLocation(), cb);
            contains(predicates, root.get("migrationTimeText"), criteria.migrationTimeText(), cb);
            if (criteria.keyword() != null) {
                String pattern = "%" + criteria.keyword().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fromLocation")), pattern),
                        cb.like(cb.lower(root.get("toLocation")), pattern),
                        cb.like(cb.lower(root.get("migrationTimeText")), pattern),
                        cb.like(cb.lower(root.get("reason")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)
                ));
            }
            Predicate unrestricted = cb.and(
                    cb.not(root.get("privacyLevel").in(RESTRICTED_PRIVACY)),
                    cb.notEqual(root.get("sensitiveLevel"), "sensitive"),
                    cb.notEqual(root.get("sensitiveLevel"), "highly_sensitive")
            );
            List<Predicate> visibility = new ArrayList<>();
            visibility.add(unrestricted);
            visibility.add(cb.equal(root.get("createdBy"), actorId));
            if (!sensitiveBranchIds.isEmpty()) visibility.add(root.get("branchId").in(sensitiveBranchIds));
            predicates.add(cb.or(visibility.toArray(Predicate[]::new)));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private CultureReviewSummaryResponse latestReview(MigrationEventEntity event) {
        RevisionEntity revision = revisionRepository
                .findFirstByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                        event.getClanId(), TARGET_TYPE, event.getId())
                .orElse(null);
        if (revision == null) return CultureReviewSummaryResponse.empty();
        ReviewTaskEntity task = reviewTaskRepository
                .findFirstByRevisionIdOrderByReviewLevelAsc(revision.getId()).orElse(null);
        return new CultureReviewSummaryResponse(
                task == null ? null : task.getId(), task == null ? revision.getStatus() : task.getStatus(),
                userName(revision.getSubmitterId()), task == null ? null : userName(task.getReviewerId()),
                revision.getSubmitTime(), task == null ? null : task.getReviewedAt(), revision.getRejectedReason()
        );
    }

    private String userName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(AppUserEntity::getDisplayName)
                .filter(name -> name != null && !name.isBlank()).orElse(null);
    }

    private ClanEntity requireClan(Long clanId) {
        return clanRepository.findById(clanId)
                .orElseThrow(() -> new BusinessException("CLAN_NOT_FOUND", "宗族不存在"));
    }

    private List<Long> branchIdsWithPermission(
            List<BranchEntity> branches,
            Long actorId,
            Long clanId,
            String permission
    ) {
        return branches.stream().filter(branch -> canOnBranch(actorId, clanId, branch.getId(), permission))
                .map(BranchEntity::getId).toList();
    }

    private boolean canOnBranch(Long actorId, Long clanId, Long branchId, String permission) {
        return authorizationService.isCrossClanAdmin(actorId)
                || rbacService.hasPermission(
                        actorId, clanId, permission, MemberRoleScopeType.branch, branchId
                );
    }

    private void contains(
            List<Predicate> predicates,
            jakarta.persistence.criteria.Path<String> path,
            String value,
            jakarta.persistence.criteria.CriteriaBuilder cb
    ) {
        if (value != null) predicates.add(cb.like(cb.lower(path), "%" + value.toLowerCase(Locale.ROOT) + "%"));
    }

    private Map<Long, Integer> countMap(List<TargetCountProjection> counts) {
        Map<Long, Integer> result = new LinkedHashMap<>();
        counts.forEach(item -> result.put(item.getTargetId(), Math.toIntExact(item.getCount())));
        return result;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private BusinessException notFound() {
        return new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见");
    }
}
