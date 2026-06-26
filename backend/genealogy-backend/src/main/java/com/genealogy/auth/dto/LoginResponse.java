package com.genealogy.auth.dto;

import java.time.LocalDateTime;

public record LoginResponse(
        String tokenType,
        String accessToken,
        LocalDateTime expiresAt,
        AuthUserResponse user
) {
}
