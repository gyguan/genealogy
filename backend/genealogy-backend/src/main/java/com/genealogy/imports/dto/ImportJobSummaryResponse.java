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
        LocalDateTime createdAt
) {
}
