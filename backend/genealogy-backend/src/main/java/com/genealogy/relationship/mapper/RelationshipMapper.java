package com.genealogy.relationship.mapper;

import com.genealogy.relationship.dto.RelationshipCreateRequest;
import com.genealogy.relationship.dto.RelationshipResponse;
import com.genealogy.relationship.dto.RelationshipUpdateRequest;
import com.genealogy.relationship.entity.RelationshipEntity;

public final class RelationshipMapper {

    private RelationshipMapper() {
    }

    public static RelationshipEntity toEntity(Long clanId, RelationshipCreateRequest request) {
        RelationshipEntity entity = new RelationshipEntity();
        entity.setClanId(clanId);
        entity.setFromPersonId(request.fromPersonId());
        entity.setToPersonId(request.toPersonId());
        entity.setRelationType(trim(request.relationType()));
        entity.setRelationLabel(trim(request.relationLabel()));
        entity.setRelationCategory(trim(request.relationCategory()));
        entity.setRitualRelationType(trim(request.ritualRelationType()));
        entity.setSuccessionReason(trim(request.successionReason()));
        entity.setSuccessorBranchId(request.successorBranchId());
        entity.setIsLineageRelation(request.isLineageRelation());
        entity.setIsBiological(request.isBiological());
        entity.setIsPrimary(request.isPrimary());
        entity.setDescription(trim(request.description()));
        entity.setConfidenceLevel(trim(request.confidenceLevel()));
        return entity;
    }

    public static void updateEntity(RelationshipEntity entity, RelationshipUpdateRequest request) {
        entity.setRelationType(trim(request.relationType()));
        entity.setRelationLabel(trim(request.relationLabel()));
        entity.setRelationCategory(trim(request.relationCategory()));
        entity.setRitualRelationType(trim(request.ritualRelationType()));
        entity.setSuccessionReason(trim(request.successionReason()));
        entity.setSuccessorBranchId(request.successorBranchId());
        entity.setIsLineageRelation(request.isLineageRelation());
        entity.setIsBiological(request.isBiological());
        entity.setIsPrimary(request.isPrimary());
        entity.setDescription(trim(request.description()));
        entity.setConfidenceLevel(trim(request.confidenceLevel()));
        entity.setDataStatus(trim(request.dataStatus()));
    }

    public static RelationshipResponse toResponse(RelationshipEntity entity) {
        return toResponse(entity, null, null);
    }

    public static RelationshipResponse toResponse(RelationshipEntity entity, String fromPersonName, String toPersonName) {
        return new RelationshipResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getFromPersonId(),
                fromPersonName,
                entity.getToPersonId(),
                toPersonName,
                entity.getRelationType(),
                entity.getRelationLabel(),
                entity.getRelationCategory(),
                entity.getRitualRelationType(),
                entity.getSuccessionReason(),
                entity.getSuccessorBranchId(),
                entity.getIsLineageRelation(),
                entity.getIsBiological(),
                entity.getIsPrimary(),
                entity.getDescription(),
                entity.getConfidenceLevel(),
                entity.getDataStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private static String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
