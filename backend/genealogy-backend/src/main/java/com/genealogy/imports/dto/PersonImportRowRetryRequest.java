package com.genealogy.imports.dto;

import jakarta.validation.constraints.NotNull;

public record PersonImportRowRetryRequest(
        String name,
        String gender,
        Integer generationNo,
        String generationWord,
        String birthDate,
        Boolean isLiving,
        Boolean confirmDuplicates,
        @NotNull Long expectedVersion
) {
}
