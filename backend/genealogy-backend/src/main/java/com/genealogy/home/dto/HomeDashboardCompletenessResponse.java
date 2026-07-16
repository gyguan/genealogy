package com.genealogy.home.dto;

public record HomeDashboardCompletenessResponse(
        long generationMaintainedCount,
        double generationMaintainedRate,
        long vitalDatesMaintainedCount,
        double vitalDatesMaintainedRate,
        long biographyMaintainedCount,
        double biographyMaintainedRate
) {
}
