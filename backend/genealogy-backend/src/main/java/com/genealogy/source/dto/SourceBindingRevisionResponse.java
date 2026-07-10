package com.genealogy.source.dto;

import java.time.LocalDateTime;

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
        String rejectedReason
) {
}
