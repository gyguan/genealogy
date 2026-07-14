package com.genealogy.review.dto;

import java.time.LocalDateTime;

public record ReviewTaskListItemResponse(
        Long id,
        Long clanId,
        Long revisionId,
        Long branchId,
        String branchName,
        String status,
        String targetType,
        Long targetId,
        String title,
        String diffSummary,
        Long submitterId,
        String submitterName,
        Long reviewerId,
        String reviewerName,
        String reviewComment,
        LocalDateTime submitTime,
        LocalDateTime processedAt,
        ReviewTargetSummaryResponse targetSummary
) {
}
