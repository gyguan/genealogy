package com.genealogy.tree.query;

import java.util.Set;

public record PersonLineageQuery(
        Long personId,
        TreeDirection direction,
        Set<RelationCategory> relationCategories,
        String dataView,
        int requestedDepth,
        int appliedDepth,
        int maxNodes,
        int maxEdges,
        Long actorId
) {
    public java.util.List<String> relationScopes() {
        return relationCategories.stream().map(RelationCategory::apiValue).toList();
    }
}
