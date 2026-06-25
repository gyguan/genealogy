package com.genealogy.tree.dto;

public record TreeEdgeResponse(
        Long relationshipId,
        Long fromPersonId,
        Long toPersonId,
        String relationType,
        String relationLabel
) {
}
