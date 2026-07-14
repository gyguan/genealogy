package com.genealogy.tree.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.tree.application.TreeVisibilityApplicationService.PersonProjection;
import com.genealogy.tree.application.TreeVisibilityApplicationService.Visibility;
import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.dto.TreeNodeResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TreeApplicationService {

    private static final int DEFAULT_DEPTH = 5;
    private static final String LINEAGE_RELATION_TYPE = "parent_child";
    private static final String DIRECTION_FAMILY = "family";
    private static final String DIRECTION_ANCESTORS = "ancestors";
    private static final String DIRECTION_DESCENDANTS = "descendants";
    private static final String DIRECTION_BOTH = "both";

    private static final String SCOPE_BLOOD = "blood";
    private static final String SCOPE_RITUAL = "ritual";
    private static final String SCOPE_MARRIAGE = "marriage";
    private static final String SCOPE_STATUS = "status";
    private static final Set<String> ALLOWED_RELATION_SCOPES = Set.of(
            SCOPE_BLOOD, SCOPE_RITUAL, SCOPE_MARRIAGE, SCOPE_STATUS
    );
    private static final Set<String> DEFAULT_RELATION_SCOPES = Set.of(
            SCOPE_BLOOD, SCOPE_RITUAL, SCOPE_MARRIAGE
    );

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final BranchRepository branchRepository;
    private final TreeVisibilityApplicationService visibilityApplicationService;

    public TreeApplicationService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            BranchRepository branchRepository,
            TreeVisibilityApplicationService visibilityApplicationService
    ) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.branchRepository = branchRepository;
        this.visibilityApplicationService = visibilityApplicationService;
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse personLineage(
            Long personId,
            String direction,
            List<String> relationScopes,
            String dataView,
            Integer maxDepth,
            Long actorId
    ) {
        String normalizedDirection = normalizeDirection(direction);
        Set<String> normalizedScopes = normalizeRelationScopes(relationScopes);
        String normalizedView = visibilityApplicationService.normalizeDataView(dataView);
        PersonEntity root = getPerson(personId);
        PersonProjection rootProjection = visibilityApplicationService.requireRootProjection(root, actorId, normalizedView);
        if (rootProjection.visibility() == Visibility.MASKED) {
            return maskedRootGraph(rootProjection);
        }

        Map<Long, PersonProjection> projections = new LinkedHashMap<>();
        Map<Long, TreeNodeResponse> nodes = new LinkedHashMap<>();
        List<TreeEdgeResponse> edges = new ArrayList<>();
        addFullNode(projections, nodes, rootProjection);
        int depthLimit = normalizeDepth(maxDepth);

        switch (normalizedDirection) {
            case DIRECTION_FAMILY -> appendDirectRelationships(
                    personId, projections, nodes, edges, normalizedScopes, normalizedView, actorId
            );
            case DIRECTION_ANCESTORS -> traverse(
                    personId, false, depthLimit, projections, nodes, edges, normalizedScopes, normalizedView, actorId
            );
            case DIRECTION_DESCENDANTS -> traverse(
                    personId, true, depthLimit, projections, nodes, edges, normalizedScopes, normalizedView, actorId
            );
            case DIRECTION_BOTH -> {
                appendDirectRelationships(personId, projections, nodes, edges, normalizedScopes, normalizedView, actorId);
                traverse(personId, false, depthLimit, projections, nodes, edges, normalizedScopes, normalizedView, actorId);
                traverse(personId, true, depthLimit, projections, nodes, edges, normalizedScopes, normalizedView, actorId);
            }
            default -> throw new BusinessException("TREE_DIRECTION_INVALID", "世系图谱查询方向无效");
        }
        return new TreeGraphResponse(personId, new ArrayList<>(nodes.values()), edges);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse family(
            Long personId,
            List<String> relationScopes,
            String dataView,
            Long actorId
    ) {
        return personLineage(personId, DIRECTION_FAMILY, relationScopes, dataView, 1, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse descendants(
            Long rootPersonId,
            Integer maxDepth,
            List<String> relationScopes,
            String dataView,
            Long actorId
    ) {
        return personLineage(rootPersonId, DIRECTION_DESCENDANTS, relationScopes, dataView, maxDepth, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse ancestors(
            Long personId,
            Integer maxDepth,
            List<String> relationScopes,
            String dataView,
            Long actorId
    ) {
        return personLineage(personId, DIRECTION_ANCESTORS, relationScopes, dataView, maxDepth, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse branchLineage(
            Long clanId,
            Long branchId,
            boolean includeSubBranches,
            List<String> relationScopes,
            String dataView,
            Long actorId
    ) {
        String normalizedView = visibilityApplicationService.normalizeDataView(dataView);
        Set<String> normalizedScopes = normalizeRelationScopes(relationScopes);
        BranchEntity rootBranch = branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
        visibilityApplicationService.requireBranchQueryAccess(clanId, branchId, actorId, normalizedView);

        Set<Long> branchScopeIds = includeSubBranches
                ? findBranchScopeIds(clanId, rootBranch)
                : Set.of(rootBranch.getId());
        List<PersonEntity> candidates = personRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(person -> person.getBranchId() != null && branchScopeIds.contains(person.getBranchId()))
                .sorted(Comparator
                        .comparing((PersonEntity person) -> person.getGenerationNo() == null ? Integer.MAX_VALUE : person.getGenerationNo())
                        .thenComparing(person -> person.getPersonCode() == null ? "" : person.getPersonCode())
                        .thenComparing(PersonEntity::getId))
                .toList();

        Map<Long, PersonProjection> projections = new LinkedHashMap<>();
        Map<Long, TreeNodeResponse> nodes = new LinkedHashMap<>();
        for (PersonEntity person : candidates) {
            PersonProjection projection = visibilityApplicationService.projectPerson(person, actorId, normalizedView);
            if (projection.visibility() == Visibility.FULL) {
                addFullNode(projections, nodes, projection);
            }
        }

        Set<Long> visiblePersonIds = nodes.keySet();
        List<TreeEdgeResponse> edges = relationshipRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(relationship -> visiblePersonIds.contains(relationship.getFromPersonId())
                        && visiblePersonIds.contains(relationship.getToPersonId()))
                .filter(relationship -> relationScopeIncluded(relationship, normalizedScopes))
                .filter(relationship -> visibilityApplicationService.canExposeRelationship(
                        relationship,
                        projections.get(relationship.getFromPersonId()),
                        projections.get(relationship.getToPersonId()),
                        actorId,
                        normalizedView
                ))
                .sorted(Comparator
                        .comparing((RelationshipEntity relationship) -> nodeSortKey(nodes.get(relationship.getFromPersonId())))
                        .thenComparing(relationship -> nodeSortKey(nodes.get(relationship.getToPersonId())))
                        .thenComparing(RelationshipEntity::getId))
                .map(this::toEdge)
                .toList();
        Long rootPersonId = rootPersonId(rootBranch, candidates, nodes.keySet(), edges);
        return new TreeGraphResponse(rootPersonId, new ArrayList<>(nodes.values()), edges);
    }

    private void appendDirectRelationships(
            Long personId,
            Map<Long, PersonProjection> projections,
            Map<Long, TreeNodeResponse> nodes,
            List<TreeEdgeResponse> edges,
            Set<String> relationScopes,
            String dataView,
            Long actorId
    ) {
        appendRelationships(personId, true, projections, nodes, edges, relationScopes, dataView, actorId, false, null);
        appendRelationships(personId, false, projections, nodes, edges, relationScopes, dataView, actorId, false, null);
    }

    private void traverse(
            Long rootPersonId,
            boolean outgoing,
            int depthLimit,
            Map<Long, PersonProjection> projections,
            Map<Long, TreeNodeResponse> nodes,
            List<TreeEdgeResponse> edges,
            Set<String> relationScopes,
            String dataView,
            Long actorId
    ) {
        Queue<PersonDepth> queue = new ArrayDeque<>();
        queue.add(new PersonDepth(rootPersonId, 0));
        while (!queue.isEmpty()) {
            PersonDepth current = queue.poll();
            if (current.depth() >= depthLimit) {
                continue;
            }
            appendRelationships(
                    current.personId(), outgoing, projections, nodes, edges, relationScopes,
                    dataView, actorId, true, queue, current.depth()
            );
        }
    }

    private void appendRelationships(
            Long personId,
            boolean outgoing,
            Map<Long, PersonProjection> projections,
            Map<Long, TreeNodeResponse> nodes,
            List<TreeEdgeResponse> edges,
            Set<String> relationScopes,
            String dataView,
            Long actorId,
            boolean lineageOnly,
            Queue<PersonDepth> queue,
            Integer currentDepth
    ) {
        List<RelationshipEntity> relationships = outgoing
                ? relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(personId)
                : relationshipRepository.findByToPersonIdAndDeletedAtIsNull(personId);
        for (RelationshipEntity relationship : relationships) {
            if (lineageOnly && !isLineageRelationship(relationship)) {
                continue;
            }
            if (!relationScopeIncluded(relationship, relationScopes)) {
                continue;
            }
            Long relatedPersonId = outgoing ? relationship.getToPersonId() : relationship.getFromPersonId();
            PersonEntity related = personRepository.findByIdAndDeletedAtIsNull(relatedPersonId).orElse(null);
            if (related == null) {
                continue;
            }
            PersonProjection relatedProjection = visibilityApplicationService.projectPerson(related, actorId, dataView);
            if (relatedProjection.visibility() != Visibility.FULL) {
                continue;
            }
            PersonProjection fromProjection = outgoing ? projections.get(personId) : relatedProjection;
            PersonProjection toProjection = outgoing ? relatedProjection : projections.get(personId);
            if (fromProjection == null || toProjection == null
                    || !visibilityApplicationService.canExposeRelationship(
                    relationship, fromProjection, toProjection, actorId, dataView
            )) {
                continue;
            }
            addFullNode(projections, nodes, relatedProjection);
            edges.add(toEdge(relationship));
            if (queue != null && currentDepth != null) {
                queue.add(new PersonDepth(relatedPersonId, currentDepth + 1));
            }
        }
    }

    private TreeGraphResponse maskedRootGraph(PersonProjection rootProjection) {
        TreeNodeResponse masked = new TreeNodeResponse(
                null,
                rootProjection.displayName(),
                null,
                null,
                null,
                null
        );
        return new TreeGraphResponse(null, List.of(masked), List.of());
    }

    private void addFullNode(
            Map<Long, PersonProjection> projections,
            Map<Long, TreeNodeResponse> nodes,
            PersonProjection projection
    ) {
        if (projection.visibility() != Visibility.FULL || projection.response() == null) {
            return;
        }
        projections.putIfAbsent(projection.entity().getId(), projection);
        nodes.putIfAbsent(projection.entity().getId(), new TreeNodeResponse(
                projection.response().id(),
                projection.response().name(),
                projection.response().gender(),
                projection.response().generationNo(),
                projection.response().generationWord(),
                projection.response().branchId()
        ));
    }

    private Set<Long> findBranchScopeIds(Long clanId, BranchEntity rootBranch) {
        String rootPath = rootBranch.getBranchPath();
        return branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).stream()
                .filter(branch -> branch.getId().equals(rootBranch.getId()) || isDescendant(rootPath, branch.getBranchPath()))
                .map(BranchEntity::getId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private boolean isDescendant(String rootPath, String candidatePath) {
        return rootPath != null && !rootPath.isBlank()
                && candidatePath != null && !candidatePath.isBlank()
                && (candidatePath.equals(rootPath) || candidatePath.startsWith(rootPath + "/"));
    }

    private Long rootPersonId(
            BranchEntity rootBranch,
            List<PersonEntity> candidates,
            Set<Long> visiblePersonIds,
            List<TreeEdgeResponse> edges
    ) {
        if (rootBranch.getFounderPersonId() != null && visiblePersonIds.contains(rootBranch.getFounderPersonId())) {
            return rootBranch.getFounderPersonId();
        }
        Set<Long> childIds = edges.stream().map(TreeEdgeResponse::toPersonId).collect(Collectors.toCollection(HashSet::new));
        return candidates.stream()
                .filter(person -> visiblePersonIds.contains(person.getId()))
                .filter(person -> !childIds.contains(person.getId()))
                .findFirst()
                .or(() -> candidates.stream().filter(person -> visiblePersonIds.contains(person.getId())).findFirst())
                .map(PersonEntity::getId)
                .orElse(null);
    }

    private String nodeSortKey(TreeNodeResponse node) {
        if (node == null) {
            return "9999-9999999999";
        }
        int generation = node.generationNo() == null ? 9999 : node.generationNo();
        long personId = node.personId() == null ? Long.MAX_VALUE : node.personId();
        return String.format("%04d-%010d", generation, personId);
    }

    private PersonEntity getPerson(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }

    private TreeEdgeResponse toEdge(RelationshipEntity relationship) {
        return new TreeEdgeResponse(
                relationship.getId(),
                relationship.getFromPersonId(),
                relationship.getToPersonId(),
                relationship.getRelationType(),
                relationship.getRelationLabel()
        );
    }

    private boolean isLineageRelationship(RelationshipEntity relationship) {
        return LINEAGE_RELATION_TYPE.equals(relationship.getRelationType())
                || Boolean.TRUE.equals(relationship.getIsLineageRelation());
    }

    private boolean relationScopeIncluded(RelationshipEntity relationship, Set<String> scopes) {
        return scopes.contains(relationCategory(relationship));
    }

    private String relationCategory(RelationshipEntity relationship) {
        if (relationship.getRelationCategory() != null && !relationship.getRelationCategory().isBlank()) {
            return relationship.getRelationCategory().trim().toLowerCase(Locale.ROOT);
        }
        return switch (relationship.getRelationType()) {
            case "spouse" -> SCOPE_MARRIAGE;
            case "adoptive", "successor", "out_adoption", "in_adoption", "dual_successor", "heir_son" -> SCOPE_RITUAL;
            case "no_descendant" -> SCOPE_STATUS;
            default -> SCOPE_BLOOD;
        };
    }

    private Set<String> normalizeRelationScopes(List<String> relationScopes) {
        if (relationScopes == null || relationScopes.isEmpty()) {
            return DEFAULT_RELATION_SCOPES;
        }
        Set<String> normalized = relationScopes.stream()
                .filter(value -> value != null && !value.isBlank())
                .flatMap(value -> List.of(value.split(",")).stream())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (normalized.isEmpty()) {
            return DEFAULT_RELATION_SCOPES;
        }
        if (!ALLOWED_RELATION_SCOPES.containsAll(normalized)) {
            throw new BusinessException("TREE_RELATION_SCOPE_INVALID", "世系图谱关系范围无效");
        }
        return Set.copyOf(normalized);
    }

    private String normalizeDirection(String direction) {
        String normalized = direction == null || direction.isBlank()
                ? DIRECTION_BOTH
                : direction.trim().toLowerCase(Locale.ROOT);
        if (!Set.of(DIRECTION_FAMILY, DIRECTION_ANCESTORS, DIRECTION_DESCENDANTS, DIRECTION_BOTH).contains(normalized)) {
            throw new BusinessException("TREE_DIRECTION_INVALID", "世系图谱查询方向无效");
        }
        return normalized;
    }

    private int normalizeDepth(Integer maxDepth) {
        if (maxDepth == null || maxDepth < 1) {
            return DEFAULT_DEPTH;
        }
        return Math.min(maxDepth, 20);
    }

    private record PersonDepth(Long personId, int depth) {
    }
}
