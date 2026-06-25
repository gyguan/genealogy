package com.genealogy.generation.dto;

import jakarta.validation.constraints.NotBlank;

public record GenSchemeCreateRequest(
        Long branchId,
        @NotBlank String schemeName,
        String poemText,
        Integer startGeneration,
        Boolean isDefault,
        Boolean validationEnabled,
        Boolean strictMode
) {
}
