package com.genealogy.culture.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CultureQualityResponse(
        Long clanId,
        LocalDateTime generatedAt,
        CultureQualityMetricResponse overall,
        List<CultureQualityMetricResponse> byTargetType,
        List<CultureQualityIssueResponse> issues,
        List<String> notes
) {
}
