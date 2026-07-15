package com.genealogy.review.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AuditRecordResponse(
        Long id,
        Long clanId,
        String targetType,
        Long targetId,
        String changeType,
        String oldPayload,
        String newPayload,
        String diffSummary,
        Long submitterId,
        LocalDateTime submitTime,
        String status,
        LocalDateTime approvedAt,
        String rejectedReason,
        UUID traceId
) {

    public AuditRecordResponse(
            Long id, Long clanId, String targetType, Long targetId, String changeType,
            String oldPayload, String newPayload, String diffSummary, Long submitterId,
            LocalDateTime submitTime, String status, LocalDateTime approvedAt, String rejectedReason
    ) {
        this(id, clanId, targetType, targetId, changeType, oldPayload, newPayload, diffSummary,
                submitterId, submitTime, status, approvedAt, rejectedReason, null);
    }
}
