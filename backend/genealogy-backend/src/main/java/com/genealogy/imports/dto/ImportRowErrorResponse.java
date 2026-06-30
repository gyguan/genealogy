package com.genealogy.imports.dto;

public record ImportRowErrorResponse(
        Integer rowNo,
        String errorMessage,
        String rawData
) {
}
