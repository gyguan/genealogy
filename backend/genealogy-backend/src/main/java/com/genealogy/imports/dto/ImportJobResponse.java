package com.genealogy.imports.dto;

import com.genealogy.imports.domain.ImportJobDescriptor;

import java.time.LocalDateTime;
import java.util.List;

public record ImportJobResponse(
        Long id,
        Long clanId,
        Long branchId,
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
        List<ImportRowErrorResponse> errors,
        String processingStatus,
        String reviewStatus,
        Integer reviewRound,
        Long latestReviewTaskId
) {

    /**
     * Compatibility constructor for callers that still pass a combined import type.
     */
    public ImportJobResponse(
            Long id,
            Long clanId,
            Long branchId,
            String importType,
            String originalFilename,
            Integer totalCount,
            Integer successCount,
            Integer failureCount,
            String status,
            String errorSummary,
            LocalDateTime createdAt,
            List<ImportRowErrorResponse> errors
    ) {
        this(id, clanId, branchId, importType, originalFilename, totalCount, successCount, failureCount, status,
                errorSummary, createdAt, errors, null, null, null, null);
    }

    /**
     * Compatibility constructor for callers using the previous full response shape.
     */
    public ImportJobResponse(
            Long id,
            Long clanId,
            Long branchId,
            String importType,
            String originalFilename,
            Integer totalCount,
            Integer successCount,
            Integer failureCount,
            String status,
            String errorSummary,
            LocalDateTime createdAt,
            List<ImportRowErrorResponse> errors,
            String processingStatus,
            String reviewStatus,
            Integer reviewRound,
            Long latestReviewTaskId
    ) {
        this(
                id,
                clanId,
                branchId,
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
                errors,
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
