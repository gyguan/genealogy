package com.genealogy.tree.dto;

public record TreeNodeResponse(
        String nodeId,
        Long personId,
        String displayName,
        String name,
        String visibility,
        String maskReason,
        String gender,
        Integer generationNo,
        String generationWord,
        Long branchId,
        String branchName,
        String birthText,
        String deathText,
        String dataStatus,
        String privacyLevel
) {

    public TreeNodeResponse(
            Long personId,
            String name,
            String gender,
            Integer generationNo,
            String generationWord,
            Long branchId
    ) {
        this(
                personId == null ? "masked-root" : "person-" + personId,
                personId,
                name,
                name,
                personId == null ? "masked" : "visible",
                personId == null ? "privacy_restricted" : null,
                gender,
                generationNo,
                generationWord,
                branchId,
                null,
                null,
                null,
                null,
                null
        );
    }
}
