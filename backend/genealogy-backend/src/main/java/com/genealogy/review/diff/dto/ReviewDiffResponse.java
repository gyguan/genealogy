package com.genealogy.review.diff.dto;

import java.util.List;

public record ReviewDiffResponse(
        Long reviewTaskId,
        Long revisionId,
        Long clanId,
        String targetType,
        Long targetId,
        String changeType,
        String diffSummary,
        String beforeData,
        String afterData,
        List<ReviewDiffField> fields
) {
}
