package com.genealogy.culture.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CultureSiteCreateRequest(
        Long branchId,
        Long relatedPersonId,
        @NotBlank String siteType,
        @NotBlank @Size(max = 200) String siteName,
        @Size(max = 500) String addressText,
        @Size(max = 200) String foundedPeriod,
        @Size(max = 100) String currentStatus,
        @Size(max = 1000) String summary,
        @Size(max = 200000) String description,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
        @NotBlank String confidenceLevel,
        @NotBlank String privacyLevel,
        @NotBlank String sensitiveLevel,
        Boolean featuredOnHome,
        @Min(0) Integer sortOrder
) {
}
