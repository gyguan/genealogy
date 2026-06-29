package com.genealogy.person.dto;

public record PersonSearchQuery(
        Long clanId,
        Long branchId,
        String keyword,
        String name,
        String gender,
        Integer generationNo,
        String generationWord,
        String dataStatus
) {
}
