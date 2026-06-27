package com.genealogy.auth.dto;

public record RequestUserContext(
        Long userId,
        String requestId,
        String clientIp
) {
}
