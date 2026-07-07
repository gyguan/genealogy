package com.genealogy.relationship.dto;

import java.time.LocalDateTime;

public record RelationshipResponse(
        Long id,
        Long clanId,
        Long fromPersonId,
        String fromPersonName,
        Long toPersonId,
        String toPersonName,
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
        String dataStatus,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
