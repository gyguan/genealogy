package com.genealogy.culture.dto;

public record CultureSourceSummaryResponse(
        Long sourceId,
        String sourceName,
        String sourceType,
        String excerpt,
        String confidenceLevel,
        String bindingStatus
) {
}
