package com.genealogy.tree.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeGraphMeta;
import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.dto.TreeGraphWarning;
import com.genealogy.tree.dto.TreeNodeResponse;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Completes the person-centered graph with siblings that are not part of the
 * ancestor-only or descendant-only traversal paths.
 *
 * <p>The base Tree service remains the source of truth for permissions,
 * privacy projection, status filtering, relation-scope filtering and graph
 * limits. For each already-visible direct parent, this service reuses the
 * secured family query and only merges the parent's other lineage children.
 * This keeps branch-global and ancestor/descendant-only semantics unchanged.</p>
 */
@Service
@Primary
public class PersonCenteredTreeApplicationService extends TreeApplicationService {

    private static final String DIRECTION_FAMILY = "family";
    private static final String DIRECTION_BOTH = "both";
    private static final String LINEAGE_RELATION_TYPE = "parent_child";
    private static final int DEFAULT_MAX_NODES = 500;
    private static final int MAX_MAX_NODES = 2000;
    private static final int DEFAULT_MAX_EDGES = 1000;
    private static final int MAX_MAX_EDGES = 4000;

    public PersonCenteredTreeApplicationService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            BranchRepository branchRepository,
            TreeVisibilityApplicationService visibilityApplicationService
    ) {
        super(personRepository, relationshipRepository, branchRepository, visibilityApplicationService);
    }

    @Override
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
        TreeGraphResponse baseGraph = super.personLineage(
                personId,
                direction,
                relationScopes,
                dataView,
                maxDepth,
                maxNodes,
                maxEdges,
                actorId
        );
        if (baseGraph.rootPersonId() == null
                || (!DIRECTION_FAMILY.equals(baseGraph.direction())
                && !DIRECTION_BOTH.equals(baseGraph.direction()))) {
            return baseGraph;
        }
        return appendVisibleSiblings(
                baseGraph,
                personId,
                relationScopes,
                dataView,
                maxNodes,
                maxEdges,
                actorId
        );
    }

    private TreeGraphResponse appendVisibleSiblings(
            TreeGraphResponse baseGraph,
            Long centerPersonId,
            List<String> relationScopes,
            String dataView,
            Integer maxNodes,
            Integer maxEdges,
            Long actorId
    ) {
        Set<Long> parentIds = baseGraph.edges().stream()
                .filter(this::isLineageEdge)
                .filter(edge -> centerPersonId.equals(edge.toPersonId()))
                .map(TreeEdgeResponse::fromPersonId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (parentIds.isEmpty()) {
            return baseGraph;
        }

        int nodeLimit = normalizeLimit(maxNodes, DEFAULT_MAX_NODES, MAX_MAX_NODES);
        int edgeLimit = normalizeLimit(maxEdges, DEFAULT_MAX_EDGES, MAX_MAX_EDGES);
        Map<String, TreeNodeResponse> nodes = baseGraph.nodes().stream()
                .collect(Collectors.toMap(
                        TreeNodeResponse::nodeId,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
        Map<String, TreeEdgeResponse> edges = baseGraph.edges().stream()
                .collect(Collectors.toMap(
                        TreeEdgeResponse::edgeId,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
        boolean nodeLimitReached = false;
        boolean edgeLimitReached = false;

        for (Long parentId : parentIds) {
            if (nodes.size() >= nodeLimit || edges.size() >= edgeLimit) {
                nodeLimitReached = nodes.size() >= nodeLimit;
                edgeLimitReached = edges.size() >= edgeLimit;
                break;
            }
            TreeGraphResponse parentFamily = super.personLineage(
                    parentId,
                    DIRECTION_FAMILY,
                    relationScopes,
                    dataView,
                    1,
                    maxNodes,
                    maxEdges,
                    actorId
            );
            Map<Long, TreeNodeResponse> familyNodesByPersonId = parentFamily.nodes().stream()
                    .filter(node -> node.personId() != null)
                    .collect(Collectors.toMap(
                            TreeNodeResponse::personId,
                            Function.identity(),
                            (left, right) -> left,
                            LinkedHashMap::new
                    ));

            for (TreeEdgeResponse edge : parentFamily.edges()) {
                if (!isLineageEdge(edge)
                        || !parentId.equals(edge.fromPersonId())
                        || edge.toPersonId() == null
                        || centerPersonId.equals(edge.toPersonId())) {
                    continue;
                }
                TreeNodeResponse sibling = familyNodesByPersonId.get(edge.toPersonId());
                if (sibling == null) {
                    continue;
                }
                if (!nodes.containsKey(sibling.nodeId())) {
                    if (nodes.size() >= nodeLimit) {
                        nodeLimitReached = true;
                        continue;
                    }
                    nodes.put(sibling.nodeId(), sibling);
                }
                if (!edges.containsKey(edge.edgeId())) {
                    if (edges.size() >= edgeLimit) {
                        edgeLimitReached = true;
                        continue;
                    }
                    edges.put(edge.edgeId(), edge);
                }
            }
        }

        if (nodes.size() == baseGraph.nodes().size()
                && edges.size() == baseGraph.edges().size()
                && !nodeLimitReached
                && !edgeLimitReached) {
            return baseGraph;
        }

        TreeGraphMeta meta = mergeMeta(
                baseGraph.meta(),
                nodes.size(),
                edges.size(),
                nodeLimitReached,
                edgeLimitReached
        );
        List<TreeGraphWarning> warnings = mergeWarnings(
                baseGraph.warnings(),
                nodeLimitReached,
                edgeLimitReached
        );
        return new TreeGraphResponse(
                baseGraph.rootNodeId(),
                baseGraph.rootPersonId(),
                baseGraph.direction(),
                baseGraph.dataView(),
                new ArrayList<>(nodes.values()),
                new ArrayList<>(edges.values()),
                meta,
                warnings
        );
    }

    private boolean isLineageEdge(TreeEdgeResponse edge) {
        return LINEAGE_RELATION_TYPE.equals(edge.relationType())
                || Boolean.TRUE.equals(edge.isLineageRelation());
    }

    private int normalizeLimit(Integer value, int defaultValue, int maximum) {
        if (value == null) {
            return defaultValue;
        }
        return Math.min(maximum, Math.max(1, value));
    }

    private TreeGraphMeta mergeMeta(
            TreeGraphMeta original,
            int nodeCount,
            int edgeCount,
            boolean nodeLimitReached,
            boolean edgeLimitReached
    ) {
        if (original == null) {
            return null;
        }
        LinkedHashSet<String> reasons = new LinkedHashSet<>(original.truncationReasons());
        if (nodeLimitReached) {
            reasons.add("max_nodes");
        }
        if (edgeLimitReached) {
            reasons.add("max_edges");
        }
        return new TreeGraphMeta(
                original.requestedDepth(),
                original.appliedDepth(),
                nodeCount,
                edgeCount,
                original.truncated() || nodeLimitReached || edgeLimitReached,
                new ArrayList<>(reasons),
                original.cycleDetected(),
                original.duplicateEdgeCount(),
                original.generatedAt()
        );
    }

    private List<TreeGraphWarning> mergeWarnings(
            List<TreeGraphWarning> original,
            boolean nodeLimitReached,
            boolean edgeLimitReached
    ) {
        Map<String, TreeGraphWarning> warnings = original.stream()
                .collect(Collectors.toMap(
                        TreeGraphWarning::code,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
        if (nodeLimitReached) {
            warnings.putIfAbsent(
                    "node_limit_reached",
                    new TreeGraphWarning("node_limit_reached", "已达到节点容量边界，结果已安全截断", 1)
            );
        }
        if (edgeLimitReached) {
            warnings.putIfAbsent(
                    "edge_limit_reached",
                    new TreeGraphWarning("edge_limit_reached", "已达到关系边容量边界，结果已安全截断", 1)
            );
        }
        return new ArrayList<>(warnings.values());
    }
}
