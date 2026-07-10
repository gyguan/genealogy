package com.genealogy.source.dto;

import java.time.LocalDateTime;

public record SourceBindingSummaryResponse(
        Long id,
        String targetType,
        Long targetId,
        String targetDisplayName,
        String bindingReason,
        String excerpt,
        String confidenceLevel,
        String bindingStatus,
        Long createdBy,
        LocalDateTime createdAt
) {
}
