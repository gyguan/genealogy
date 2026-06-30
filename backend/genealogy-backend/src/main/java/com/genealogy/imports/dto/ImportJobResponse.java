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
        List<ImportRowErrorResponse> errors
) {
}
