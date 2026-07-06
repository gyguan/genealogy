package com.genealogy.review.dto;

import java.time.LocalDateTime;

public record ReviewTaskResponse(
        Long id,
        Long clanId,
        Long revisionId,
        String title,
        String targetType,
        Long targetId,
        String changeType,
        String status,
        Long submitterId,
        Long reviewerId,
        String reviewerRole,
        Long branchId,
        String comment,
        String diffSummary,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {
}
