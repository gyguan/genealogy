package com.genealogy.source.dto;

import java.time.LocalDateTime;

public record SourceBindingSummaryResponse(
        Long id,
        String targetType,
        Long targetId,
        String targetDisplayName,
        String targetBranchName,
        String targetSummary,
        String bindingReason,
        String excerpt,
        String confidenceLevel,
        String bindingStatus,
        boolean hasPendingRevision,
        String pendingChangeType,
        Long createdBy,
        LocalDateTime createdAt
) {
}
