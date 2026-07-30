package com.genealogy.operationlog.application;

import java.util.UUID;

/** Published only after an operation audit record has been saved successfully. */
public record OperationRecordedEvent(
        Long clanId,
        Long actorId,
        String actionType,
        String targetType,
        Long targetId,
        UUID traceId,
        Long revisionId,
        Long reviewTaskId,
        String businessTargetType,
        Long businessTargetId,
        String eventResult
) {
}
