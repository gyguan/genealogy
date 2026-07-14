package com.genealogy.imports.dto;

public record SourceImportPreviewRowResponse(
        Integer rowNo,
        String sourceName,
        String sourceType,
        String providerName,
        String bookTitle,
        String sourceDate,
        String privacyLevel,
        Boolean duplicated,
        String errorMessage,
        String rawData
) {
}
