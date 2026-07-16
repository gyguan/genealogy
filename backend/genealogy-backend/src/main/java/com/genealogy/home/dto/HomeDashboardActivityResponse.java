package com.genealogy.home.dto;

import java.time.LocalDateTime;

public record HomeDashboardActivityResponse(
        String type,
        String action,
        String objectName,
        String actorName,
        LocalDateTime occurredAt,
        String status,
        String targetView,
        String targetQuery
) {
}
