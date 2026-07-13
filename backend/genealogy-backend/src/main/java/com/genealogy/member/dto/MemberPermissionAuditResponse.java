package com.genealogy.member.dto;

import java.time.LocalDateTime;

public record MemberPermissionAuditResponse(
        Long auditId,
        Long actorId,
        String actorDisplayName,
        String actorMaskedAccount,
        String actionType,
        Long membershipId,
        Long grantId,
        String targetMemberDisplayName,
        String targetMemberMaskedAccount,
        String beforeValue,
        String afterValue,
        String reason,
        LocalDateTime changedAt
) {
}
