package com.genealogy.imports.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RelationshipImportRowRetryRequest(
        @NotBlank @Size(max = 100) String fromPersonCode,
        @NotBlank @Size(max = 100) String toPersonCode,
        @NotBlank String relationshipType,
        @Size(max = 500) String description,
        @NotNull Long expectedVersion
) {
}
