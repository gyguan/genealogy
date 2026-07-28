package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Compatibility facade for Tree API use cases.
 *
 * <p>This class owns transaction boundaries and dependency coordination only. Graph
 * traversal, branch component selection, cycle detection and response construction are
 * implemented by the dedicated graph components.</p>
 */
@Service
public class TreeApplicationService {
    private final TreeGraphEngine engine;

    public TreeApplicationService(TreeGraphEngine engine) {
        this.engine = engine;
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse personLineage(
            Long personId, String direction, List<String> relationScopes, String dataView,
            Integer maxDepth, Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.personLineage(personId, direction, relationScopes, dataView,
                maxDepth, maxNodes, maxEdges, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse family(
            Long personId, List<String> relationScopes, String dataView,
            Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.family(personId, relationScopes, dataView, maxNodes, maxEdges, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse descendants(
            Long rootPersonId, Integer maxDepth, List<String> relationScopes, String dataView,
            Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.descendants(rootPersonId, maxDepth, relationScopes, dataView,
                maxNodes, maxEdges, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse ancestors(
            Long personId, Integer maxDepth, List<String> relationScopes, String dataView,
            Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.ancestors(personId, maxDepth, relationScopes, dataView,
                maxNodes, maxEdges, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse branchLineage(
            Long clanId, Long branchId, boolean includeSubBranches,
            List<String> relationScopes, String dataView, Integer maxDepth,
            Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.branchLineage(clanId, branchId, includeSubBranches, relationScopes,
                dataView, maxDepth, maxNodes, maxEdges, actorId);
    }
}
