package com.genealogy.operationlog.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
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
public class OperationLogBusinessViewApplicationService {

    private static final String PERMISSION_VIEW = "operation_log.view";
    private static final Set<String> BRANCH_VISIBLE_PRIVACY = Set.of("public", "clan_only", "branch_only");

    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private final AppUserRepository appUserRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final BranchRepository branchRepository;
    private final ClanRepository clanRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final RevisionRepository revisionRepository;

    public OperationLogBusinessViewApplicationService(
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            AppUserRepository appUserRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            BranchRepository branchRepository,
            ClanRepository clanRepository,
            ReviewTaskRepository reviewTaskRepository,
            RevisionRepository revisionRepository
    ) {
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
        this.appUserRepository = appUserRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.branchRepository = branchRepository;
        this.clanRepository = clanRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.revisionRepository = revisionRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> enrich(
            PageResponse<OperationLogResponse> page,
            Long clanId,
            Long actorId
    ) {
        if (page.records().isEmpty()) {
            return page;
        }
        PermissionDataScope scope = rbacAuthorizationApplicationService.permissionDataScope(
                actorId,
                clanId,
                PERMISSION_VIEW
        );
        Map<Long, String> actorNames = actorDisplayNames(page.records());
        Map<TargetKey, BusinessView> targetViews = targetViews(page.records(), clanId, scope);
        List<OperationLogResponse> records = page.records().stream()
                .map(log -> enrich(log, actorNames, targetViews))
                .toList();
        return new PageResponse<>(records, page.total(), page.pageNo(), page.pageSize(), page.totalPages());
    }

    private OperationLogResponse enrich(
            OperationLogResponse log,
            Map<Long, String> actorNames,
            Map<TargetKey, BusinessView> targetViews
    ) {
        String actorDisplayName = log.actorId() == null
                ? "未知操作者"
                : actorNames.getOrDefault(log.actorId(), "未知操作者");
        BusinessView target = targetViews.get(new TargetKey(normalizeType(log.targetType()), log.targetId()));
        return new OperationLogResponse(
                log.id(),
                log.clanId(),
                log.actorId(),
                actorDisplayName,
                log.actionType(),
                log.targetType(),
                log.targetId(),
                target == null ? null : target.displayName(),
                target == null ? null : target.branchName(),
                target == null ? null : target.summary(),
                target == null ? null : target.status(),
                log.summary(),
                log.detail(),
                log.requestId(),
                log.clientIp(),
                log.createdAt()
        );
    }

    private Map<Long, String> actorDisplayNames(List<OperationLogResponse> logs) {
        Set<Long> actorIds = logs.stream()
                .map(OperationLogResponse::actorId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (actorIds.isEmpty()) {
            return Map.of();
        }
        return appUserRepository.findAllById(actorIds).stream()
                .filter(user -> user.getDeletedAt() == null)
                .collect(Collectors.toMap(
                        AppUserEntity::getId,
                        user -> nonBlank(user.getDisplayName(), "未知操作者"),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private Map<TargetKey, BusinessView> targetViews(
            List<OperationLogResponse> logs,
            Long clanId,
            PermissionDataScope scope
    ) {
        Map<String, Set<Long>> idsByType = new HashMap<>();
        logs.forEach(log -> addId(idsByType, normalizeType(log.targetType()), log.targetId()));

        Map<Long, ReviewTaskEntity> reviewTasks = byId(reviewTaskRepository.findAllById(ids(idsByType, "review_task")), ReviewTaskEntity::getId);
        Map<Long, RevisionEntity> revisions = byId(
                revisionRepository.findAllById(reviewTasks.values().stream().map(ReviewTaskEntity::getRevisionId).filter(Objects::nonNull).toList()),
                RevisionEntity::getId
        );
        revisions.values().forEach(revision -> addId(idsByType, normalizeType(revision.getTargetType()), revision.getTargetId()));

        Map<Long, RelationshipEntity> relationships = byId(
                relationshipRepository.findAllById(ids(idsByType, "relationship")),
                RelationshipEntity::getId
        );
        relationships.values().forEach(relationship -> {
            addId(idsByType, "person", relationship.getFromPersonId());
            addId(idsByType, "person", relationship.getToPersonId());
        });

        Map<Long, SourceEntity> sources = byId(sourceRepository.findAllById(ids(idsByType, "source")), SourceEntity::getId);
        List<SourceBindingEntity> bindings = sources.isEmpty()
                ? List.of()
                : sourceBindingRepository.findBySourceIdIn(sources.keySet());
        bindings.forEach(binding -> addId(idsByType, normalizeType(binding.getTargetType()), binding.getTargetId()));

        Set<Long> missingRelationshipIds = new LinkedHashSet<>(ids(idsByType, "relationship"));
        missingRelationshipIds.removeAll(relationships.keySet());
        if (!missingRelationshipIds.isEmpty()) {
            relationshipRepository.findAllById(missingRelationshipIds).forEach(relationship -> relationships.put(relationship.getId(), relationship));
            relationships.values().forEach(relationship -> {
                addId(idsByType, "person", relationship.getFromPersonId());
                addId(idsByType, "person", relationship.getToPersonId());
            });
        }

        Map<Long, PersonEntity> persons = byId(personRepository.findAllById(ids(idsByType, "person")), PersonEntity::getId);
        persons.values().stream().map(PersonEntity::getBranchId).forEach(branchId -> addId(idsByType, "branch", branchId));
        relationships.values().stream()
                .map(RelationshipEntity::getSuccessorBranchId)
                .forEach(branchId -> addId(idsByType, "branch", branchId));
        reviewTasks.values().stream().map(ReviewTaskEntity::getBranchId).forEach(branchId -> addId(idsByType, "branch", branchId));
        Map<Long, BranchEntity> branches = byId(branchRepository.findAllById(ids(idsByType, "branch")), BranchEntity::getId);
        Map<Long, ClanEntity> clans = byId(clanRepository.findAllById(ids(idsByType, "clan")), ClanEntity::getId);

        Map<TargetKey, BusinessView> result = new LinkedHashMap<>();
        persons.values().stream()
                .filter(person -> visiblePerson(person, clanId, scope))
                .forEach(person -> result.put(new TargetKey("person", person.getId()), personView(person, branches)));
        relationships.values().stream()
                .filter(relationship -> visibleRelationship(relationship, clanId, scope, persons))
                .forEach(relationship -> result.put(
                        new TargetKey("relationship", relationship.getId()),
                        relationshipView(relationship, persons, branches)
                ));
        branches.values().stream()
                .filter(branch -> Objects.equals(branch.getClanId(), clanId) && scope.canAccessBranch(branch.getId()))
                .forEach(branch -> result.put(new TargetKey("branch", branch.getId()), branchView(branch)));

        Map<Long, List<SourceBindingEntity>> bindingsBySource = bindings.stream()
                .collect(Collectors.groupingBy(SourceBindingEntity::getSourceId));
        sources.values().forEach(source -> {
            String branchName = sourceBranchName(
                    bindingsBySource.getOrDefault(source.getId(), List.of()),
                    scope,
                    persons,
                    relationships,
                    branches
            );
            if (visibleSource(source, clanId, scope, branchName)) {
                result.put(new TargetKey("source", source.getId()), sourceView(source, branchName));
            }
        });
        clans.values().stream()
                .filter(clan -> Objects.equals(clan.getId(), clanId))
                .forEach(clan -> result.put(new TargetKey("clan", clan.getId()), clanView(clan)));

        reviewTasks.values().forEach(task -> {
            RevisionEntity revision = revisions.get(task.getRevisionId());
            BusinessView target = revision == null
                    ? null
                    : result.get(new TargetKey(normalizeType(revision.getTargetType()), revision.getTargetId()));
            BranchEntity taskBranch = branches.get(task.getBranchId());
            boolean visible = Objects.equals(task.getClanId(), clanId)
                    && (scope.fullClanAccess()
                    || taskBranch != null && scope.canAccessBranch(taskBranch.getId())
                    || target != null);
            if (visible && (revision == null || revision.getTargetId() == null || target != null)) {
                result.put(new TargetKey("review_task", task.getId()), reviewTaskView(task, revision, target, taskBranch));
            }
        });
        return result;
    }

    private boolean visiblePerson(PersonEntity person, Long clanId, PermissionDataScope scope) {
        if (!Objects.equals(person.getClanId(), clanId) || person.getDeletedAt() != null) {
            return false;
        }
        String privacy = normalizePrivacy(person.getPrivacyLevel());
        if ("sealed".equals(privacy)) {
            return false;
        }
        return scope.fullClanAccess()
                || scope.canAccessBranch(person.getBranchId()) && BRANCH_VISIBLE_PRIVACY.contains(privacy);
    }

    private boolean visibleRelationship(
            RelationshipEntity relationship,
            Long clanId,
            PermissionDataScope scope,
            Map<Long, PersonEntity> persons
    ) {
        if (!Objects.equals(relationship.getClanId(), clanId) || relationship.getDeletedAt() != null) {
            return false;
        }
        PersonEntity from = persons.get(relationship.getFromPersonId());
        PersonEntity to = persons.get(relationship.getToPersonId());
        return from != null && to != null
                && visiblePerson(from, clanId, scope)
                && visiblePerson(to, clanId, scope);
    }

    private boolean visibleSource(SourceEntity source, Long clanId, PermissionDataScope scope, String branchName) {
        if (!Objects.equals(source.getClanId(), clanId)) {
            return false;
        }
        String privacy = normalizePrivacy(source.getPrivacyLevel());
        if ("sealed".equals(privacy)) {
            return false;
        }
        return scope.fullClanAccess() || branchName != null && BRANCH_VISIBLE_PRIVACY.contains(privacy);
    }

    private BusinessView personView(PersonEntity person, Map<Long, BranchEntity> branches) {
        String displayName = nonBlank(person.getGenealogyName(), person.getName());
        String branchName = branchName(person.getBranchId(), branches);
        String summary = "人物：" + displayName
                + optionalPart("，字辈：", person.getGenerationWord())
                + optionalPart("，排行：", person.getRankInFamily());
        return new BusinessView(displayName, branchName, summary, person.getDataStatus(), changedAt(person.getUpdatedAt(), person.getCreatedAt()));
    }

    private BusinessView relationshipView(
            RelationshipEntity relationship,
            Map<Long, PersonEntity> persons,
            Map<Long, BranchEntity> branches
    ) {
        PersonEntity from = persons.get(relationship.getFromPersonId());
        PersonEntity to = persons.get(relationship.getToPersonId());
        String fromName = from == null ? "未知人物" : nonBlank(from.getGenealogyName(), from.getName());
        String toName = to == null ? "未知人物" : nonBlank(to.getGenealogyName(), to.getName());
        String relationName = nonBlank(relationship.getRelationLabel(), relationship.getRelationType());
        String displayName = fromName + " — " + relationName + " — " + toName;
        String branchName = from == null ? null : branchName(from.getBranchId(), branches);
        return new BusinessView(
                displayName,
                branchName,
                "关系：" + fromName + " 与 " + toName + "，类型：" + relationName,
                relationship.getDataStatus(),
                changedAt(relationship.getUpdatedAt(), relationship.getCreatedAt())
        );
    }

    private BusinessView sourceView(SourceEntity source, String branchName) {
        String summary = "来源：" + source.getSourceName() + optionalPart("，载体：", source.getBookTitle());
        return new BusinessView(
                source.getSourceName(),
                branchName,
                summary,
                source.getVerificationStatus(),
                changedAt(source.getUpdatedAt(), source.getCreatedAt())
        );
    }

    private BusinessView branchView(BranchEntity branch) {
        return new BusinessView(
                branch.getBranchName(),
                branch.getBranchName(),
                "支派：" + branch.getBranchName() + optionalPart("，路径：", branch.getBranchPath()),
                branch.getStatus(),
                changedAt(branch.getUpdatedAt(), branch.getCreatedAt())
        );
    }

    private BusinessView clanView(ClanEntity clan) {
        return new BusinessView(
                clan.getClanName(),
                null,
                "宗族：" + clan.getClanName() + optionalPart("，堂号：", clan.getHallName()),
                clan.getStatus(),
                changedAt(clan.getUpdatedAt(), clan.getCreatedAt())
        );
    }

    private BusinessView reviewTaskView(
            ReviewTaskEntity task,
            RevisionEntity revision,
            BusinessView target,
            BranchEntity taskBranch
    ) {
        String targetName = target == null ? "审核事项" : target.displayName();
        String summary = revision == null
                ? "审核事项"
                : nonBlank(revision.getDiffSummary(), "变更类型：" + nonBlank(revision.getChangeType(), "未记录"));
        String branchName = taskBranch != null ? taskBranch.getBranchName() : target == null ? null : target.branchName();
        return new BusinessView(
                "审核事项：" + targetName,
                branchName,
                summary,
                task.getStatus(),
                changedAt(task.getReviewedAt(), task.getCreatedAt())
        );
    }

    private String sourceBranchName(
            List<SourceBindingEntity> bindings,
            PermissionDataScope scope,
            Map<Long, PersonEntity> persons,
            Map<Long, RelationshipEntity> relationships,
            Map<Long, BranchEntity> branches
    ) {
        return bindings.stream()
                .sorted(Comparator.comparing(SourceBindingEntity::getId, Comparator.nullsLast(Long::compareTo)))
                .map(binding -> bindingBranchId(binding, persons, relationships))
                .filter(Objects::nonNull)
                .filter(scope::canAccessBranch)
                .map(branches::get)
                .filter(Objects::nonNull)
                .map(BranchEntity::getBranchName)
                .filter(name -> name != null && !name.isBlank())
                .findFirst()
                .orElse(null);
    }

    private Long bindingBranchId(
            SourceBindingEntity binding,
            Map<Long, PersonEntity> persons,
            Map<Long, RelationshipEntity> relationships
    ) {
        String type = normalizeType(binding.getTargetType());
        if ("branch".equals(type)) {
            return binding.getTargetId();
        }
        if ("person".equals(type)) {
            PersonEntity person = persons.get(binding.getTargetId());
            return person == null ? null : person.getBranchId();
        }
        if ("relationship".equals(type)) {
            RelationshipEntity relationship = relationships.get(binding.getTargetId());
            PersonEntity person = relationship == null ? null : persons.get(relationship.getFromPersonId());
            return person == null ? null : person.getBranchId();
        }
        return null;
    }

    private String branchName(Long branchId, Map<Long, BranchEntity> branches) {
        BranchEntity branch = branchId == null ? null : branches.get(branchId);
        return branch == null ? null : branch.getBranchName();
    }

    private String normalizeType(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "persons" -> "person";
            case "relationships" -> "relationship";
            case "sources" -> "source";
            case "branches" -> "branch";
            case "review_tasks" -> "review_task";
            default -> normalized;
        };
    }

    private String normalizePrivacy(String value) {
        return value == null || value.isBlank() ? "clan_only" : value.trim().toLowerCase(Locale.ROOT);
    }

    private void addId(Map<String, Set<Long>> idsByType, String type, Long id) {
        if (type == null || type.isBlank() || id == null) {
            return;
        }
        idsByType.computeIfAbsent(type, ignored -> new LinkedHashSet<>()).add(id);
    }

    private Collection<Long> ids(Map<String, Set<Long>> idsByType, String type) {
        return idsByType.getOrDefault(type, Set.of());
    }

    private <T> Map<Long, T> byId(Collection<T> values, Function<T, Long> idExtractor) {
        if (values == null || values.isEmpty()) {
            return new LinkedHashMap<>();
        }
        return values.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(idExtractor, Function.identity(), (left, right) -> left, LinkedHashMap::new));
    }

    private LocalDateTime changedAt(LocalDateTime updatedAt, LocalDateTime createdAt) {
        return updatedAt == null ? createdAt : updatedAt;
    }

    private String optionalPart(String prefix, String value) {
        return value == null || value.isBlank() ? "" : prefix + value;
    }

    private String nonBlank(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }

    private record TargetKey(String type, Long id) {
    }

    private record BusinessView(
            String displayName,
            String branchName,
            String summary,
            String status,
            LocalDateTime changedAt
    ) {
    }
}
