package com.genealogy.review.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReviewQualityCheckAcceptedResponse(
        UUID checkId,
        String status,
        String scopeType,
        String mode,
        int acceptedTaskCount,
        LocalDateTime acceptedAt
) {
}
