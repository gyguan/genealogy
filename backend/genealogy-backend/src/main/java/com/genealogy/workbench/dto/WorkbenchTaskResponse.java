package com.genealogy.workbench.dto;

import java.time.LocalDateTime;

public record WorkbenchTaskResponse(
        String key,
        String type,
        String typeText,
        String objectName,
        String branchName,
        String risk,
        String status,
        String statusText,
        String suggestion,
        LocalDateTime updatedAt
) {
}
