package com.genealogy.culture.dto;

public record CultureOverviewEntryResponse(
        String type,
        String category,
        String title,
        String subtitle,
        String status,
        int sourceCount,
        double sourceCoverageRate,
        String targetTab,
        String targetQueryKey,
        String targetQueryValue
) {
}
