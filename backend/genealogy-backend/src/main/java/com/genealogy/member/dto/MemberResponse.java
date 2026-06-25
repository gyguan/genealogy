package com.genealogy.member.dto;

import com.genealogy.member.enums.MemberScopeType;
import com.genealogy.member.enums.MemberStatus;

import java.time.LocalDateTime;

public record MemberResponse(
        Long id,
        Long clanId,
        Long userId,
        Long branchId,
        Long roleId,
        String memberName,
        MemberStatus memberStatus,
        MemberScopeType scopeType,
        Long scopeId,
        LocalDateTime joinedAt,
        LocalDateTime createdAt
) {
}
