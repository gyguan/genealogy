package com.genealogy.member.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MemberAggregateResponse(
        Long membershipId,
        Long userId,
        String displayName,
        String maskedAccount,
        String membershipStatus,
        LocalDateTime joinedAt,
        LocalDateTime updatedAt,
        List<MemberGrantResponse> grants,
        MemberAllowedActionsResponse allowedActions
) {
}
