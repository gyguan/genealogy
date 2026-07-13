package com.genealogy.member.dto;

import java.time.LocalDateTime;

public record MemberGrantResponse(
        Long grantId,
        String roleCode,
        String roleName,
        String scopeType,
        Long scopeId,
        String scopeName,
        String grantStatus,
        Long grantedBy,
        LocalDateTime grantedAt,
        LocalDateTime updatedAt,
        boolean canEditGrant,
        boolean canRevokeGrant
) {
}
