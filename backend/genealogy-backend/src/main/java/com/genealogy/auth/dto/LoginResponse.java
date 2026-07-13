package com.genealogy.auth.dto;

import java.time.LocalDateTime;

public record LoginResponse(
        String tokenType,
        String accessToken,
        LocalDateTime expiresAt,
        AuthUserResponse user,
        String csrfToken
) {
    public LoginResponse(String tokenType, String accessToken, LocalDateTime expiresAt, AuthUserResponse user) {
        this(tokenType, accessToken, expiresAt, user, null);
    }
}
