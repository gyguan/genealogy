package com.genealogy.workbench.dto;

import java.time.LocalDateTime;

public record WorkbenchTaskActionResponse(
        Long id,
        Long clanId,
        String taskKey,
        String action,
        String comment,
        Long actorId,
        LocalDateTime expectedUpdatedAt,
        LocalDateTime createdAt,
        boolean idempotent
) {
}
