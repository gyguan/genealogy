package com.genealogy.imports.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ImportJobResponse(
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
}
