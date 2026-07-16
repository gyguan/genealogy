package com.genealogy.home.dto;

public record HomeDashboardBranchCoverageResponse(
        long coveredBranchCount,
        long totalBranchCount,
        double coverageRate
) {
}
