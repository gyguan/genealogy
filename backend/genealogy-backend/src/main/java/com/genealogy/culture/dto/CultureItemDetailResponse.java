package com.genealogy.culture.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record CultureItemDetailResponse(
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
        OffsetDateTime updatedAt,
        String content,
        List<CultureSourceSummaryResponse> sources,
        List<CultureAttachmentSummaryResponse> attachments,
        CultureReviewSummaryResponse review
) {
    public CultureItemDetailResponse {
        allowedActions = allowedActions == null ? List.of() : List.copyOf(allowedActions);
        sources = sources == null ? List.of() : List.copyOf(sources);
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
        review = review == null ? CultureReviewSummaryResponse.empty() : review;
    }
}
