package com.genealogy.member.dto;

import java.time.LocalDateTime;

public record MemberGrantResponse(
        Long grantId,
        Long roleId,
        String roleCode,
        String roleName,
        String roleType,
        String scopeType,
        Long scopeId,
        String scopeName,
        String grantStatus,
        LocalDateTime grantedAt,
        LocalDateTime updatedAt
) {
}
