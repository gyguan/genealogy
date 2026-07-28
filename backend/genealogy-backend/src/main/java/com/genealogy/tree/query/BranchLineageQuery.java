package com.genealogy.tree.query;

import java.util.Set;

public record BranchLineageQuery(
        Long clanId,
        Long branchId,
        boolean includeSubBranches,
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
