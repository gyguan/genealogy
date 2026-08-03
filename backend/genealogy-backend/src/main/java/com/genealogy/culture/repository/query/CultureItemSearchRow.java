package com.genealogy.culture.repository.query;

import java.util.Collection;
import java.util.List;

public record CultureItemSearchRow(
        Long clanId,
        Long actorId,
        String keyword,
        List<String> categories,
        List<Long> branchIds,
        List<String> dataStatuses,
        List<String> privacyLevels,
        Boolean hasSource,
        Boolean featuredOnHome,
        boolean readFullClan,
        Collection<Long> readBranchIds,
        boolean updateFullClan,
        Collection<Long> updateBranchIds,
        String sortKey
) { }
