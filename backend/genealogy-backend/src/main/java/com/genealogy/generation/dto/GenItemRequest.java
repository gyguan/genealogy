package com.genealogy.generation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GenItemRequest(
        @NotNull Integer generationNo,
        @NotBlank String word,
        String description,
        Integer sortOrder
) {
}
