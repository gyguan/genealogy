package com.genealogy.clan.dto;

public record ClanStatisticsResponse(
        Long clanId,
        long branchCount,
        long personCount,
        long relationshipCount
) {
}
