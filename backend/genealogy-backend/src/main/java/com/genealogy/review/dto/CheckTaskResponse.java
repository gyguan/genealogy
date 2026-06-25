package com.genealogy.review.dto;

import java.time.LocalDateTime;

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
        LocalDateTime createdAt
) {
}
