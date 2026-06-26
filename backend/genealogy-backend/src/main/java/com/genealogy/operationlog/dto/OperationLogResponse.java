package com.genealogy.operationlog.dto;

import java.time.LocalDateTime;

public record OperationLogResponse(
        Long id,
        Long clanId,
        Long actorId,
        String actionType,
        String targetType,
        Long targetId,
        String summary,
        String detail,
        String requestId,
        String clientIp,
        LocalDateTime createdAt
) {
}
