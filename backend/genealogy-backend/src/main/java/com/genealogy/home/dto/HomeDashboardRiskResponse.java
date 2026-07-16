package com.genealogy.home.dto;

public record HomeDashboardRiskResponse(
        String key,
        String label,
        long count,
        String severity,
        String reason,
        String targetView,
        String targetQuery
) {
}
