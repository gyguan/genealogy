package com.genealogy.member.dto;

import java.time.LocalDateTime;

public record UserSummaryResponse(
        Long id,
        String username,
        String phone,
        String email,
        String displayName,
        String avatarUrl,
        String status,
        LocalDateTime lastLoginAt,
        LocalDateTime createdAt
) {
}
