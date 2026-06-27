package com.genealogy.auth.application;

import com.genealogy.auth.dto.AuthUserResponse;
import com.genealogy.auth.dto.LoginRequest;
import com.genealogy.auth.dto.LoginResponse;
import com.genealogy.auth.dto.RegisterRequest;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.entity.AuthSessionEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.auth.repository.AuthSessionRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import com.genealogy.common.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class AuthApplicationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;
    private static final long TOKEN_EXPIRE_HOURS = 24L;
    private static final String USER_STATUS_ACTIVE = "active";

    private final AppUserRepository appUserRepository;
    private final AuthSessionRepository authSessionRepository;

    public AuthApplicationService(AppUserRepository appUserRepository, AuthSessionRepository authSessionRepository) {
        this.appUserRepository = appUserRepository;
        this.authSessionRepository = authSessionRepository;
    }

    @Transactional
    public AuthUserResponse register(RegisterRequest request) {
        String username = request.username().trim();
        if (appUserRepository.existsByUsernameAndDeletedAtIsNull(username)) {
            throw new BusinessException("AUTH_USERNAME_DUPLICATED", "用户名已存在");
        }
        String phone = trimToNull(request.phone());
        if (phone != null && appUserRepository.existsByPhoneAndDeletedAtIsNull(phone)) {
            throw new BusinessException("AUTH_PHONE_DUPLICATED", "手机号已存在");
        }
        String email = trimToNull(request.email());
        if (email != null && appUserRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new BusinessException("AUTH_EMAIL_DUPLICATED", "邮箱已存在");
        }

        LocalDateTime now = LocalDateTime.now();
        AppUserEntity user = new AppUserEntity();
        user.setUsername(username);
        user.setPasswordHash(PasswordHashUtil.hash(request.password()));
        user.setDisplayName(request.displayName().trim());
        user.setPhone(phone);
        user.setEmail(email);
        user.setStatus(USER_STATUS_ACTIVE);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return toUserResponse(appUserRepository.save(user));
    }

    @Transactional
    public LoginResponse login(LoginRequest request, String clientIp, String userAgent) {
        AppUserEntity user = appUserRepository.findByUsernameAndDeletedAtIsNull(request.username().trim())
                .orElseThrow(() -> new BusinessException("AUTH_LOGIN_FAILED", "用户名或密码错误"));
        if (!USER_STATUS_ACTIVE.equals(user.getStatus())) {
            throw new BusinessException("AUTH_USER_DISABLED", "用户状态不可登录");
        }
        if (!PasswordHashUtil.verify(request.password(), user.getPasswordHash())) {
            throw new BusinessException("AUTH_LOGIN_FAILED", "用户名或密码错误");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(TOKEN_EXPIRE_HOURS);
        String token = generateToken();

        AuthSessionEntity session = new AuthSessionEntity();
        session.setUserId(user.getId());
        session.setTokenHash(PasswordHashUtil.sha256(token));
        session.setIssuedAt(now);
        session.setExpiresAt(expiresAt);
        session.setClientIp(trimToNull(clientIp));
        session.setUserAgent(trimToLength(userAgent, 500));
        authSessionRepository.save(session);

        user.setLastLoginAt(now);
        user.setUpdatedAt(now);
        appUserRepository.save(user);

        return new LoginResponse("Bearer", token, expiresAt, toUserResponse(user));
    }

    @Transactional(readOnly = true)
    public AuthUserResponse currentUser(String authorization) {
        AuthSessionEntity session = getActiveSession(authorization);
        AppUserEntity user = appUserRepository.findById(session.getUserId())
                .orElseThrow(() -> new BusinessException("AUTH_USER_NOT_FOUND", "用户不存在"));
        return toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public Long currentUserIdOrNull(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        return getActiveSession(authorization).getUserId();
    }

    @Transactional
    public void logout(String authorization) {
        AuthSessionEntity session = getActiveSession(authorization);
        session.setRevokedAt(LocalDateTime.now());
        authSessionRepository.save(session);
    }

    private AuthSessionEntity getActiveSession(String authorization) {
        String token = extractToken(authorization);
        return authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                        PasswordHashUtil.sha256(token),
                        LocalDateTime.now()
                )
                .orElseThrow(() -> new BusinessException("AUTH_UNAUTHORIZED", "登录状态无效或已过期"));
    }

    private String extractToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "缺少登录凭证");
        }
        String value = authorization.trim();
        if (value.toLowerCase().startsWith("bearer ")) {
            value = value.substring(7).trim();
        }
        if (value.isBlank()) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "缺少登录凭证");
        }
        return value;
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private AuthUserResponse toUserResponse(AppUserEntity user) {
        return new AuthUserResponse(
                user.getId(),
                user.getUsername(),
                user.getPhone(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getStatus(),
                user.getLastLoginAt(),
                user.getCreatedAt()
        );
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String trimToLength(String value, int maxLength) {
        String trimmed = trimToNull(value);
        if (trimmed == null || trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength);
    }
}
