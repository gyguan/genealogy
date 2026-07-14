package com.genealogy.culture.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record CultureItemSummaryResponse(
        Long id,
        CultureScopeResponse scope,
        String category,
        String title,
        String summary,
        String historicalPeriod,
        String locationText,
        String confidenceLevel,
        String privacyLevel,
        String sensitiveLevel,
        String dataStatus,
        boolean featuredOnHome,
        int sortOrder,
        int sourceCount,
        int attachmentCount,
        int reviewCount,
        List<String> allowedActions,
        Long version,
        String createdByName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public CultureItemSummaryResponse {
        allowedActions = allowedActions == null ? List.of() : List.copyOf(allowedActions);
    }
}
