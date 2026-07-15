package com.genealogy.culture.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record MigrationEventDetailResponse(
        Long id,
        CultureScopeResponse scope,
        Integer sequenceNo,
        String fromLocation,
        String toLocation,
        String migrationTimeText,
        Long founderPersonId,
        String founderPersonName,
        String reason,
        String confidenceLevel,
        String privacyLevel,
        String sensitiveLevel,
        String dataStatus,
        Integer sourceCount,
        List<String> allowedActions,
        Long version,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String description,
        List<CultureSourceSummaryResponse> sources,
        CultureReviewSummaryResponse review
) {
}
