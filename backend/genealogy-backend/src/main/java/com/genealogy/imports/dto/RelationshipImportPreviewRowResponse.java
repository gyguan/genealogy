package com.genealogy.imports.dto;

public record RelationshipImportPreviewRowResponse(
        Integer rowNo,
        String fromPersonCode,
        String fromPersonName,
        String toPersonCode,
        String toPersonName,
        String relationshipType,
        String description,
        boolean duplicated,
        String errorMessage,
        String rawData
) {
}
