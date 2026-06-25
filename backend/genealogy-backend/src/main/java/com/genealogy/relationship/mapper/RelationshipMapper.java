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
        entity.setIsLineageRelation(request.isLineageRelation());
        entity.setIsBiological(request.isBiological());
        entity.setIsPrimary(request.isPrimary());
        entity.setDescription(trim(request.description()));
        entity.setConfidenceLevel(trim(request.confidenceLevel()));
        entity.setDataStatus(trim(request.dataStatus()));
    }

    public static RelationshipResponse toResponse(RelationshipEntity entity) {
        return new RelationshipResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getFromPersonId(),
                entity.getToPersonId(),
                entity.getRelationType(),
                entity.getRelationLabel(),
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
