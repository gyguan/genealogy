package com.genealogy.culture.dto;

public record CultureQualityMetricResponse(
        String targetType,
        String targetTypeName,
        long officialCount,
        long pendingReviewCount,
        long sourceCoveredCount,
        double sourceCoverageRate,
        long strongSourceCount,
        double strongSourceCoverageRate,
        long completeCount,
        double completenessRate,
        long lowConfidenceCount,
        long staleCount
) {
}
