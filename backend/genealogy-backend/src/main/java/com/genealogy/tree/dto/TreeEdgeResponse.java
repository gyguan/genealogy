package com.genealogy.tree.dto;

public record TreeEdgeResponse(
        String edgeId,
        Long relationshipId,
        String fromNodeId,
        Long fromPersonId,
        String toNodeId,
        Long toPersonId,
        String relationType,
        String relationLabel,
        String relationCategory,
        String ritualRelationType,
        String visibility,
        Boolean isLineageRelation,
        Boolean isBiological,
        Boolean isPrimary,
        String dataStatus,
        String confidenceLevel,
        TreeEvidenceSummary evidenceSummary,
        TreeReviewSummary reviewSummary,
        TreeAnomalySummary anomalySummary
) {

    public TreeEdgeResponse(
            String edgeId,
            Long relationshipId,
            String fromNodeId,
            Long fromPersonId,
            String toNodeId,
            Long toPersonId,
            String relationType,
            String relationLabel,
            String relationCategory,
            String ritualRelationType,
            String visibility,
            Boolean isLineageRelation,
            Boolean isBiological,
            Boolean isPrimary,
            String dataStatus,
            String confidenceLevel
    ) {
        this(
                edgeId,
                relationshipId,
                fromNodeId,
                fromPersonId,
                toNodeId,
                toPersonId,
                relationType,
                relationLabel,
                relationCategory,
                ritualRelationType,
                visibility,
                isLineageRelation,
                isBiological,
                isPrimary,
                dataStatus,
                confidenceLevel,
                null,
                null,
                null
        );
    }

    public TreeEdgeResponse(
            Long relationshipId,
            Long fromPersonId,
            Long toPersonId,
            String relationType,
            String relationLabel
    ) {
        this(
                relationshipId == null
                        ? "edge-" + fromPersonId + "-" + toPersonId + "-" + String.valueOf(relationType)
                        : "relationship-" + relationshipId,
                relationshipId,
                fromPersonId == null ? null : "person-" + fromPersonId,
                fromPersonId,
                toPersonId == null ? null : "person-" + toPersonId,
                toPersonId,
                relationType,
                relationLabel,
                null,
                null,
                "visible",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    public TreeEdgeResponse withSummaries(
            TreeEvidenceSummary evidence,
            TreeReviewSummary review,
            TreeAnomalySummary anomaly
    ) {
        return new TreeEdgeResponse(
                edgeId,
                relationshipId,
                fromNodeId,
                fromPersonId,
                toNodeId,
                toPersonId,
                relationType,
                relationLabel,
                relationCategory,
                ritualRelationType,
                visibility,
                isLineageRelation,
                isBiological,
                isPrimary,
                dataStatus,
                confidenceLevel,
                evidence,
                review,
                anomaly
        );
    }
}
