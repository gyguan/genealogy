package com.genealogy.operationlog.dto;

import java.time.LocalDateTime;
import java.util.UUID;

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
        LocalDateTime createdAt,
        UUID traceId,
        Long revisionId,
        Long reviewTaskId,
        String businessTargetType,
        Long businessTargetId,
        String eventResult
) {

    public OperationLogResponse(
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
        this(id, clanId, actorId, actorDisplayName, actionType, targetType, targetId,
                targetDisplayName, targetBranchName, targetSummary, resultStatus, summary,
                detail, requestId, clientIp, createdAt, null, null, null, null, null, null);
    }
}
