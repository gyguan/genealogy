package com.genealogy.workbench.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record WorkbenchQualityCheckResponse(
        UUID checkId,
        String status,
        String scopeType,
        String mode,
        boolean reviewBlocked,
        Summary summary,
        List<RuleResult> rules,
        LocalDateTime queuedAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        String failureCode,
        String failureMessage
) {
    public record Summary(
            int subjectCount,
            int ruleCount,
            int passedRuleCount,
            int issueCount,
            int blockingIssueCount,
            int warningIssueCount,
            boolean reviewBlocked
    ) {
    }

    public record RuleResult(
            String code,
            String name,
            String outcome,
            String blockLevel,
            int affectedSubjectCount,
            String message,
            List<String> affectedSubjectIds
    ) {
    }
}
