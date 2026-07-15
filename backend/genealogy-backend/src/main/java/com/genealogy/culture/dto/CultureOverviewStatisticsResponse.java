package com.genealogy.culture.dto;

public record CultureOverviewStatisticsResponse(
        long officialItemCount,
        long pendingReviewCount,
        double sourceCoverageRate
) {
}
