package com.genealogy.member.dto;

import java.time.LocalDateTime;

public record ClanMemberResponse(
        Long id,
        Long clanId,
        Long userId,
        String username,
        String displayName,
        Long branchId,
        Long roleId,
        String roleCode,
        String roleName,
        String roleType,
        String memberName,
        String memberStatus,
        String scopeType,
        Long scopeId,
        LocalDateTime joinedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
