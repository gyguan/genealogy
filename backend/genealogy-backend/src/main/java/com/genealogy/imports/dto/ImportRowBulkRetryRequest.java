package com.genealogy.imports.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record ImportRowBulkRetryRequest(
        @NotNull @Valid ImportRowBulkSelectionRequest selection
) {
}
