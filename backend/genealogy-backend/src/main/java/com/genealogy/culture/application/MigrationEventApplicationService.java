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
import com.genealogy.common.domain.ApprovedStatusPolicy;
import com.genealogy.common.persistence.TargetCountProjection;
import com.genealogy.culture.domain.MigrationEventDomainService;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CulturePageMetadata;
import com.genealogy.culture.dto.CultureReviewSummaryResponse;
import com.genealogy.culture.dto.CultureScopeResponse;
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
public class MigrationEventApplicationService {

    private static final String TARGET_TYPE = MigrationEventGovernanceApplicationService.TARGET_TYPE;
    private static final String BINDING_ARCHIVED = "archived";
    private static final String SOURCE_UPDATE_PERMISSION = "source:update";
    private static final Set<String> RESTRICTED_PRIVACY = Set.of("relatives_only", "private", "sealed");

    private final MigrationEventRepository migrationEventRepository;
    private final MigrationEventDomainService domainService;
    private final MigrationEventPermissionPolicyService permissionPolicyService;
    private final MigrationEventGovernanceApplicationService governanceApplicationService;
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
    private final OperationLogApplicationService operationLogApplicationService;

    public MigrationEventApplicationService(
            MigrationEventRepository migrationEventRepository,
            MigrationEventDomainService domainService,
            MigrationEventPermissionPolicyService permissionPolicyService,
            MigrationEventGovernanceApplicationService governanceApplicationService,
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
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.migrationEventRepository = migrationEventRepository;
        this.domainService = domainService;
        this.permissionPolicyService = permissionPolicyService;
        this.governanceApplicationService = governanceApplicationService;
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
        this.operationLogApplicationService = operationLogApplicationService;
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
        MigrationEventDomainService.NormalizedMigrationInput input = domainService.normalize(request);
        BranchEntity branch = requireBranch(clanId, input.branchId());
        if (!permissionPolicyService.canCreate(clanId, branch.getId(), actorId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限在该支派新增迁徙事件");
        }
        validateFounder(clanId, input.branchId(), input.founderPersonId());
        requireSequenceAvailable(clanId, input.branchId(), input.sequenceNo(), null);

        MigrationEventEntity entity = new MigrationEventEntity();
        entity.setClanId(clanId);
        entity.setCreatedBy(actorId);
        entity.setDataStatus(MigrationEventDomainService.STATUS_DRAFT);
        domainService.apply(entity, input);
        MigrationEventEntity saved = migrationEventRepository.save(entity);
        record(saved, actorId, "migration_event_create", "新增迁徙事件", snapshot(saved), requestId, clientIp);
        return buildDetail(saved, clan, branch, actorId);
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
        MigrationEventSearchCriteria normalized = domainService.normalize(criteria);
        List<BranchEntity> branches = branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId);
        Map<Long, BranchEntity> branchesById = branches.stream()
                .collect(Collectors.toMap(BranchEntity::getId, Function.identity()));
        List<Long> readableBranchIds = branches.stream()
                .filter(branch -> canOnBranch(
                        actorId,
                        clanId,
                        branch.getId(),
                        MigrationEventPermissionPolicyService.VIEW
                ))
                .map(BranchEntity::getId)
                .toList();
        if (readableBranchIds.isEmpty()) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看迁徙事件");
        }
        for (Long branchId : normalized.branchIds()) {
            if (!readableBranchIds.contains(branchId)) {
                throw new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见");
            }
        }
        List<Long> sensitiveBranchIds = branches.stream()
                .filter(branch -> canOnBranch(
                        actorId,
                        clanId,
                        branch.getId(),
                        MigrationEventPermissionPolicyService.VIEW_SENSITIVE
                ))
                .map(BranchEntity::getId)
                .toList();

