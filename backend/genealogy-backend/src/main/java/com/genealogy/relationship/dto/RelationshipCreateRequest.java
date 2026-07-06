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
        String relationCategory,
        String ritualRelationType,
        String successionReason,
        Long successorBranchId,
        Boolean isLineageRelation,
        Boolean isBiological,
        Boolean isPrimary,
        String description,
        String confidenceLevel
) {
}
