package com.genealogy.imports.dto;

import java.time.LocalDateTime;

public record ImportJobSummaryResponse(
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
}
