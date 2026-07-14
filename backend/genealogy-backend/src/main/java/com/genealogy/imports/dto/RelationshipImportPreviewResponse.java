package com.genealogy.imports.dto;

import java.util.List;

public record RelationshipImportPreviewResponse(
        Integer totalCount,
        Integer validCount,
        Integer duplicateCount,
        Integer errorCount,
        List<RelationshipImportPreviewRowResponse> rows
) {
}
