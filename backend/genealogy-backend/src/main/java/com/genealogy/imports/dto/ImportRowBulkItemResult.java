package com.genealogy.imports.dto;

public record ImportRowBulkItemResult(
        String stableRowKey,
        Integer rowNo,
        Boolean success,
        String rowStatus,
        String errorCode,
        String errorMessage,
        Long version
) {
}
