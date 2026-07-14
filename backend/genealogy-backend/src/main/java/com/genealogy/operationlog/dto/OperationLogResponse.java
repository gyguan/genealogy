package com.genealogy.operationlog.dto;

import java.time.LocalDateTime;

public record OperationLogResponse(
        Long id,
        Long clanId,
        Long actorId,
        String actorDisplayName,
        String actionType,
        String targetType,
        Long targetId,
        String targetDisplayName,
        String targetBranchName,
        String targetSummary,
        String resultStatus,
        String summary,
        String detail,
        String requestId,
        String clientIp,
        LocalDateTime createdAt
) {
}
