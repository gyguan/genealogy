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
        List<HomeDashboardBucketResponse> branchDistribution,
        List<HomeDashboardBucketResponse> sourceTypeDistribution,
        HomeDashboardCompletenessResponse completeness,
        HomeDashboardBranchCoverageResponse branchCoverage,
        List<HomeDashboardTrendPointResponse> trendPoints,
        List<HomeDashboardRiskResponse> risks,
        List<HomeDashboardActivityResponse> recentActivities
) {
}
