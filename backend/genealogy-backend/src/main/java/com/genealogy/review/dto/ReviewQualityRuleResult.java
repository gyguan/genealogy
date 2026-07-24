package com.genealogy.review.dto;

import java.util.List;

public record ReviewQualityRuleResult(
        String ruleCode,
        String ruleName,
        String outcome,
        String blockLevel,
        int affectedTaskCount,
        String message,
        List<Long> affectedReviewTaskIds
) {
}
