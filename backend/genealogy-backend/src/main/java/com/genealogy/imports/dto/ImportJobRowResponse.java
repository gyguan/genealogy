package com.genealogy.imports.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ImportJobRowResponse(
        Long id,
        Integer rowNo,
        String rawData,
        Map<String, Object> normalizedData,
        Map<String, Object> correctedData,
        String rowStatus,
        String errorCode,
        String errorMessage,
        Integer retryCount,
        Boolean draftCreated,
        Long version,
        LocalDateTime updatedAt
) {
}
