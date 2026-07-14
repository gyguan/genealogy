package com.genealogy.imports.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SourceImportRowRetryRequest(
        @NotBlank String sourceName,
        @NotBlank String sourceType,
        String providerName,
        String bookTitle,
        String volumeNo,
        String pageNo,
        String sourceDate,
        String collectionLocation,
        String sourceDescription,
        String excerpt,
        String confidenceLevel,
        @NotBlank String privacyLevel,
        String sensitiveLevel,
        @NotNull Long expectedVersion
) {
}
