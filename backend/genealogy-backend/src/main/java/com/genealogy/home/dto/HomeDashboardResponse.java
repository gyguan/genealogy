package com.genealogy.home.dto;

import java.time.LocalDateTime;
import java.util.List;

public record HomeDashboardResponse(
        Long clanId,
        LocalDateTime asOf,
        long peopleTotal,
        long branchCount,
        long sourceCount,
        long pendingReviewCount,
        List<HomeDashboardBucketResponse> genderDistribution,
        List<HomeDashboardBucketResponse> livingDistribution,
        List<HomeDashboardBucketResponse> generationDistribution,
        HomeDashboardCompletenessResponse completeness,
        HomeDashboardBranchCoverageResponse branchCoverage
) {
}
