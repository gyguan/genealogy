package com.genealogy.review.repository;

import java.time.LocalDateTime;
import java.util.Set;

public record ReviewTaskQueryCriteria(
        Long clanId,
        Long actorId,
        String view,
        String scope,
        String targetType,
        Long targetId,
        String status,
        Long branchId,
        LocalDateTime submittedFrom,
        LocalDateTime submittedTo,
        LocalDateTime processedFrom,
        LocalDateTime processedTo,
        boolean enforceBranchScope,
        boolean fullClanAccess,
        Set<Long> visibleBranchIds
) {

    public ReviewTaskQueryCriteria {
        visibleBranchIds = visibleBranchIds == null ? Set.of() : Set.copyOf(visibleBranchIds);
    }
}
