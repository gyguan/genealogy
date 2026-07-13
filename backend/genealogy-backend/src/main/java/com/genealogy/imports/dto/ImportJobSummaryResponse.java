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
        this(id, importType, originalFilename, totalCount, successCount, failureCount, status, errorSummary, createdAt,
                null, null, null, null);
    }

    /**
     * Compatibility constructor for callers using the previous full summary shape.
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
            LocalDateTime createdAt,
            String processingStatus,
            String reviewStatus,
            Integer reviewRound,
            Long latestReviewTaskId
    ) {
        this(
                id,
                descriptor(importType, originalFilename).importType(),
                descriptor(importType, originalFilename).fileFormat(),
                descriptor(importType, originalFilename).legacyImportType(),
                originalFilename,
                totalCount,
                successCount,
                failureCount,
                status,
                errorSummary,
                createdAt,
                processingStatus,
                reviewStatus,
                reviewRound,
                latestReviewTaskId
        );
    }

    private static ImportJobDescriptor descriptor(String importType, String originalFilename) {
        return ImportJobDescriptor.resolve(importType, null, originalFilename);
    }
}
