package com.genealogy.quality.check;

import java.util.List;

public record QualityCheckEvaluation(
        QualityCheckSummary summary,
        List<QualityCheckRuleResult> rules
) {
    public record QualityCheckSummary(
            int subjectCount,
            int ruleCount,
            int passedRuleCount,
            int issueCount,
            int blockingIssueCount,
            int warningIssueCount,
            boolean blocked
    ) {
        public boolean reviewBlocked() {
            return blocked;
        }
    }

    public record QualityCheckRuleResult(
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
