package com.genealogy.review.dto;

import java.util.List;

public record ReviewDiffResponse(
        Long reviewTaskId,
        Long revisionId,
        Long clanId,
        String targetType,
        Long targetId,
        String changeType,
        String diffSummary,
        List<FieldDiff> fields
) {
    public record FieldDiff(
            String fieldName,
            String beforeValue,
            String afterValue,
            String changeType
    ) {
    }
}
