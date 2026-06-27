package com.genealogy.relationship.dto;

public record RelationshipConflictCheckResponse(
        boolean conflict,
        String errorCode,
        String message
) {
    public static RelationshipConflictCheckResponse passed() {
        return new RelationshipConflictCheckResponse(false, null, "关系校验通过");
    }

    public static RelationshipConflictCheckResponse failed(String errorCode, String message) {
        return new RelationshipConflictCheckResponse(true, errorCode, message);
    }
}
