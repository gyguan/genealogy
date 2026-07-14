package com.genealogy.imports.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ImportRowBulkExcludeRequest(
        @NotNull @Valid ImportRowBulkSelectionRequest selection,
        @NotBlank @Size(max = 500) String reason
) {
}
