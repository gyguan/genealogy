package com.genealogy.imports.dto;

public record ImportPreviewRowResponse(
        Integer rowNo,
        String name,
        String gender,
        Integer generationNo,
        String generationWord,
        Long branchId,
        String birthDate,
        Boolean isLiving,
        boolean duplicated,
        int duplicateCount,
        String errorMessage,
        String rawData
) {
}
