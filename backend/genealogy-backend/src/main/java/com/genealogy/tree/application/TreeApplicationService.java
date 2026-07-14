package com.genealogy.tree.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.tree.application.TreeGraphAccumulator.EdgeAddResult;
import com.genealogy.tree.application.TreeVisibilityApplicationService.PersonProjection;
import com.genealogy.tree.application.TreeVisibilityApplicationService.Visibility;
import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeGraphMeta;
import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.dto.TreeGraphWarning;
import com.genealogy.tree.dto.TreeNodeResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
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
    private static final int MAX_DEPTH = 20;
    private static final int DEFAULT_NODES = 500;
    private static final int MAX_NODES = 2000;
    private static final int DEFAULT_EDGES = 1000;
    private static final int MAX_EDGES = 4000;

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
            Integer maxNodes,
            Integer maxEdges,
            Long actorId
    ) {
        String normalizedDirection = normalizeDirection(direction);
        Set<String> normalizedScopes = normalizeRelationScopes(relationScopes);
        String normalizedView = visibilityApplicationService.normalizeDataView(dataView);
        QueryLimits limits = normalizeLimits(maxDepth, maxNodes, maxEdges);
        PersonEntity root = getPerson(personId);
        PersonProjection rootProjection = visibilityApplicationService.requireRootProjection(root, actorId, normalizedView);
        if (rootProjection.visibility() == Visibility.MASKED) {
            return maskedRootGraph(rootProjection, normalizedDirection, normalizedView, limits);
        }

        TreeGraphAccumulator graph = new TreeGraphAccumulator(
                limits.requestedDepth(), limits.appliedDepth(), limits.maxNodes(), limits.maxEdges()
        );
        Map<Long, PersonProjection> projections = new LinkedHashMap<>();
        addFullNode(graph, projections, rootProjection);

        switch (normalizedDirection) {
            case DIRECTION_FAMILY -> appendDirectRelationships(
                    personId, projections, graph, normalizedScopes, normalizedView, actorId, false
            );
            case DIRECTION_ANCESTORS -> traverse(
                    personId, false, limits.appliedDepth(), projections, graph,
                    normalizedScopes, normalizedView, actorId
            );
            case DIRECTION_DESCENDANTS -> traverse(
                    personId, true, limits.appliedDepth(), projections, graph,
                    normalizedScopes, normalizedView, actorId
            );
            case DIRECTION_BOTH -> {
                appendDirectRelationships(
                        personId, projections, graph, normalizedScopes, normalizedView, actorId, true
                );
                traverse(
                        personId, false, limits.appliedDepth(), projections, graph,
                        normalizedScopes, normalizedView, actorId
                );
                if (!graph.capacityReached()) {
                    traverse(
                            personId, true, limits.appliedDepth(), projections, graph,
                            normalizedScopes, normalizedView, actorId
                    );
                }
            }
            default -> throw new BusinessException("TREE_DIRECTION_INVALID", "世系图谱查询方向无效");
        }
        return graph.build(personId, normalizedDirection, normalizedView);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse family(
            Long personId,
            List<String> relationScopes,
            String dataView,
            Integer maxNodes,
            Integer maxEdges,
            Long actorId
    ) {
        return personLineage(
                personId, DIRECTION_FAMILY, relationScopes, dataView, 1, maxNodes, maxEdges, actorId
        );
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse descendants(
            Long rootPersonId,
            Integer maxDepth,
            List<String> relationScopes,
            String dataView,
            Integer maxNodes,
            Integer maxEdges,
            Long actorId
    ) {
        return personLineage(
                rootPersonId, DIRECTION_DESCENDANTS, relationScopes, dataView,
                maxDepth, maxNodes, maxEdges, actorId
        );
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse ancestors(
            Long personId,
            Integer maxDepth,
            List<String> relationScopes,
            String dataView,
            Integer maxNodes,
            Integer maxEdges,
            Long actorId
    ) {
        return personLineage(
                personId, DIRECTION_ANCESTORS, relationScopes, dataView,
                maxDepth, maxNodes, maxEdges, actorId
        );
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse branchLineage(
            Long clanId,
            Long branchId,
            boolean includeSubBranches,
            List<String> relationScopes,
            String dataView,
            Integer maxDepth,
            Integer maxNodes,
            Integer maxEdges,
            Long actorId
    ) {
        String normalizedView = visibilityApplicationService.normalizeDataView(dataView);
        Set<String> normalizedScopes = normalizeRelationScopes(relationScopes);
        QueryLimits limits = normalizeLimits(maxDepth, maxNodes, maxEdges);
        BranchEntity rootBranch = branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
        visibilityApplicationService.requireBranchQueryAccess(clanId, branchId, actorId, normalizedView);

        Set<Long> branchScopeIds = includeSubBranches
                ? findBranchScopeIds(clanId, rootBranch)
                : Set.of(rootBranch.getId());
        List<PersonEntity> candidates = personRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(person -> person.getBranchId() != null && branchScopeIds.contains(person.getBranchId()))
                .sorted(personComparator())
                .toList();

        Map<Long, PersonProjection> visibleProjections = new LinkedHashMap<>();
        int filteredPersonCount = 0;
        for (PersonEntity person : candidates) {
            PersonProjection projection = visibilityApplicationService.projectPerson(person, actorId, normalizedView);
            if (projection.visibility() == Visibility.FULL) {
                visibleProjections.put(person.getId(), projection);
            } else {
                filteredPersonCount++;
            }
        }

        List<RelationshipEntity> safeRelationships = new ArrayList<>();
        Set<String> sourceEdgeKeys = new HashSet<>();
        int filteredRelationshipCount = 0;
        int duplicateSourceEdges = 0;
        for (RelationshipEntity relationship : relationshipRepository.findByClanIdAndDeletedAtIsNull(clanId)) {
            PersonProjection from = visibleProjections.get(relationship.getFromPersonId());
            PersonProjection to = visibleProjections.get(relationship.getToPersonId());
            if (from == null || to == null || !relationScopeIncluded(relationship, normalizedScopes)) {
                filteredRelationshipCount++;
                continue;
            }
            if (!visibilityApplicationService.canExposeRelationship(
                    relationship, from, to, actorId, normalizedView
            )) {
                filteredRelationshipCount++;
                continue;
            }
            String key = edgeKey(relationship);
            if (!sourceEdgeKeys.add(key)) {
                duplicateSourceEdges++;
                continue;
            }
            safeRelationships.add(relationship);
        }
        safeRelationships.sort(Comparator
                .comparing((RelationshipEntity relationship) -> personSortKey(
                        visibleProjections.get(relationship.getFromPersonId()).entity()
                ))
                .thenComparing(relationship -> personSortKey(
                        visibleProjections.get(relationship.getToPersonId()).entity()
                ))
                .thenComparing(relationship -> relationship.getId() == null ? Long.MAX_VALUE : relationship.getId()));

        TreeGraphAccumulator graph = new TreeGraphAccumulator(
                limits.requestedDepth(), limits.appliedDepth(), limits.maxNodes(), limits.maxEdges()
        );
        for (int i = 0; i < duplicateSourceEdges; i++) {
            graph.recordDuplicateEdge();
        }
        graph.recordPartialVisibility(filteredPersonCount + filteredRelationshipCount);

        Map<Long, List<RelationshipEntity>> outgoingLineage = safeRelationships.stream()
                .filter(this::isLineageRelationship)
                .collect(Collectors.groupingBy(
                        RelationshipEntity::getFromPersonId,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        Set<Long> incomingLineageIds = safeRelationships.stream()
                .filter(this::isLineageRelationship)
                .map(RelationshipEntity::getToPersonId)
                .collect(Collectors.toSet());

        LinkedHashSet<Long> seeds = new LinkedHashSet<>();
        if (rootBranch.getFounderPersonId() != null
                && visibleProjections.containsKey(rootBranch.getFounderPersonId())) {
            seeds.add(rootBranch.getFounderPersonId());
        }
        visibleProjections.keySet().stream()
                .filter(id -> !incomingLineageIds.contains(id))
                .forEach(seeds::add);
        if (seeds.isEmpty() && !visibleProjections.isEmpty()) {
            seeds.add(visibleProjections.keySet().iterator().next());
        }

        Set<Long> selectedIds = new LinkedHashSet<>();
        Set<Long> depthOmittedIds = new HashSet<>();
        for (Long seed : seeds) {
            selectBranchComponent(
                    seed, outgoingLineage, visibleProjections, selectedIds, depthOmittedIds,
                    limits.appliedDepth(), graph
            );
            if (graph.capacityReached()) {
                break;
            }
        }
        if (!graph.capacityReached()) {
            for (Long candidateId : visibleProjections.keySet()) {
                if (selectedIds.contains(candidateId) || depthOmittedIds.contains(candidateId)) {
                    continue;
                }
                selectBranchComponent(
                        candidateId, outgoingLineage, visibleProjections, selectedIds, depthOmittedIds,
                        limits.appliedDepth(), graph
                );
                if (graph.capacityReached()) {
                    break;
                }
            }
        }

        for (RelationshipEntity relationship : safeRelationships) {
            if (graph.capacityReached()) {
                break;
            }
            if (!selectedIds.contains(relationship.getFromPersonId())
                    || !selectedIds.contains(relationship.getToPersonId())) {
                continue;
            }
            graph.addEdge(edgeKey(relationship), toEdge(relationship));
        }
        detectBranchCycles(selectedIds, safeRelationships, graph);

        Set<Long> incidentIds = graph.edgeValues().stream()
                .flatMap(edge -> List.of(edge.fromPersonId(), edge.toPersonId()).stream())
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        int isolatedCount = (int) selectedIds.stream().filter(id -> !incidentIds.contains(id)).count();
        graph.recordIsolatedNodes(isolatedCount);

        Long rootPersonId = chooseBranchRoot(rootBranch, selectedIds, safeRelationships);
        if (rootBranch.getFounderPersonId() != null
                && !selectedIds.contains(rootBranch.getFounderPersonId())) {
            graph.recordRootFiltered();
        }
        if (rootPersonId == null && !visibleProjections.isEmpty()) {
            graph.recordRootFiltered();
        }
        return graph.build(rootPersonId, DIRECTION_DESCENDANTS, normalizedView);
    }

    private void appendDirectRelationships(
            Long personId,
            Map<Long, PersonProjection> projections,
            TreeGraphAccumulator graph,
            Set<String> relationScopes,
            String dataView,
            Long actorId,
            boolean excludeLineage
    ) {
        appendRelationships(
                personId, true, projections, graph, relationScopes, dataView, actorId,
                false, excludeLineage, null, null, null, null
        );
        if (!graph.capacityReached()) {
            appendRelationships(
                    personId, false, projections, graph, relationScopes, dataView, actorId,
                    false, excludeLineage, null, null, null, null
            );
        }
    }

    private void traverse(
            Long rootPersonId,
            boolean outgoing,
            int depthLimit,
            Map<Long, PersonProjection> projections,
            TreeGraphAccumulator graph,
            Set<String> relationScopes,
            String dataView,
            Long actorId
    ) {
        Queue<TraversalState> queue = new ArrayDeque<>();
        Set<Long> visited = new HashSet<>();
        Set<Long> queued = new HashSet<>();
        queue.add(new TraversalState(rootPersonId, 0, Set.of(rootPersonId)));
        queued.add(rootPersonId);

        while (!queue.isEmpty() && !graph.capacityReached()) {
            TraversalState current = queue.poll();
            queued.remove(current.personId());
            if (!visited.add(current.personId())) {
                continue;
            }
            if (current.depth() >= depthLimit) {
                if (hasVisibleNextLineage(
                        current, outgoing, projections, relationScopes, dataView, actorId
                )) {
                    graph.recordDepthLimit();
                }
                continue;
            }
            appendRelationships(
                    current.personId(), outgoing, projections, graph, relationScopes, dataView, actorId,
                    true, false, queue, visited, queued, current
            );
        }
    }

    private void appendRelationships(
            Long personId,
            boolean outgoing,
            Map<Long, PersonProjection> projections,
            TreeGraphAccumulator graph,
            Set<String> relationScopes,
            String dataView,
            Long actorId,
            boolean lineageOnly,
            boolean excludeLineage,
            Queue<TraversalState> queue,
            Set<Long> visited,
            Set<Long> queued,
            TraversalState current
    ) {
        List<RelationshipEntity> relationships = outgoing
                ? relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(personId)
                : relationshipRepository.findByToPersonIdAndDeletedAtIsNull(personId);
        Set<String> batchEdgeKeys = new HashSet<>();
        for (RelationshipEntity relationship : relationships) {
            if (graph.capacityReached()) {
                return;
            }
            if (lineageOnly && !isLineageRelationship(relationship)) {
                continue;
            }
            if (excludeLineage && isLineageRelationship(relationship)) {
                continue;
            }
            if (!relationScopeIncluded(relationship, relationScopes)) {
                continue;
            }
            String key = edgeKey(relationship);
            if (!batchEdgeKeys.add(key)) {
                graph.recordDuplicateEdge();
                continue;
            }
            if (graph.containsEdge(key)) {
                continue;
            }

            Long relatedPersonId = outgoing ? relationship.getToPersonId() : relationship.getFromPersonId();
            PersonEntity related = personRepository.findByIdAndDeletedAtIsNull(relatedPersonId).orElse(null);
            if (related == null) {
                graph.recordPartialVisibility(1);
                continue;
            }
            PersonProjection relatedProjection = projections.get(relatedPersonId);
            if (relatedProjection == null) {
                relatedProjection = visibilityApplicationService.projectPerson(related, actorId, dataView);
            }
            if (relatedProjection.visibility() != Visibility.FULL) {
                graph.recordPartialVisibility(1);
                continue;
            }
            PersonProjection currentProjection = projections.get(personId);
            PersonProjection fromProjection = outgoing ? currentProjection : relatedProjection;
            PersonProjection toProjection = outgoing ? relatedProjection : currentProjection;
            if (fromProjection == null || toProjection == null
                    || !visibilityApplicationService.canExposeRelationship(
                    relationship, fromProjection, toProjection, actorId, dataView
            )) {
                graph.recordPartialVisibility(1);
                continue;
            }

            boolean cycle = relatedPersonId.equals(personId)
                    || current != null && current.path().contains(relatedPersonId);
            if (cycle) {
                graph.recordCycle();
            }
            if (!addFullNode(graph, projections, relatedProjection)) {
                return;
            }
            EdgeAddResult edgeResult = graph.addEdge(key, toEdge(relationship));
            if (edgeResult == EdgeAddResult.LIMIT_REACHED) {
                return;
            }
            if (queue != null && current != null && !cycle
                    && !visited.contains(relatedPersonId) && queued.add(relatedPersonId)) {
                Set<Long> nextPath = new LinkedHashSet<>(current.path());
                nextPath.add(relatedPersonId);
                queue.add(new TraversalState(
                        relatedPersonId, current.depth() + 1, Set.copyOf(nextPath)
                ));
            }
        }
    }

    private boolean hasVisibleNextLineage(
            TraversalState current,
            boolean outgoing,
            Map<Long, PersonProjection> projections,
            Set<String> relationScopes,
            String dataView,
            Long actorId
    ) {
        List<RelationshipEntity> relationships = outgoing
                ? relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(current.personId())
                : relationshipRepository.findByToPersonIdAndDeletedAtIsNull(current.personId());
        for (RelationshipEntity relationship : relationships) {
            if (!isLineageRelationship(relationship) || !relationScopeIncluded(relationship, relationScopes)) {
                continue;
            }
            Long relatedPersonId = outgoing ? relationship.getToPersonId() : relationship.getFromPersonId();
            if (current.path().contains(relatedPersonId)) {
                continue;
            }
            PersonEntity related = personRepository.findByIdAndDeletedAtIsNull(relatedPersonId).orElse(null);
            if (related == null) {
                continue;
            }
            PersonProjection relatedProjection = projections.get(relatedPersonId);
            if (relatedProjection == null) {
                relatedProjection = visibilityApplicationService.projectPerson(related, actorId, dataView);
            }
            if (relatedProjection.visibility() != Visibility.FULL) {
                continue;
            }
            PersonProjection currentProjection = projections.get(current.personId());
            PersonProjection fromProjection = outgoing ? currentProjection : relatedProjection;
            PersonProjection toProjection = outgoing ? relatedProjection : currentProjection;
            if (fromProjection != null && toProjection != null
                    && visibilityApplicationService.canExposeRelationship(
                    relationship, fromProjection, toProjection, actorId, dataView
            )) {
                return true;
            }
        }
        return false;
    }

    private void selectBranchComponent(
            Long seed,
            Map<Long, List<RelationshipEntity>> outgoingLineage,
            Map<Long, PersonProjection> visibleProjections,
            Set<Long> selectedIds,
            Set<Long> depthOmittedIds,
            int depthLimit,
            TreeGraphAccumulator graph
    ) {
        Queue<PersonDepth> queue = new ArrayDeque<>();
        Map<Long, Integer> bestDepth = new HashMap<>();
        queue.add(new PersonDepth(seed, 0));
        bestDepth.put(seed, 0);
        while (!queue.isEmpty() && !graph.capacityReached()) {
            PersonDepth current = queue.poll();
            PersonProjection projection = visibleProjections.get(current.personId());
            if (projection == null) {
                continue;
            }
            if (selectedIds.add(current.personId())
                    && !addFullNode(graph, new LinkedHashMap<>(), projection)) {
                return;
            }
            List<RelationshipEntity> nextEdges = outgoingLineage.getOrDefault(current.personId(), List.of());
            if (current.depth() >= depthLimit) {
                Set<Long> omittedStarts = nextEdges.stream()
                        .map(RelationshipEntity::getToPersonId)
                        .filter(visibleProjections::containsKey)
                        .filter(id -> !selectedIds.contains(id))
                        .collect(Collectors.toSet());
                if (!omittedStarts.isEmpty()) {
                    graph.recordDepthLimit();
                    markDepthOmitted(omittedStarts, outgoingLineage, depthOmittedIds);
                }
                continue;
            }
            for (RelationshipEntity edge : nextEdges) {
                Long nextId = edge.getToPersonId();
                if (!visibleProjections.containsKey(nextId)) {
                    continue;
                }
                int nextDepth = current.depth() + 1;
                Integer knownDepth = bestDepth.get(nextId);
                if (knownDepth == null || nextDepth < knownDepth) {
                    bestDepth.put(nextId, nextDepth);
                    queue.add(new PersonDepth(nextId, nextDepth));
                }
            }
        }
    }

    private void markDepthOmitted(
            Set<Long> starts,
            Map<Long, List<RelationshipEntity>> outgoingLineage,
            Set<Long> depthOmittedIds
    ) {
        Queue<Long> queue = new ArrayDeque<>(starts);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            if (!depthOmittedIds.add(current)) {
                continue;
            }
            for (RelationshipEntity edge : outgoingLineage.getOrDefault(current, List.of())) {
                queue.add(edge.getToPersonId());
            }
        }
    }

    private void detectBranchCycles(
            Set<Long> selectedIds,
            List<RelationshipEntity> relationships,
            TreeGraphAccumulator graph
    ) {
        Map<Long, List<Long>> adjacency = relationships.stream()
                .filter(this::isLineageRelationship)
                .filter(edge -> selectedIds.contains(edge.getFromPersonId())
                        && selectedIds.contains(edge.getToPersonId()))
                .collect(Collectors.groupingBy(
                        RelationshipEntity::getFromPersonId,
                        LinkedHashMap::new,
                        Collectors.mapping(RelationshipEntity::getToPersonId, Collectors.toList())
                ));
        Map<Long, VisitColor> colors = new HashMap<>();
        for (Long nodeId : selectedIds) {
            if (colors.getOrDefault(nodeId, VisitColor.WHITE) == VisitColor.WHITE) {
                detectCyclesDepthFirst(nodeId, adjacency, colors, graph);
            }
        }
    }

    private void detectCyclesDepthFirst(
            Long nodeId,
            Map<Long, List<Long>> adjacency,
            Map<Long, VisitColor> colors,
            TreeGraphAccumulator graph
    ) {
        colors.put(nodeId, VisitColor.GRAY);
        for (Long nextId : adjacency.getOrDefault(nodeId, List.of())) {
            VisitColor color = colors.getOrDefault(nextId, VisitColor.WHITE);
            if (nextId.equals(nodeId) || color == VisitColor.GRAY) {
                graph.recordCycle();
            } else if (color == VisitColor.WHITE) {
                detectCyclesDepthFirst(nextId, adjacency, colors, graph);
            }
        }
        colors.put(nodeId, VisitColor.BLACK);
    }

    private TreeGraphResponse maskedRootGraph(
            PersonProjection rootProjection,
            String direction,
            String dataView,
            QueryLimits limits
    ) {
        TreeNodeResponse masked = new TreeNodeResponse(
                "masked-root",
                null,
                rootProjection.displayName(),
                rootProjection.displayName(),
                "masked",
                rootProjection.maskReason(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
        TreeGraphMeta meta = new TreeGraphMeta(
                limits.requestedDepth(),
                limits.appliedDepth(),
                1,
                0,
                false,
                List.of(),
                false,
                0,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        return new TreeGraphResponse(
                "masked-root",
                null,
                direction,
                dataView,
                List.of(masked),
                List.of(),
                meta,
                List.of(new TreeGraphWarning(
                        "root_filtered", "根人物不可见或已被安全过滤", 1
                ))
        );
    }

    private boolean addFullNode(
            TreeGraphAccumulator graph,
            Map<Long, PersonProjection> projections,
            PersonProjection projection
    ) {
        if (projection.visibility() != Visibility.FULL || projection.response() == null) {
            return false;
        }
        Long personId = projection.entity().getId();
        if (!graph.addNode(personId, toNode(projection))) {
            return false;
        }
        projections.putIfAbsent(personId, projection);
        return true;
    }

    private TreeNodeResponse toNode(PersonProjection projection) {
        return new TreeNodeResponse(
                "person-" + projection.entity().getId(),
                projection.response().id(),
                projection.response().name(),
                projection.response().name(),
                "visible",
                null,
                projection.response().gender(),
                projection.response().generationNo(),
                projection.response().generationWord(),
                projection.response().branchId(),
                null,
                null,
                null,
                projection.entity().getDataStatus(),
                projection.entity().getPrivacyLevel()
        );
    }

    private TreeEdgeResponse toEdge(RelationshipEntity relationship) {
        String category = relationCategory(relationship);
        return new TreeEdgeResponse(
                edgeKey(relationship),
                relationship.getId(),
                "person-" + relationship.getFromPersonId(),
                relationship.getFromPersonId(),
                "person-" + relationship.getToPersonId(),
                relationship.getToPersonId(),
                relationship.getRelationType(),
                relationship.getRelationLabel(),
                category,
                SCOPE_RITUAL.equals(category) ? relationship.getRelationType() : null,
                "visible",
                relationship.getIsLineageRelation(),
                null,
                null,
                relationship.getDataStatus(),
                null
        );
    }

    private String edgeKey(RelationshipEntity relationship) {
        if (relationship.getId() != null) {
            return "relationship-" + relationship.getId();
        }
        return "edge-" + relationship.getFromPersonId()
                + "-" + relationship.getToPersonId()
                + "-" + String.valueOf(relationship.getRelationType());
    }

    private Set<Long> findBranchScopeIds(Long clanId, BranchEntity rootBranch) {
        String rootPath = rootBranch.getBranchPath();
        return branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).stream()
                .filter(branch -> branch.getId().equals(rootBranch.getId())
                        || isDescendant(rootPath, branch.getBranchPath()))
                .map(BranchEntity::getId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private boolean isDescendant(String rootPath, String candidatePath) {
        return rootPath != null && !rootPath.isBlank()
                && candidatePath != null && !candidatePath.isBlank()
                && (candidatePath.equals(rootPath) || candidatePath.startsWith(rootPath + "/"));
    }

    private Long chooseBranchRoot(
            BranchEntity rootBranch,
            Set<Long> selectedIds,
            List<RelationshipEntity> relationships
    ) {
        if (rootBranch.getFounderPersonId() != null
                && selectedIds.contains(rootBranch.getFounderPersonId())) {
            return rootBranch.getFounderPersonId();
        }
        Set<Long> childIds = relationships.stream()
                .filter(this::isLineageRelationship)
                .filter(edge -> selectedIds.contains(edge.getFromPersonId())
                        && selectedIds.contains(edge.getToPersonId()))
                .map(RelationshipEntity::getToPersonId)
                .collect(Collectors.toSet());
        return selectedIds.stream()
                .filter(id -> !childIds.contains(id))
                .findFirst()
                .or(() -> selectedIds.stream().findFirst())
                .orElse(null);
    }

    private Comparator<PersonEntity> personComparator() {
        return Comparator
                .comparing((PersonEntity person) -> person.getGenerationNo() == null
                        ? Integer.MAX_VALUE : person.getGenerationNo())
                .thenComparing(person -> person.getPersonCode() == null ? "" : person.getPersonCode())
                .thenComparing(PersonEntity::getId);
    }

    private String personSortKey(PersonEntity person) {
        int generation = person.getGenerationNo() == null ? 9999 : person.getGenerationNo();
        long personId = person.getId() == null ? Long.MAX_VALUE : person.getId();
        return String.format("%04d-%010d", generation, personId);
    }

    private PersonEntity getPerson(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
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
        String relationType = relationship.getRelationType() == null
                ? ""
                : relationship.getRelationType().trim().toLowerCase(Locale.ROOT);
        return switch (relationType) {
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
                .flatMap(value -> Arrays.stream(value.split(",")))
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
        if (!Set.of(
                DIRECTION_FAMILY, DIRECTION_ANCESTORS, DIRECTION_DESCENDANTS, DIRECTION_BOTH
        ).contains(normalized)) {
            throw new BusinessException("TREE_DIRECTION_INVALID", "世系图谱查询方向无效");
        }
        return normalized;
    }

    private QueryLimits normalizeLimits(Integer maxDepth, Integer maxNodes, Integer maxEdges) {
        int requestedDepth = maxDepth == null || maxDepth < 1 ? DEFAULT_DEPTH : maxDepth;
        int appliedDepth = Math.min(requestedDepth, MAX_DEPTH);
        int appliedNodes = maxNodes == null || maxNodes < 1
                ? DEFAULT_NODES : Math.min(maxNodes, MAX_NODES);
        int appliedEdges = maxEdges == null || maxEdges < 1
                ? DEFAULT_EDGES : Math.min(maxEdges, MAX_EDGES);
        return new QueryLimits(requestedDepth, appliedDepth, appliedNodes, appliedEdges);
    }

    private enum VisitColor {
        WHITE,
        GRAY,
        BLACK
    }

    private record QueryLimits(int requestedDepth, int appliedDepth, int maxNodes, int maxEdges) {
    }

    private record TraversalState(Long personId, int depth, Set<Long> path) {
    }

    private record PersonDepth(Long personId, int depth) {
    }
}
