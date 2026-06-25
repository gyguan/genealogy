package com.genealogy.source.dto;

import jakarta.validation.constraints.NotBlank;

public record SourceCreateRequest(
        @NotBlank
        String sourceName,

        @NotBlank
        String sourceType,

        String providerName,
        String bookTitle,
        String volumeNo,
        String pageNo,
        String excerpt,
        String verificationStatus,
        String description
) {
}
