package com.genealogy.culture.dto;

public record MigrationEventSearchCriteria(
        String keyword,
        Long branchId,
        String fromLocation,
        String toLocation,
        String migrationTimeText,
        Long founderPersonId,
        String dataStatus,
        String privacyLevel,
        String sort
) {
}
