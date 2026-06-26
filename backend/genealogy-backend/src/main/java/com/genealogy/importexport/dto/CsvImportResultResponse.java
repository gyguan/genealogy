package com.genealogy.importexport.dto;

import java.util.List;

public record CsvImportResultResponse(
        Integer totalCount,
        Integer successCount,
        Integer failureCount,
        List<String> errors
) {
}