        int safePageNo = Math.max(1, pageNo);
        int safePageSize = Math.max(1, Math.min(pageSize, MigrationEventDomainService.MAX_PAGE_SIZE));
        Sort.Direction direction = domainService.sortAscending(normalized.sort())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Sort sort = Sort.by(direction, domainService.sortField(normalized.sort()))
                .and(Sort.by(Sort.Direction.ASC, "branchId"))
                .and(Sort.by(Sort.Direction.ASC, "sequenceNo"))
                .and(Sort.by(Sort.Direction.ASC, "id"));
        PageRequest pageRequest = PageRequest.of(safePageNo - 1, safePageSize, sort);
        Page<MigrationEventEntity> page = migrationEventRepository.findAll(
                buildSpecification(clanId, actorId, normalized, readableBranchIds, sensitiveBranchIds),
                pageRequest
        );

        List<MigrationEventEntity> rows = page.getContent();
        Map<Long, PersonEntity> foundersById = personRepository.findAllById(
                        rows.stream()
                                .map(MigrationEventEntity::getFounderPersonId)
                                .filter(Objects::nonNull)
                                .distinct()
                                .toList()
                )
                .stream()
                .filter(person -> Objects.equals(person.getClanId(), clanId) && person.getDeletedAt() == null)
                .collect(Collectors.toMap(PersonEntity::getId, Function.identity()));
        Map<Long, Integer> sourceCounts = countMap(rows.isEmpty()
                ? List.of()
                : sourceBindingRepository.countActiveByTargets(
                        clanId,
                        TARGET_TYPE,
                        rows.stream().map(MigrationEventEntity::getId).toList(),
                        BINDING_ARCHIVED
                ));
        List<MigrationEventSummaryResponse> items = rows.stream()
                .map(event -> toSummary(
                        event,
                        clan,
                        branchesById.get(event.getBranchId()),
                        foundersById.get(event.getFounderPersonId()),
                        sourceCounts.getOrDefault(event.getId(), 0),
                        actorId
                ))
                .toList();
        return new MigrationEventPageResponse(
                items,
                new CulturePageMetadata(safePageNo, safePageSize, page.getTotalElements(), page.getTotalPages())
        );
    }

    @Transactional(readOnly = true)
    public MigrationEventDetailResponse getDetail(Long eventId, Long actorId) {
        MigrationEventEntity event = requireVisible(eventId, actorId);
        return buildDetail(
                event,
                requireClan(event.getClanId()),
                requireBranch(event.getClanId(), event.getBranchId()),
                actorId
        );
    }

    @Transactional
    public MigrationEventDetailResponse update(
            Long eventId,
            MigrationEventUpdateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        MigrationEventEntity event = requireVisible(eventId, actorId);
        permissionPolicyService.requireAction(event, actorId, MigrationEventPermissionPolicyService.UPDATE);
        if (MigrationEventDomainService.STATUS_OFFICIAL.equals(normalize(event.getDataStatus()))) {
            MigrationEventDomainService.NormalizedMigrationInput input = domainService.normalize(request);
            requireBranch(event.getClanId(), input.branchId());
            validateFounder(event.getClanId(), input.branchId(), input.founderPersonId());
            requireSequenceAvailable(event.getClanId(), input.branchId(), input.sequenceNo(), event.getId());
            governanceApplicationService.submitOfficialUpdate(event, request, actorId, requestId, clientIp);
            return getDetail(eventId, actorId);
        }

        domainService.requireDirectlyMutable(event);
        domainService.requireExpectedVersion(event, request.version());
        MigrationEventDomainService.NormalizedMigrationInput input = domainService.normalize(request);
        requireBranch(event.getClanId(), input.branchId());
        if (!canOnBranch(
                actorId,
                event.getClanId(),
                input.branchId(),
                MigrationEventPermissionPolicyService.UPDATE
        )) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限将迁徙事件移动到该支派");
        }
        validateFounder(event.getClanId(), input.branchId(), input.founderPersonId());
        requireSequenceAvailable(event.getClanId(), input.branchId(), input.sequenceNo(), event.getId());
        String before = snapshot(event);
        domainService.apply(event, input);
        MigrationEventEntity saved = migrationEventRepository.save(event);
        record(
                saved,
                actorId,
                "migration_event_update",
                "更新迁徙事件",
                "before=" + before + "; after=" + snapshot(saved),
                requestId,
                clientIp
        );
        return getDetail(saved.getId(), actorId);
    }

    @Transactional
    public CultureCommandResponse delete(
            Long eventId,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        MigrationEventEntity event = requireVisible(eventId, actorId);
        permissionPolicyService.requireAction(event, actorId, MigrationEventPermissionPolicyService.DELETE);
        if (MigrationEventDomainService.STATUS_OFFICIAL.equals(normalize(event.getDataStatus()))) {
            return governanceApplicationService.submitOfficialDelete(event, actorId, requestId, clientIp);
        }
        domainService.requireDirectlyMutable(event);
        event.setDeletedAt(OffsetDateTime.now());
        MigrationEventEntity saved = migrationEventRepository.save(event);
        record(saved, actorId, "migration_event_delete", "删除迁徙事件", snapshot(saved), requestId, clientIp);
        return new CultureCommandResponse(TARGET_TYPE, saved.getId(), "deleted", null, "迁徙事件已删除");
    }

    private MigrationEventDetailResponse buildDetail(
            MigrationEventEntity event,
            ClanEntity clan,
            BranchEntity branch,
            Long actorId
    ) {
        PersonEntity founder = event.getFounderPersonId() == null
                ? null
                : personRepository.findByIdAndDeletedAtIsNull(event.getFounderPersonId()).orElse(null);
        if (founder != null && !Objects.equals(founder.getClanId(), event.getClanId())) {
            founder = null;
        }
        List<SourceBindingEntity> bindings = sourceBindingRepository
                .findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                        event.getClanId(),
                        TARGET_TYPE,
                        event.getId(),
                        BINDING_ARCHIVED
                );
        Map<Long, SourceEntity> sourcesById = sourceRepository.findAllById(
                        bindings.stream()
                                .map(SourceBindingEntity::getSourceId)
                                .filter(Objects::nonNull)
                                .distinct()
                                .toList()
                )
                .stream()
                .filter(source -> Objects.equals(source.getClanId(), event.getClanId()))
                .collect(Collectors.toMap(SourceEntity::getId, Function.identity()));
        boolean canManageSources = canOnBranch(
                actorId,
                event.getClanId(),
                event.getBranchId(),
                SOURCE_UPDATE_PERMISSION
        );
        List<CultureSourceSummaryResponse> sources = bindings.stream()
                .map(binding -> toSourceSummary(
                        binding,
                        sourcesById.get(binding.getSourceId()),
                        canManageSources
                ))
                .filter(Objects::nonNull)
                .toList();
        MigrationEventSummaryResponse summary = toSummary(
                event,
                clan,
                branch,
                founder,
                sources.size(),
                actorId
        );
        CultureReviewSummaryResponse review = latestReview(event);
        return new MigrationEventDetailResponse(
                summary.id(),
                summary.scope(),
                summary.sequenceNo(),
                summary.fromLocation(),
                summary.toLocation(),
                summary.migrationTimeText(),
                summary.founderPersonId(),
                summary.founderPersonName(),
                summary.reason(),
                summary.confidenceLevel(),
                summary.privacyLevel(),
                summary.sensitiveLevel(),
                summary.dataStatus(),
                summary.sourceCount(),
                summary.allowedActions(),
                summary.version(),
                summary.createdAt(),
                summary.updatedAt(),
                event.getDescription(),
                sources,
                review
        );
    }

    private CultureSourceSummaryResponse toSourceSummary(
            SourceBindingEntity binding,
            SourceEntity source,
            boolean canManageSources
    ) {
        if (source == null || BINDING_ARCHIVED.equals(normalize(source.getVerificationStatus()))) {
            return null;
        }
        boolean restricted = RESTRICTED_PRIVACY.contains(normalize(source.getPrivacyLevel()));
        String excerpt = restricted && !canManageSources
                ? null
                : binding.getExcerpt() == null ? source.getExcerpt() : binding.getExcerpt();
        return new CultureSourceSummaryResponse(
                source.getId(),
                source.getSourceName(),
                source.getSourceType(),
                excerpt,
                binding.getConfidenceLevel(),
                binding.getBindingStatus()
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
        boolean pending = governanceApplicationService.hasPendingRevision(event.getId());
        return new MigrationEventSummaryResponse(
                event.getId(),
                new CultureScopeResponse(
                        clan.getId(),
                        clan.getClanName(),
                        event.getBranchId(),
                        branch == null ? null : branch.getBranchName()
                ),
                event.getSequenceNo(),
                event.getFromLocation(),
                event.getToLocation(),
                event.getMigrationTimeText(),
                event.getFounderPersonId(),
                founder == null ? null : founder.getName(),
                event.getReason(),
                event.getConfidenceLevel(),
                event.getPrivacyLevel(),
                event.getSensitiveLevel(),
                event.getDataStatus(),
                sourceCount,
                permissionPolicyService.allowedActions(event, actorId, pending),
                event.getVersion(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }

    private CultureReviewSummaryResponse latestReview(MigrationEventEntity event) {
        RevisionEntity revision = revisionRepository
                .findFirstByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                        event.getClanId(),
                        TARGET_TYPE,
                        event.getId()
                )
                .orElse(null);
        if (revision == null) {
            return CultureReviewSummaryResponse.empty();
        }
        ReviewTaskEntity task = reviewTaskRepository
                .findFirstByRevisionIdOrderByReviewLevelAsc(revision.getId())
                .orElse(null);
        String submitterName = userName(revision.getSubmitterId());
        String reviewerName = task == null ? null : userName(task.getReviewerId());
        return new CultureReviewSummaryResponse(
                task == null ? null : task.getId(),
                task == null ? revision.getStatus() : task.getStatus(),
                submitterName,
                reviewerName,
                revision.getSubmitTime(),
                task == null ? null : task.getReviewedAt(),
                revision.getRejectedReason()
        );
    }

    private String userName(Long userId) {
        if (userId == null) {
            return null;
        }
        return appUserRepository.findById(userId)
                .map(AppUserEntity::getDisplayName)
                .filter(name -> name != null && !name.isBlank())
                .orElse(null);
    }

    private Specification<MigrationEventEntity> buildSpecification(
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
            if (!criteria.branchIds().isEmpty()) {
                predicates.add(root.get("branchId").in(criteria.branchIds()));
            }
            if (criteria.founderPersonId() != null) {
                predicates.add(cb.equal(root.get("founderPersonId"), criteria.founderPersonId()));
            }
            if (!criteria.dataStatuses().isEmpty()) {
                predicates.add(root.get("dataStatus").in(criteria.dataStatuses()));
            }
            if (criteria.privacyLevel() != null) {
                predicates.add(cb.equal(root.get("privacyLevel"), criteria.privacyLevel()));
            }
            addContains(predicates, root.get("fromLocation"), criteria.fromLocation(), cb);
            addContains(predicates, root.get("toLocation"), criteria.toLocation(), cb);
            addContains(predicates, root.get("migrationTimeText"), criteria.migrationTimeText(), cb);
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
            if (!sensitiveBranchIds.isEmpty()) {
                visibility.add(root.get("branchId").in(sensitiveBranchIds));
            }
            predicates.add(cb.or(visibility.toArray(Predicate[]::new)));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private void addContains(
            List<Predicate> predicates,
            jakarta.persistence.criteria.Path<String> path,
            String value,
            jakarta.persistence.criteria.CriteriaBuilder cb
    ) {
        if (value != null) {
            predicates.add(cb.like(cb.lower(path), "%" + value.toLowerCase(Locale.ROOT) + "%"));
        }
    }

    private MigrationEventEntity requireVisible(Long eventId, Long actorId) {
        MigrationEventEntity event = migrationEventRepository.findByIdAndDeletedAtIsNull(eventId)
                .orElseThrow(() -> new BusinessException(
                        "MIGRATION_EVENT_NOT_FOUND",
                        "迁徙事件不存在或不可见"
                ));
        permissionPolicyService.requireVisible(event, actorId);
        return event;
    }

    private ClanEntity requireClan(Long clanId) {
        return clanRepository.findById(clanId)
                .orElseThrow(() -> new BusinessException("CLAN_NOT_FOUND", "宗族不存在"));
    }

    private BranchEntity requireBranch(Long clanId, Long branchId) {
        BranchEntity branch = branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_BRANCH_INVALID", "支派不属于当前宗族"));
        ApprovedStatusPolicy.requireApproved(branch.getStatus(), "MIGRATION_EVENT_BRANCH_NOT_OFFICIAL", "所属支派审核通过后才能维护迁徙事件");
        return branch;
    }

    private void validateFounder(Long clanId, Long branchId, Long founderPersonId) {
        if (founderPersonId == null) {
            return;
        }
        PersonEntity founder = personRepository.findByIdAndDeletedAtIsNull(founderPersonId)
                .orElseThrow(() -> new BusinessException(
                        "MIGRATION_EVENT_FOUNDER_INVALID",
                        "始迁祖不存在"
                ));
        if (!Objects.equals(founder.getClanId(), clanId)) {
            throw new BusinessException(
                    "MIGRATION_EVENT_FOUNDER_CLAN_MISMATCH",
                    "始迁祖不属于当前宗族"
            );
        }
        ApprovedStatusPolicy.requireApproved(founder.getDataStatus(), "MIGRATION_EVENT_FOUNDER_NOT_OFFICIAL", "始迁祖审核通过后才能用于迁徙事件");
        if (founder.getBranchId() != null
                && !branchRepository.isDescendantOrSelf(clanId, branchId, founder.getBranchId())) {
            throw new BusinessException(
                    "MIGRATION_EVENT_FOUNDER_BRANCH_MISMATCH",
                    "始迁祖不属于迁徙事件支派或其下级支派"
            );
        }
    }

    private void requireSequenceAvailable(
            Long clanId,
            Long branchId,
            Integer sequenceNo,
            Long currentId
    ) {
        boolean exists = currentId == null
                ? migrationEventRepository
                        .existsByClanIdAndBranchIdAndSequenceNoAndDeletedAtIsNull(
                                clanId,
                                branchId,
                                sequenceNo
                        )
                : migrationEventRepository
                        .existsByClanIdAndBranchIdAndSequenceNoAndIdNotAndDeletedAtIsNull(
                                clanId,
                                branchId,
                                sequenceNo,
                                currentId
                        );
        if (exists) {
            throw new BusinessException(
                    "MIGRATION_EVENT_SEQUENCE_CONFLICT",
                    "同一支派的迁徙顺序不能重复"
            );
        }
    }

    private boolean canOnBranch(Long actorId, Long clanId, Long branchId, String permission) {
        return authorizationApplicationService.isCrossClanAdmin(actorId)
                || rbacAuthorizationApplicationService.hasPermission(
                        actorId,
                        clanId,
                        permission,
                        MemberRoleScopeType.branch,
                        branchId
                );
    }

    private Map<Long, Integer> countMap(List<TargetCountProjection> counts) {
        Map<Long, Integer> result = new LinkedHashMap<>();
        counts.forEach(item -> result.put(item.getTargetId(), Math.toIntExact(item.getCount())));
        return result;
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
                event.getClanId(),
                actorId,
                action,
                TARGET_TYPE,
                event.getId(),
                summary,
                detail,
                requestId,
                clientIp
        );
    }

    private String snapshot(MigrationEventEntity event) {
        return "branchId=" + event.getBranchId()
                + "; sequenceNo=" + event.getSequenceNo()
                + "; route=" + event.getFromLocation() + "->" + event.getToLocation()
                + "; time=" + event.getMigrationTimeText()
                + "; founderPersonId=" + event.getFounderPersonId()
                + "; status=" + event.getDataStatus()
                + "; privacy=" + event.getPrivacyLevel()
                + "; version=" + event.getVersion();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
