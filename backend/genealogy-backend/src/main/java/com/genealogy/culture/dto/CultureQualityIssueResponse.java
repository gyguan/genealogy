package com.genealogy.culture.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CultureQualityIssueResponse(
        String targetType,
        Long targetId,
        String displayName,
        Long branchId,
        String branchName,
        List<String> issueCodes,
        LocalDateTime updatedAt
) {
}
