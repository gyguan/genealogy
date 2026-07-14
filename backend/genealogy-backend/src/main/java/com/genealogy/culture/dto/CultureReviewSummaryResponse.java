package com.genealogy.culture.dto;

import java.time.LocalDateTime;

public record CultureReviewSummaryResponse(
        Long reviewTaskId,
        String status,
        String submitterName,
        String reviewerName,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        String rejectedReason
) {
    public static CultureReviewSummaryResponse empty() {
        return new CultureReviewSummaryResponse(null, null, null, null, null, null, null);
    }
}
