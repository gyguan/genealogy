package com.genealogy.review.dto;

public record ReviewQualityCheckSummary(
        int taskCount,
        int ruleCount,
        int passedRuleCount,
        int issueCount,
        int blockingIssueCount,
        int warningIssueCount,
        boolean reviewBlocked
) {
}
