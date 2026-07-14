package com.genealogy.culture.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CultureItemCreateRequest(
        @Positive Long branchId,
        @NotBlank @Size(max = 40) String category,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 1000) String summary,
        @Size(max = 200000) String content,
        @Size(max = 200) String historicalPeriod,
        @Size(max = 500) String locationText,
        @NotBlank @Size(max = 20) String confidenceLevel,
        @NotBlank @Size(max = 32) String privacyLevel,
        @NotBlank @Size(max = 32) String sensitiveLevel,
        @NotNull Boolean featuredOnHome,
        @NotNull @Min(0) Integer sortOrder
) {
}
