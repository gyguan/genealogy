package com.genealogy.tracking.dto;

import java.time.LocalDateTime;

public record TrackingObjectResponse(
        String objectType,
        Long objectId,
        String displayName,
        String secondaryLabel,
        String branchName,
        String summary,
        String status,
        LocalDateTime changedAt
) {
}
