package com.genealogy.imports.dto;

import java.util.List;

public record ImportPreviewResponse(
        Integer totalCount,
        Integer validCount,
        Integer duplicateCount,
        Integer errorCount,
        List<ImportPreviewRowResponse> rows
) {
}
