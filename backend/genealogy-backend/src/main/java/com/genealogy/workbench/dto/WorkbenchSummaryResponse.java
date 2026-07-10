package com.genealogy.workbench.dto;

public record WorkbenchSummaryResponse(
        long pendingTaskCount,
        long highRiskCount,
        long missingSourceCount,
        long generationIssueCount
) {
}
