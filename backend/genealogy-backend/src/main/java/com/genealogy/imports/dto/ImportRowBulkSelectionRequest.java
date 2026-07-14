package com.genealogy.imports.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ImportRowBulkSelectionRequest(
        @NotBlank String mode,
        @Size(max = 500) List<@Valid ImportRowVersionReference> rows
) {
}
