package com.genealogy.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class CommercialAuthDtos {

    private CommercialAuthDtos() {
    }

    public record InvitationCreateRequest(
            @NotNull Long clanId,
            @Email @Size(max = 120) String email,
            @NotBlank @Size(max = 64) String roleCode,
            @NotBlank String scopeType,
            @NotNull Long scopeId
    ) {
    }

    public record InvitationCreateResponse(
            Long invitationId,
            String invitationToken,
            LocalDateTime expiresAt
    ) {
    }

    public record InvitationAcceptRequest(
            @NotBlank String invitationToken,
            @NotBlank @Size(max = 80) String username,
            @NotBlank @Size(min = 8, max = 64) String password,
            @NotBlank @Size(max = 120) String displayName,
            @Email @Size(max = 120) String email
    ) {
        public RegisterRequest toRegisterRequest() {
            return new RegisterRequest(username, password, displayName, null, email);
        }
    }

    public record ForgotPasswordRequest(
            @NotBlank @Size(max = 120) String account
    ) {
    }

    public record ForgotPasswordResponse(
            String message,
            String developmentToken
    ) {
    }

    public record ResetPasswordRequest(
            @NotBlank String resetToken,
            @NotBlank @Size(min = 8, max = 64) String newPassword
    ) {
    }

    public record AuthSessionResponse(
            Long sessionId,
            boolean current,
            LocalDateTime issuedAt,
            LocalDateTime lastAccessAt,
            LocalDateTime expiresAt,
            String clientIp,
            String device
    ) {
    }
}
