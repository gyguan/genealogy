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
        Long latestReviewTaskId,
        String executionMode,
        String executionStatus,
        String executionStage,
        Integer processedCount,
        Integer publishedCount,
        Integer chunkSize,
        Integer executionRetryCount,
        Integer executionMaxRetries,
        Boolean manualInterventionRequired,
        LocalDateTime nextRetryAt,
        LocalDateTime heartbeatAt
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
        ImportJobDescriptor descriptor = descriptor(importType, originalFilename);
        this(
                id,
                descriptor.importType(),
                descriptor.fileFormat(),
                descriptor.legacyImportType(),
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
                latestReviewTaskId,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private static ImportJobDescriptor descriptor(String importType, String originalFilename) {
        return ImportJobDescriptor.resolve(importType, null, originalFilename);
    }
}
