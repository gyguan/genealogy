package com.genealogy.imports.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ImportJobExecutionResponse(
        Long jobId,
        String executionMode,
        String executionStatus,
        String executionStage,
        Integer totalCount,
        Integer processedCount,
        Integer publishedCount,
        Integer remainingCount,
        Integer progressPercent,
        Integer cursorRowNo,
        Integer chunkSize,
        Integer retryCount,
        Integer maxRetries,
        String failureStage,
        String lastErrorCode,
        String errorSummary,
        Boolean manualInterventionRequired,
        LocalDateTime nextRetryAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime heartbeatAt,
        List<String> allowedActions
) {
}
