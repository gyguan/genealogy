package com.genealogy.culture.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record CultureSiteDetailResponse(
        Long id,
        CultureScopeResponse scope,
        String siteType,
        String name,
        String addressText,
        String foundedPeriod,
        String currentStatus,
        String summary,
        BigDecimal latitude,
        BigDecimal longitude,
        Long relatedPersonId,
        String relatedPersonName,
        String confidenceLevel,
        String privacyLevel,
        String sensitiveLevel,
        String dataStatus,
        Boolean featuredOnHome,
        Integer sortOrder,
        Integer sourceCount,
        Integer attachmentCount,
        List<String> allowedActions,
        Long version,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String description,
        List<CultureSourceSummaryResponse> sources,
        List<CultureAttachmentSummaryResponse> attachments,
        CultureReviewSummaryResponse review
) {}
