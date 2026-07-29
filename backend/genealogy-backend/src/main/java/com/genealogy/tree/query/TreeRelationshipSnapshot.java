package com.genealogy.tree.query;

import com.genealogy.relationship.entity.RelationshipEntity;

/** Immutable Tree-only relationship projection; never managed or persisted by JPA. */
public record TreeRelationshipSnapshot(
        Long id,
        Long clanId,
        Long fromPersonId,
        Long toPersonId,
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
        Long createdBy
) {
    /** Compatibility adapter for the existing graph assembly during the read-model migration. */
    public RelationshipEntity toDetachedEntity() {
        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setId(id);
        relationship.setClanId(clanId);
        relationship.setFromPersonId(fromPersonId);
        relationship.setToPersonId(toPersonId);
        relationship.setRelationType(relationType);
        relationship.setRelationLabel(relationLabel);
        relationship.setRelationCategory(relationCategory);
        relationship.setRitualRelationType(ritualRelationType);
        relationship.setSuccessionReason(successionReason);
        relationship.setSuccessorBranchId(successorBranchId);
        relationship.setIsLineageRelation(isLineageRelation);
        relationship.setIsBiological(isBiological);
        relationship.setIsPrimary(isPrimary);
        relationship.setDescription(description);
        relationship.setConfidenceLevel(confidenceLevel);
        relationship.setDataStatus(dataStatus);
        relationship.setCreatedBy(createdBy);
        return relationship;
    }
}