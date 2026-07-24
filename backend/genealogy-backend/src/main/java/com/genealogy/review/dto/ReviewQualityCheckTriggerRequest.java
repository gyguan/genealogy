package com.genealogy.review.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ReviewQualityCheckTriggerRequest(
        String scopeType,
        String mode,
        List<Long> reviewTaskIds,
        QueryScope query,
        List<String> ruleCodes
) {
    public record QueryScope(
            String view,
            String targetType,
            String status,
            Long branchId,
            LocalDateTime submittedFrom,
            LocalDateTime submittedTo,
            LocalDateTime processedFrom,
            LocalDateTime processedTo
    ) {
    }
}
