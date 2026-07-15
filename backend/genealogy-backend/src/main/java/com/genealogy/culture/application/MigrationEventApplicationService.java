package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.persistence.TargetCountProjection;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.domain.MigrationEventDomainService;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CulturePageMetadata;
import com.genealogy.culture.dto.CultureReviewSummaryResponse;
import com.genealogy.culture.dto.CultureSourceSummaryResponse;
import com.genealogy.culture.dto.MigrationEventCreateRequest;
import com.genealogy.culture.dto.MigrationEventDetailResponse;
import com.genealogy.culture.dto.MigrationEventPageResponse;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import com.genealogy.culture.dto.MigrationEventSummaryResponse;
import com.genealogy.culture.dto.MigrationEventUpdateRequest;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.operationlog.application.OperationLogApplicationService;
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
public class MigrationEventApplicationService {

    public static final String TARGET_TYPE = "migration_event";
    private static final String STATUS_ARCHIVED = "archived";
    private static final Set<String> RESTRICTED_PRIVACY = Set.of("relatives_only", "private", "sealed");
    private static final Set<String> PENDING_CHANGE_TYPES = Set.of(
            MigrationEventGovernanceApplicationService.CHANGE_PUBLISH,
            MigrationEventGovernanceApplicationService.CHANGE_UPDATE,
            MigrationEventGovernanceApplicationService.CHANGE_DELETE,
            MigrationEventGovernanceApplicationService.CHANGE_ARCHIVE
    );

    private final MigrationEventRepository migrationEventRepository;
    private final MigrationEventDomainService domainService;
    private final MigrationEventMapper mapper;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final PersonRepository personRepository;
    private final AppUserRepository appUserRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final SourceRepository sourceRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private final MigrationEventPermissionPolicyService permissionPolicyService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final MigrationEventGovernanceApplicationService governanceApplicationService;

    public MigrationEventApplicationService(
            MigrationEventRepository migrationEventRepository,
            MigrationEventDomainService domainService,
            MigrationEventMapper mapper,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            PersonRepository personRepository,
            AppUserRepository appUserRepository,
            SourceBindingRepository sourceBindingRepository,
            SourceRepository sourceRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            MigrationEventPermissionPolicyService permissionPolicyService,
            OperationLogApplicationService operationLogApplicationService,
            MigrationEventGovernanceApplicationService governanceApplicationService
    ) {
        this.migrationEventRepository = migrationEventRepository;
        this.domainService = domainService;
        this.mapper = mapper;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.personRepository = personRepository;
        this.appUserRepository = appUserRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.sourceRepository = sourceRepository;
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
        this.permissionPolicyService = permissionPolicyService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.governanceApplicationService = governanceApplicationService;
    }

