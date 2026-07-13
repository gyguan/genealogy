package com.genealogy.imports.dto;

import com.genealogy.imports.domain.ImportJobDescriptor;

import java.time.LocalDateTime;

public record ImportJobSummaryResponse(
        Long id,
        String importType,
        String fileFormat,
        String legacyImportType,
        String originalFilename,
        Integer totalCount,
        Integer successCount,
        Integer failureCount,
        String status,
        String errorSummary,
        LocalDateTime createdAt,
        String processingStatus,
        String reviewStatus,
        Integer reviewRound,
        Long latestReviewTaskId
) {

    /**
     * Compatibility constructor for callers that still pass a combined import type.
     */
    public ImportJobSummaryResponse(
            Long id,
            String importType,
            String originalFilename,
            Integer totalCount,
            Integer successCount,
            Integer failureCount,
            String status,
            String errorSummary,
            LocalDateTime createdAt
    ) {
        this(
                id,
                ImportJobDescriptor.resolve(importType, null, originalFilename).importType(),
                ImportJobDescriptor.resolve(importType, null, originalFilename).fileFormat(),
                ImportJobDescriptor.resolve(importType, null, originalFilename).legacyImportType(),
                originalFilename,
                totalCount,
                successCount,
                failureCount,
                status,
                errorSummary,
                createdAt,
                null,
                null,
                null,
                null
        );
    }
}
