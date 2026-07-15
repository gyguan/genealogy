package com.genealogy.culture.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record MigrationEventUpdateRequest(
        @Positive Long branchId,
        @Positive Integer sequenceNo,
        @NotBlank @Size(max = 500) String fromLocation,
        @NotBlank @Size(max = 500) String toLocation,
        @Size(max = 200) String migrationTimeText,
        @Positive Long founderPersonId,
        @Size(max = 1000) String reason,
        @Size(max = 200000) String description,
        @NotBlank @Size(max = 20) String confidenceLevel,
        @NotBlank @Size(max = 32) String privacyLevel,
        @NotBlank @Size(max = 32) String sensitiveLevel,
        @NotNull @Min(0) Long version
) {
}
