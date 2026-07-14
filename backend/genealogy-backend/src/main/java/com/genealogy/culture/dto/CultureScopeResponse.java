package com.genealogy.culture.dto;

public record CultureScopeResponse(
        Long clanId,
        String clanName,
        Long branchId,
        String branchName
) {
}
