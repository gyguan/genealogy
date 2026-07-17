package com.genealogy.workbench.dto;

import java.time.LocalDateTime;

public record WorkbenchTaskResponse(
        String key,
        String taskName,
        String bookName,
        String creatorName,
        LocalDateTime createdAt,
        String type,
        String typeText,
        String objectName,
        String branchName,
        String risk,
        String status,
        String statusText,
        String suggestion,
        String problemDescription,
        String involvedObject,
        String riskReason,
        boolean reviewBlocked,
        String relatedEntryType,
        String relatedEntryId,
        String relatedEntryText,
        String statusDescription,
        LocalDateTime updatedAt
) {
}
