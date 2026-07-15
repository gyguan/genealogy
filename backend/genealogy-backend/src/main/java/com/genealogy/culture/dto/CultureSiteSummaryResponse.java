package com.genealogy.culture.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record CultureSiteSummaryResponse(
        Long id,
        CultureScopeResponse scope,
        String siteType,
        String siteName,
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
        OffsetDateTime updatedAt
) {
}
