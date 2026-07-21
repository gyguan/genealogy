package com.genealogy.workbench.dto;

import java.time.LocalDateTime;

public record WorkbenchHistoryItemResponse(
        Long id,
        String operatorName,
        String actionText,
        String comment,
        String resultText,
        LocalDateTime createdAt
) {
}
