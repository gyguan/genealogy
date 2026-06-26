package com.genealogy.review.dto;

import java.time.LocalDateTime;

public record AuditRecordResponse(
        Long id,
        Long clanId,
        String targetType,
        Long targetId,
        String changeType,
        String diffSummary,
        Long submitterId,
        LocalDateTime submitTime,
        String status,
        LocalDateTime approvedAt,
        String rejectedReason
) {
}
