package com.genealogy.relationship.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RelationshipCreateRequest(
        @NotNull
        Long fromPersonId,

        @NotNull
        Long toPersonId,

        @NotBlank
        String relationType,

        String relationLabel,
        Boolean isLineageRelation,
        Boolean isBiological,
        Boolean isPrimary,
        String description,
        String confidenceLevel
) {
}
