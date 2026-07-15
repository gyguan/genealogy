package com.genealogy.culture.dto;

public record CultureSiteSearchCriteria(
        String keyword,
        String siteType,
        Long branchId,
        String addressText,
        String foundedPeriod,
        String currentStatus,
        Long relatedPersonId,
        String dataStatus,
        String privacyLevel,
        Boolean featuredOnHome,
        String sort
) {
}
