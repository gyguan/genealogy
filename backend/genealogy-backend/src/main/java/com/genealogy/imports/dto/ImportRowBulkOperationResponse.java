package com.genealogy.imports.dto;

import java.util.List;

public record ImportRowBulkOperationResponse(
        String operation,
        String selectionMode,
        Integer matchedCount,
        Integer processedCount,
        Integer successCount,
        Integer failureCount,
        Integer remainingFailureCount,
        Integer excludedCount,
        String processingStatus,
        List<ImportRowBulkItemResult> items
) {
}
