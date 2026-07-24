package com.genealogy.review.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ReviewQualityCheckResponse(
        UUID checkId,
        String status,
        String scopeType,
        String mode,
        boolean reviewBlocked,
        ReviewQualityCheckSummary summary,
        List<ReviewQualityRuleResult> rules,
        LocalDateTime queuedAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime lastCheckedAt,
        String failureCode,
        String failureMessage
) {
    public static ReviewQualityCheckResponse notChecked() {
        return new ReviewQualityCheckResponse(null, "NOT_CHECKED", null, null, false, null, List.of(), null, null, null, null, null, null);
    }
}
