package com.genealogy.culture.dto;

import java.util.List;

public record CultureOverviewResponse(
        Long clanId,
        String clanName,
        CultureOverviewStatisticsResponse statistics,
        List<CultureItemSummaryResponse> featuredItems,
        List<MigrationEventSummaryResponse> migrationHighlights,
        List<CultureSiteSummaryResponse> siteHighlights,
        List<String> missingHints
) {
}
