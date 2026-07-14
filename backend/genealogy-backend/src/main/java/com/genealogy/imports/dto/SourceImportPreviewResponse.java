package com.genealogy.imports.dto;

import java.util.List;

public record SourceImportPreviewResponse(
        Integer totalCount,
        Integer validCount,
        Integer duplicateCount,
        Integer errorCount,
        List<SourceImportPreviewRowResponse> rows
) {
}
