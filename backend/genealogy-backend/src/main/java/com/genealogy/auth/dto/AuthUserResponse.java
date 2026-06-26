package com.genealogy.auth.dto;

import java.time.LocalDateTime;

public record AuthUserResponse(
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
