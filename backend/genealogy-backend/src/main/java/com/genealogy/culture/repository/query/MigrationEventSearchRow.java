package com.genealogy.culture.repository.query;

import java.util.Collection;
import java.util.List;

public record MigrationEventSearchRow(
        Long clanId,
        Long actorId,
        String keyword,
        List<Long> branchIds,
        String fromLocation,
        String toLocation,
        String migrationTimeText,
        Long founderPersonId,
        List<String> dataStatuses,
        String privacyLevel,
        Collection<Long> readableBranchIds,
        Collection<Long> sensitiveBranchIds,
        String sortKey
) { }
