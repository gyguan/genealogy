package com.genealogy.relationship.dto;

import jakarta.validation.constraints.NotBlank;

public record RelationshipUpdateRequest(
        @NotBlank
        String relationType,

        String relationLabel,
        Boolean isLineageRelation,
        Boolean isBiological,
        Boolean isPrimary,
        String description,
        String confidenceLevel,
        String dataStatus
) {
}
