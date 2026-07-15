package com.genealogy.source.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record SourceBindingRevisionResponse(
        Long revisionId,
        Long reviewTaskId,
        Long clanId,
        Long bindingId,
        String changeType,
        String status,
        String diffSummary,
        Long submitterId,
        LocalDateTime submitTime,
        LocalDateTime approvedAt,
        String rejectedReason,
        UUID traceId
) {

    public SourceBindingRevisionResponse(
            Long revisionId, Long reviewTaskId, Long clanId, Long bindingId, String changeType,
            String status, String diffSummary, Long submitterId, LocalDateTime submitTime,
            LocalDateTime approvedAt, String rejectedReason
    ) {
        this(revisionId, reviewTaskId, clanId, bindingId, changeType, status, diffSummary,
                submitterId, submitTime, approvedAt, rejectedReason, null);
    }
}
