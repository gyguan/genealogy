package com.genealogy.culture.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MigrationEventCreateRequest(
        @NotNull Long branchId,
        @NotNull @Min(1) @Max(100000) Integer sequenceNo,
        @NotBlank @Size(max = 500) String fromLocation,
        @NotBlank @Size(max = 500) String toLocation,
        @Size(max = 200) String migrationTimeText,
        Long founderPersonId,
        @Size(max = 1000) String reason,
        @Size(max = 200000) String description,
        @NotBlank String confidenceLevel,
        @NotBlank String privacyLevel,
        @NotBlank String sensitiveLevel
) {
}
