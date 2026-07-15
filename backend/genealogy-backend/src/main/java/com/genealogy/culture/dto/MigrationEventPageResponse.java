package com.genealogy.culture.dto;

import java.util.List;

public record MigrationEventPageResponse(
        List<MigrationEventSummaryResponse> items,
        CulturePageMetadata page
) {
}
