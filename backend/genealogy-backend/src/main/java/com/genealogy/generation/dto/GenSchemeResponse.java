package com.genealogy.generation.dto;

import java.time.LocalDateTime;

public record GenSchemeResponse(
        Long id,
        Long clanId,
        Long branchId,
        String schemeName,
        String poemText,
        Integer startGeneration,
        Boolean isDefault,
        Boolean validationEnabled,
        Boolean strictMode,
        String status,
        LocalDateTime createdAt
) {
}
