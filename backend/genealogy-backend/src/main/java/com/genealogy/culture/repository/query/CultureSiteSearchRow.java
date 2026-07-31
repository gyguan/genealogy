package com.genealogy.culture.repository.query;

import java.util.Collection;
import java.util.List;

public record CultureSiteSearchRow(
        Long clanId,
        Long actorId,
        String keyword,
        List<String> siteTypes,
        List<Long> branchIds,
        String addressText,
        String foundedPeriod,
        String currentStatus,
        Long relatedPersonId,
        List<String> dataStatuses,
        String privacyLevel,
        Boolean featuredOnHome,
        boolean readFullClan,
        Collection<Long> readBranchIds,
        boolean sensitiveFullClan,
        Collection<Long> sensitiveBranchIds,
        String sortKey
) { }
