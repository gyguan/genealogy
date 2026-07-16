package com.genealogy.home.dto;

import java.time.LocalDate;

public record HomeDashboardTrendPointResponse(
        LocalDate date,
        long peopleCreatedCount,
        long sourceCreatedCount,
        long reviewCompletedCount
) {
}
