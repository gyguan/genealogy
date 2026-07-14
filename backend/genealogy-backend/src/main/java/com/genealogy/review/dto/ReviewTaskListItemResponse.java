package com.genealogy.review.dto;

import java.time.Duration;
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
        Long processingDurationSeconds,
        ReviewTargetSummaryResponse targetSummary
) {

    public ReviewTaskListItemResponse(
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
        this(
                id, clanId, revisionId, branchId, branchName, status, targetType, targetId, title, diffSummary,
                submitterId, submitterName, reviewerId, reviewerName, reviewComment, submitTime, processedAt,
                durationSeconds(submitTime, processedAt), targetSummary
        );
    }

    private static Long durationSeconds(LocalDateTime submitTime, LocalDateTime processedAt) {
        if (submitTime == null || processedAt == null || processedAt.isBefore(submitTime)) {
            return null;
        }
        return Duration.between(submitTime, processedAt).getSeconds();
    }
}
