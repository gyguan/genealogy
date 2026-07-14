package com.genealogy.culture.dto;

public record CultureItemSearchCriteria(
        String keyword,
        String category,
        Long branchId,
        String dataStatus,
        String privacyLevel,
        Boolean hasSource,
        Boolean featuredOnHome,
        String sort
) {
}
