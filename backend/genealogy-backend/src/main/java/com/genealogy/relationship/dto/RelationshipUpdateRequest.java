package com.genealogy.relationship.dto;

import jakarta.validation.constraints.NotBlank;

public record RelationshipUpdateRequest(
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
        String confidenceLevel,
        String dataStatus
) {
    @Override
    public String dataStatus() {
        return null;
    }
}
