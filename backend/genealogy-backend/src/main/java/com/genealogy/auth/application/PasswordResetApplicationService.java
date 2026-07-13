package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.dto.CommercialAuthDtos.ForgotPasswordRequest;
import com.genealogy.auth.dto.CommercialAuthDtos.ForgotPasswordResponse;
import com.genealogy.auth.dto.CommercialAuthDtos.ResetPasswordRequest;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.entity.PasswordResetTokenEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.auth.repository.PasswordResetTokenRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import com.genealogy.common.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;

@Service
public class PasswordResetApplicationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String GENERIC_MESSAGE = "若账号信息匹配，我们将发送密码重置指引。";

    private final AppUserRepository appUserRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final AuthApplicationService authApplicationService;
    private final AuthSecurityService authSecurityService;
    private final AuthProperties properties;

    public PasswordResetApplicationService(
            AppUserRepository appUserRepository,
            PasswordResetTokenRepository resetTokenRepository,
            AuthApplicationService authApplicationService,
            AuthSecurityService authSecurityService,
            AuthProperties properties
    ) {
        this.appUserRepository = appUserRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.authApplicationService = authApplicationService;
        this.authSecurityService = authSecurityService;
        this.properties = properties;
    }

    @Transactional
    public ForgotPasswordResponse request(
            ForgotPasswordRequest request,
            String clientIp,
            String userAgent
    ) {
        String account = request.account().trim();
        AppUserEntity user = appUserRepository.findRecoverableAccount(account)
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .orElse(null);
        if (user == null) {
            authSecurityService.recordEvent(
                    null, "password_reset_requested", "GENERIC_ACCEPTED", "low", clientIp, userAgent, null,
                    "accountHash=" + authSecurityService.accountHash(account)
            );
            return new ForgotPasswordResponse(GENERIC_MESSAGE, null);
        }

        LocalDateTime now = LocalDateTime.now();
        resetTokenRepository.findByUserIdAndUsedAtIsNullAndRevokedAtIsNull(user.getId()).forEach(token -> {
            token.setRevokedAt(now);
            resetTokenRepository.save(token);
        });

        String rawToken = generateToken();
        PasswordResetTokenEntity token = new PasswordResetTokenEntity();
        token.setUserId(user.getId());
        token.setTokenHash(PasswordHashUtil.sha256(rawToken));
        token.setExpiresAt(now.plusMinutes(properties.getResetMinutes()));
        token.setCreatedAt(now);
        token.setRequestedIpHash(authSecurityService.ipHash(clientIp));
        resetTokenRepository.save(token);

        boolean delivered = deliver(user, rawToken, token.getExpiresAt());
        authSecurityService.recordEvent(
                user.getId(), "password_reset_requested", delivered ? "DELIVERY_ACCEPTED" : "DELIVERY_PENDING",
                "medium", clientIp, userAgent, null, "emailConfigured=" + (user.getEmail() != null)
        );
        return new ForgotPasswordResponse(
                GENERIC_MESSAGE,
                properties.isExposeResetToken() ? rawToken : null
        );
    }

    @Transactional
    public void reset(ResetPasswordRequest request, String clientIp, String userAgent) {
        PasswordResetTokenEntity token = resetTokenRepository.findByTokenHash(
                        PasswordHashUtil.sha256(request.resetToken().trim()))
                .orElseThrow(this::invalidToken);
        if (token.getUsedAt() != null || token.getRevokedAt() != null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw invalidToken();
        }
        AppUserEntity user = appUserRepository.findById(token.getUserId())
                .filter(candidate -> candidate.getDeletedAt() == null)
                .orElseThrow(this::invalidToken);

        LocalDateTime now = LocalDateTime.now();
        user.setPasswordHash(PasswordHashUtil.hash(request.newPassword()));
        user.setUpdatedAt(now);
        appUserRepository.save(user);
        token.setUsedAt(now);
        resetTokenRepository.save(token);
        authApplicationService.revokeAllSessionsForUser(user.getId(), "password reset");
        authSecurityService.recordEvent(
                user.getId(), "password_reset_completed", "SUCCESS", "high", clientIp, userAgent, null,
                "all sessions revoked"
        );
    }

    private boolean deliver(AppUserEntity user, String rawToken, LocalDateTime expiresAt) {
        String endpoint = trimToNull(properties.getResetDeliveryUrl());
        if (endpoint == null || trimToNull(user.getEmail()) == null) return false;
        try {
            RestClient.create(endpoint)
                    .post()
                    .body(Map.of(
                            "recipient", user.getEmail(),
                            "displayName", user.getDisplayName(),
                            "resetUrl", properties.getResetBaseUrl() + rawToken,
                            "expiresAt", expiresAt.toString()
                    ))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private BusinessException invalidToken() {
        return new BusinessException("AUTH_RESET_TOKEN_INVALID", "重置凭据无效、已使用或已过期");
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
