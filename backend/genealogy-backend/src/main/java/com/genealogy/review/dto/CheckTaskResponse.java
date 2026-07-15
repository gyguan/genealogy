package com.genealogy.review.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CheckTaskResponse(
        Long id,
        Long clanId,
        Long revisionId,
        Integer reviewLevel,
        Long reviewerId,
        String reviewerRole,
        Long branchId,
        String status,
        String reviewComment,
        LocalDateTime reviewedAt,
        LocalDateTime createdAt,
        String targetType,
        Long targetId,
        String title,
        String diffSummary,
        Long submitterId,
        LocalDateTime submitTime,
        UUID traceId
) {

    public CheckTaskResponse(
            Long id,
            Long clanId,
            Long revisionId,
            Integer reviewLevel,
            Long reviewerId,
            String reviewerRole,
            Long branchId,
            String status,
            String reviewComment,
            LocalDateTime reviewedAt,
            LocalDateTime createdAt
    ) {
        this(id, clanId, revisionId, reviewLevel, reviewerId, reviewerRole, branchId, status, reviewComment,
                reviewedAt, createdAt, null, null, null, null, null, null, null);
    }
}