    @Transactional
    public MigrationEventDetailResponse create(
            Long clanId,
            MigrationEventCreateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        ClanEntity clan = requireClan(clanId);
        authorizationApplicationService.requireClanMember(clanId, actorId);
        MigrationEventDomainService.NormalizedMigrationEventInput input = domainService.normalize(request);
        PermissionDataScope writeScope = requireScope(clanId, actorId, CulturePermissionPolicyService.CREATE);
        BranchEntity branch = requireBranch(clanId, input.branchId());
        requireWriteScope(writeScope, branch.getId());
        PersonEntity founder = requireFounder(clanId, branch.getId(), input.founderPersonId(), writeScope);
        requireSequenceAvailable(clanId, branch.getId(), input.sequenceNo(), null);

        MigrationEventEntity entity = new MigrationEventEntity();
        entity.setClanId(clanId);
        entity.setDataStatus(MigrationEventDomainService.STATUS_DRAFT);
        entity.setCreatedBy(actorId);
        domainService.apply(entity, input);
        MigrationEventEntity saved = migrationEventRepository.save(entity);
        record(saved, actorId, "migration_event_create", "新增迁徙事件草稿", safeSnapshot(saved), requestId, clientIp);
        return buildDetail(saved, clan, actorId, founder);
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
        authorizationApplicationService.requireClanMember(clanId, actorId);
        PermissionDataScope readScope = requireScope(clanId, actorId, CulturePermissionPolicyService.VIEW);
        PermissionDataScope sensitiveScope = scope(clanId, actorId, CulturePermissionPolicyService.VIEW_SENSITIVE);
        PermissionDataScope updateScope = scope(clanId, actorId, CulturePermissionPolicyService.UPDATE);
        PermissionDataScope deleteScope = scope(clanId, actorId, CulturePermissionPolicyService.DELETE);
        PermissionDataScope submitScope = scope(clanId, actorId, CulturePermissionPolicyService.SUBMIT_REVIEW);
        PermissionDataScope archiveScope = scope(clanId, actorId, CulturePermissionPolicyService.ARCHIVE);
        MigrationEventSearchCriteria normalized = domainService.normalize(criteria);
        if (normalized.branchId() != null) {
            requireBranch(clanId, normalized.branchId());
            if (!readScope.canAccessBranch(normalized.branchId())) throw notFound();
        }
        if (normalized.founderPersonId() != null) {
            PersonEntity founder = personRepository.findByIdAndDeletedAtIsNull(normalized.founderPersonId())
                    .filter(person -> Objects.equals(person.getClanId(), clanId))
                    .orElseThrow(this::notFound);
            if (founder.getBranchId() != null && !readScope.canAccessBranch(founder.getBranchId())) throw notFound();
        }

        int safePageNo = Math.max(1, pageNo);
        int safePageSize = Math.max(1, Math.min(pageSize, MigrationEventDomainService.MAX_PAGE_SIZE));
        Sort.Direction direction = domainService.sortAscending(normalized.sort()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(direction, domainService.sortField(normalized.sort()));
        if (!"branchId".equals(domainService.sortField(normalized.sort()))) {
            sort = sort.and(Sort.by(Sort.Direction.ASC, "branchId"));
        }
        if (!"sequenceNo".equals(domainService.sortField(normalized.sort()))) {
            sort = sort.and(Sort.by(Sort.Direction.ASC, "sequenceNo"));
        }
        sort = sort.and(Sort.by(Sort.Direction.DESC, "id"));
        PageRequest pageRequest = PageRequest.of(safePageNo - 1, safePageSize, sort);
        Page<MigrationEventEntity> result = migrationEventRepository.findAll(
                buildSearchSpecification(clanId, actorId, normalized, readScope, sensitiveScope),
                pageRequest
        );
        AggregationContext aggregation = aggregate(clan, result.getContent());
        Set<Long> pendingIds = pendingIds(result.getContent());
        List<MigrationEventSummaryResponse> items = result.getContent().stream()
                .map(event -> toSummary(
                        event, clan, aggregation, pendingIds.contains(event.getId()),
                        updateScope, deleteScope, submitScope, archiveScope, sensitiveScope
                ))
                .toList();
        return new MigrationEventPageResponse(
                items,
                new CulturePageMetadata(safePageNo, safePageSize, result.getTotalElements(), result.getTotalPages())
        );
    }

    @Transactional(readOnly = true)
    public MigrationEventDetailResponse getDetail(Long migrationEventId, Long actorId) {
        MigrationEventEntity event = requireVisible(migrationEventId, actorId);
        return buildDetail(event, requireClan(event.getClanId()), actorId, null);
    }

    @Transactional
    public MigrationEventDetailResponse update(
            Long migrationEventId,
            MigrationEventUpdateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        MigrationEventEntity event = requireVisible(migrationEventId, actorId);
        permissionPolicyService.requireAction(event, actorId, CulturePermissionPolicyService.UPDATE);
        domainService.requireExpectedVersion(event, request.version());
        MigrationEventDomainService.NormalizedMigrationEventInput input = domainService.normalize(request);
        PermissionDataScope writeScope = requireScope(event.getClanId(), actorId, CulturePermissionPolicyService.UPDATE);
        requireWriteScope(writeScope, event.getBranchId());
        BranchEntity branch = requireBranch(event.getClanId(), input.branchId());
        requireWriteScope(writeScope, branch.getId());
        requireFounder(event.getClanId(), branch.getId(), input.founderPersonId(), writeScope);
        requireSequenceAvailable(event.getClanId(), branch.getId(), input.sequenceNo(), event.getId());
        if (MigrationEventDomainService.STATUS_OFFICIAL.equals(domainService.normalizeStatus(event.getDataStatus()))) {
            governanceApplicationService.submitOfficialUpdate(event, request, actorId, requestId, clientIp);
            return getDetail(migrationEventId, actorId);
        }
        domainService.requireDirectlyMutable(event);
        String before = safeSnapshot(event);
        domainService.apply(event, input);
        MigrationEventEntity saved = migrationEventRepository.save(event);
        record(saved, actorId, "migration_event_update", "更新迁徙事件草稿", "before=" + before + "; after=" + safeSnapshot(saved), requestId, clientIp);
        return buildDetail(saved, requireClan(saved.getClanId()), actorId, null);
    }

    @Transactional
    public CultureCommandResponse delete(
            Long migrationEventId,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        MigrationEventEntity event = requireVisible(migrationEventId, actorId);
        permissionPolicyService.requireAction(event, actorId, CulturePermissionPolicyService.DELETE);
        if (MigrationEventDomainService.STATUS_OFFICIAL.equals(domainService.normalizeStatus(event.getDataStatus()))) {
            return governanceApplicationService.submitOfficialDelete(event, actorId, requestId, clientIp);
        }
        domainService.requireDirectlyMutable(event);
        event.setDeletedAt(OffsetDateTime.now());
        MigrationEventEntity saved = migrationEventRepository.save(event);
        record(saved, actorId, "migration_event_delete", "删除迁徙事件草稿", safeSnapshot(saved), requestId, clientIp);
        return new CultureCommandResponse(TARGET_TYPE, saved.getId(), "deleted", null, "迁徙事件已删除");
    }

    private MigrationEventDetailResponse buildDetail(
            MigrationEventEntity event,
            ClanEntity clan,
            Long actorId,
            PersonEntity knownFounder
    ) {
        PermissionDataScope updateScope = scope(event.getClanId(), actorId, CulturePermissionPolicyService.UPDATE);
        PermissionDataScope deleteScope = scope(event.getClanId(), actorId, CulturePermissionPolicyService.DELETE);
        PermissionDataScope submitScope = scope(event.getClanId(), actorId, CulturePermissionPolicyService.SUBMIT_REVIEW);
        PermissionDataScope archiveScope = scope(event.getClanId(), actorId, CulturePermissionPolicyService.ARCHIVE);
        PermissionDataScope sensitiveScope = scope(event.getClanId(), actorId, CulturePermissionPolicyService.VIEW_SENSITIVE);
        AggregationContext aggregation = aggregate(clan, List.of(event));
        boolean reviewPending = governanceApplicationService.hasPendingRevision(event.getId());
        MigrationEventSummaryResponse summary = toSummary(
                event, clan, aggregation, reviewPending,
                updateScope, deleteScope, submitScope, archiveScope, sensitiveScope
        );
        if (knownFounder != null && Objects.equals(knownFounder.getId(), event.getFounderPersonId())) {
            summary = new MigrationEventSummaryResponse(
                    summary.id(), summary.scope(), summary.sequenceNo(), summary.fromLocation(), summary.toLocation(),
                    summary.migrationTimeText(), summary.founderPersonId(), knownFounder.getName(), summary.reason(),
                    summary.confidenceLevel(), summary.privacyLevel(), summary.sensitiveLevel(), summary.dataStatus(),
                    summary.sourceCount(), summary.allowedActions(), summary.version(), summary.createdAt(), summary.updatedAt()
            );
        }
        List<SourceBindingEntity> bindings = sourceBindingRepository
                .findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                        event.getClanId(), TARGET_TYPE, event.getId(), STATUS_ARCHIVED
                );
        Map<Long, SourceEntity> sourceMap = sourceRepository.findAllById(
                        bindings.stream().map(SourceBindingEntity::getSourceId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(source -> Objects.equals(source.getClanId(), event.getClanId()))
                .collect(Collectors.toMap(SourceEntity::getId, Function.identity()));
        boolean canManage = updateScope.canAccessBranch(event.getBranchId());
        List<CultureSourceSummaryResponse> sources = bindings.stream()
                .map(binding -> toSourceSummary(binding, sourceMap.get(binding.getSourceId()), canManage))
                .filter(Objects::nonNull)
                .toList();
        return mapper.toDetail(summary, event.getDescription(), sources, latestReview(event));
    }

    private AggregationContext aggregate(ClanEntity clan, List<MigrationEventEntity> rows) {
        List<Long> ids = rows.stream().map(MigrationEventEntity::getId).filter(Objects::nonNull).toList();
        Map<Long, Integer> sourceCounts = countMap(ids.isEmpty() ? List.of()
                : sourceBindingRepository.countActiveByTargets(clan.getId(), TARGET_TYPE, ids, STATUS_ARCHIVED));
        Map<Long, String> branchNames = branchRepository.findAllById(rows.stream()
                        .map(MigrationEventEntity::getBranchId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(branch -> Objects.equals(branch.getClanId(), clan.getId()))
                .collect(Collectors.toMap(BranchEntity::getId, BranchEntity::getBranchName));
        Map<Long, String> founderNames = personRepository.findAllById(rows.stream()
                        .map(MigrationEventEntity::getFounderPersonId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .filter(person -> Objects.equals(person.getClanId(), clan.getId()) && person.getDeletedAt() == null)
                .collect(Collectors.toMap(PersonEntity::getId, PersonEntity::getName));
        return new AggregationContext(sourceCounts, branchNames, founderNames);
    }

    private MigrationEventSummaryResponse toSummary(
            MigrationEventEntity event,
            ClanEntity clan,
            AggregationContext aggregation,
            boolean reviewPending,
            PermissionDataScope updateScope,
            PermissionDataScope deleteScope,
            PermissionDataScope submitScope,
            PermissionDataScope archiveScope,
            PermissionDataScope sensitiveScope
    ) {
        LinkedHashSet<String> actions = new LinkedHashSet<>();
        actions.add("view");
        String status = domainService.normalizeStatus(event.getDataStatus());
        if ((MigrationEventDomainService.STATUS_DRAFT.equals(status) || MigrationEventDomainService.STATUS_REJECTED.equals(status)) && !reviewPending) {
            addIf(actions, "update", updateScope.canAccessBranch(event.getBranchId()));
            addIf(actions, "delete", deleteScope.canAccessBranch(event.getBranchId()));
            addIf(actions, "submit_review", submitScope.canAccessBranch(event.getBranchId()));
            addIf(actions, "archive", archiveScope.canAccessBranch(event.getBranchId()));
        } else if (MigrationEventDomainService.STATUS_OFFICIAL.equals(status) && !reviewPending) {
            addIf(actions, "request_update", updateScope.canAccessBranch(event.getBranchId()));
            addIf(actions, "request_delete", deleteScope.canAccessBranch(event.getBranchId()));
            addIf(actions, "request_archive", archiveScope.canAccessBranch(event.getBranchId()));
        }
        addIf(actions, "view_sensitive", Objects.equals(event.getCreatedBy(), null)
                ? sensitiveScope.canAccessBranch(event.getBranchId())
                : sensitiveScope.canAccessBranch(event.getBranchId()));
        return mapper.toSummary(
                event,
                clan.getClanName(),
                aggregation.branchNames().get(event.getBranchId()),
                aggregation.founderNames().get(event.getFounderPersonId()),
                aggregation.sourceCounts().getOrDefault(event.getId(), 0),
                List.copyOf(actions)
        );
    }

    private Specification<MigrationEventEntity> buildSearchSpecification(
            Long clanId,
            Long actorId,
            MigrationEventSearchCriteria criteria,
            PermissionDataScope readScope,
            PermissionDataScope sensitiveScope
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("clanId"), clanId));
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (!readScope.fullClanAccess()) predicates.add(root.get("branchId").in(readScope.queryVisibleBranchIds()));
            if (!sensitiveScope.fullClanAccess()) {
                List<Predicate> visible = new ArrayList<>();
                visible.add(cb.and(
                        cb.not(root.get("privacyLevel").in(RESTRICTED_PRIVACY)),
                        cb.equal(root.get("sensitiveLevel"), "normal")
                ));
                visible.add(cb.equal(root.get("createdBy"), actorId));
                if (!sensitiveScope.visibleBranchIds().isEmpty()) {
                    visible.add(root.get("branchId").in(sensitiveScope.queryVisibleBranchIds()));
                }
                predicates.add(cb.or(visible.toArray(Predicate[]::new)));
            }
            if (criteria.keyword() != null) {
                String pattern = pattern(criteria.keyword());
                predicates.add(cb.or(
                        like(cb, root, "fromLocation", pattern), like(cb, root, "toLocation", pattern),
                        like(cb, root, "migrationTimeText", pattern), like(cb, root, "reason", pattern),
                        like(cb, root, "description", pattern)
                ));
            }
            if (criteria.branchId() != null) predicates.add(cb.equal(root.get("branchId"), criteria.branchId()));
            if (criteria.fromLocation() != null) predicates.add(like(cb, root, "fromLocation", pattern(criteria.fromLocation())));
            if (criteria.toLocation() != null) predicates.add(like(cb, root, "toLocation", pattern(criteria.toLocation())));
            if (criteria.migrationTimeText() != null) predicates.add(like(cb, root, "migrationTimeText", pattern(criteria.migrationTimeText())));
            if (criteria.founderPersonId() != null) predicates.add(cb.equal(root.get("founderPersonId"), criteria.founderPersonId()));
            if (criteria.dataStatus() != null) predicates.add(cb.equal(root.get("dataStatus"), criteria.dataStatus()));
            if (criteria.privacyLevel() != null) predicates.add(cb.equal(root.get("privacyLevel"), criteria.privacyLevel()));
            if (criteria.hasSource() != null) {
                Predicate exists = cb.exists(sourceBindingSubquery(root, query, cb, clanId));
                predicates.add(criteria.hasSource() ? exists : cb.not(exists));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Subquery<Long> sourceBindingSubquery(
            Root<MigrationEventEntity> root,
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

    private MigrationEventEntity requireVisible(Long id, Long actorId) {
        MigrationEventEntity event = migrationEventRepository.findByIdAndDeletedAtIsNull(id).orElseThrow(this::notFound);
        permissionPolicyService.requireVisible(event, actorId);
        return event;
    }

    private ClanEntity requireClan(Long clanId) {
        return clanRepository.findById(clanId)
                .orElseThrow(() -> new BusinessException("CLAN_NOT_FOUND", "宗族不存在"));
    }

    private BranchEntity requireBranch(Long clanId, Long branchId) {
        return branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_BRANCH_INVALID", "支派不属于当前宗族"));
    }

    private PersonEntity requireFounder(
            Long clanId,
            Long eventBranchId,
            Long founderPersonId,
            PermissionDataScope writeScope
    ) {
        if (founderPersonId == null) return null;
        PersonEntity founder = personRepository.findByIdAndDeletedAtIsNull(founderPersonId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_FOUNDER_NOT_FOUND", "始迁祖不存在或不可用"));
        if (!Objects.equals(founder.getClanId(), clanId)) {
            throw new BusinessException("MIGRATION_EVENT_FOUNDER_CLAN_MISMATCH", "始迁祖不属于当前宗族");
        }
        if (founder.getBranchId() == null
                || !branchRepository.isDescendantOrSelf(clanId, eventBranchId, founder.getBranchId())) {
            throw new BusinessException("MIGRATION_EVENT_FOUNDER_BRANCH_MISMATCH", "始迁祖不属于迁徙事件支派或其下级支派");
        }
        requireWriteScope(writeScope, founder.getBranchId());
        return founder;
    }

    private void requireSequenceAvailable(Long clanId, Long branchId, Integer sequenceNo, Long currentId) {
        boolean conflict = currentId == null
                ? migrationEventRepository.existsByClanIdAndBranchIdAndSequenceNoAndDeletedAtIsNull(clanId, branchId, sequenceNo)
                : migrationEventRepository.existsByClanIdAndBranchIdAndSequenceNoAndIdNotAndDeletedAtIsNull(clanId, branchId, sequenceNo, currentId);
        if (conflict) throw new BusinessException("MIGRATION_EVENT_SEQUENCE_CONFLICT", "同一支派已存在相同迁徙顺序");
    }

    private PermissionDataScope requireScope(Long clanId, Long actorId, String permissionCode) {
        PermissionDataScope value = scope(clanId, actorId, permissionCode);
        if (!value.fullClanAccess() && value.visibleBranchIds().isEmpty()) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限访问迁徙事件");
        }
        return value;
    }

    private PermissionDataScope scope(Long clanId, Long actorId, String permissionCode) {
        return authorizationApplicationService.isCrossClanAdmin(actorId)
                ? PermissionDataScope.full()
                : rbacAuthorizationApplicationService.permissionDataScope(actorId, clanId, permissionCode);
    }

    private void requireWriteScope(PermissionDataScope scope, Long branchId) {
        if (!scope.canAccessBranch(branchId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限维护该支派迁徙事件");
        }
    }

    private Set<Long> pendingIds(List<MigrationEventEntity> rows) {
        List<Long> ids = rows.stream().map(MigrationEventEntity::getId).filter(Objects::nonNull).toList();
        if (ids.isEmpty()) return Set.of();
        return revisionRepository.findByTargetTypeAndTargetIdInAndStatusAndChangeTypeIn(
                        TARGET_TYPE, ids, "pending", PENDING_CHANGE_TYPES)
                .stream().map(RevisionEntity::getTargetId).collect(Collectors.toSet());
    }

    private CultureReviewSummaryResponse latestReview(MigrationEventEntity event) {
        RevisionEntity revision = revisionRepository
                .findFirstByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(event.getClanId(), TARGET_TYPE, event.getId())
                .orElse(null);
        if (revision == null) return CultureReviewSummaryResponse.empty();
        ReviewTaskEntity task = reviewTaskRepository.findFirstByRevisionIdOrderByReviewLevelAsc(revision.getId()).orElse(null);
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        ids.add(revision.getSubmitterId());
        if (task != null) ids.add(task.getReviewerId());
        ids.remove(null);
        Map<Long, String> names = appUserRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(AppUserEntity::getId, AppUserEntity::getDisplayName));
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

    private CultureSourceSummaryResponse toSourceSummary(
            SourceBindingEntity binding,
            SourceEntity source,
            boolean canManage
    ) {
        if (source == null || STATUS_ARCHIVED.equalsIgnoreCase(source.getVerificationStatus())) return null;
        boolean restricted = RESTRICTED_PRIVACY.contains(normalize(source.getPrivacyLevel()));
        return new CultureSourceSummaryResponse(
                source.getId(), source.getSourceName(), source.getSourceType(),
                restricted && !canManage ? null : binding.getExcerpt(),
                binding.getConfidenceLevel(), binding.getBindingStatus()
        );
    }

    private Map<Long, Integer> countMap(Collection<TargetCountProjection> values) {
        Map<Long, Integer> result = new LinkedHashMap<>();
        values.forEach(value -> result.put(value.getTargetId(), Math.toIntExact(value.getCount())));
        return result;
    }

    private Predicate like(CriteriaBuilder cb, Root<MigrationEventEntity> root, String field, String pattern) {
        return cb.like(cb.lower(cb.coalesce(root.get(field), "")), pattern);
    }

    private String pattern(String value) {
        return "%" + value.toLowerCase(Locale.ROOT) + "%";
    }

    private void addIf(LinkedHashSet<String> actions, String action, boolean condition) {
        if (condition) actions.add(action);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String safeSnapshot(MigrationEventEntity event) {
        return "branchId=" + event.getBranchId()
                + ",sequenceNo=" + event.getSequenceNo()
                + ",from=" + event.getFromLocation()
                + ",to=" + event.getToLocation()
                + ",founderPersonId=" + event.getFounderPersonId()
                + ",status=" + event.getDataStatus()
                + ",privacy=" + event.getPrivacyLevel()
                + ",version=" + event.getVersion();
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

    private BusinessException notFound() {
        return new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见");
    }

    private record AggregationContext(
            Map<Long, Integer> sourceCounts,
            Map<Long, String> branchNames,
            Map<Long, String> founderNames
    ) {
    }
}
