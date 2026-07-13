package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.dto.AuthUserResponse;
import com.genealogy.auth.dto.CommercialAuthDtos.AuthSessionResponse;
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
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Service
public class AuthApplicationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;
    private static final String USER_STATUS_ACTIVE = "active";
    private static final String DUMMY_PASSWORD_HASH = PasswordHashUtil.hash("genealogy-invalid-account-sentinel");

    private final AppUserRepository appUserRepository;
    private final AuthSessionRepository authSessionRepository;
    private final AuthSecurityService authSecurityService;
    private final AuthProperties properties;

    public AuthApplicationService(
            AppUserRepository appUserRepository,
            AuthSessionRepository authSessionRepository,
            AuthSecurityService authSecurityService,
            AuthProperties properties
    ) {
        this.appUserRepository = appUserRepository;
        this.authSessionRepository = authSessionRepository;
        this.authSecurityService = authSecurityService;
        this.properties = properties;
    }

    @Transactional
    public AuthUserResponse register(RegisterRequest request) {
        if (!properties.isPublicRegistrationEnabled()) {
            throw new BusinessException("AUTH_PUBLIC_REGISTRATION_DISABLED", "请通过宗族管理员邀请开通账号");
        }
        return registerApproved(request);
    }

    @Transactional
    public AuthUserResponse registerApproved(RegisterRequest request) {
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

    /** Compatibility method retained for existing service tests and API clients. */
    @Transactional
    public LoginResponse login(LoginRequest request, String clientIp, String userAgent) {
        return loginSession(request, clientIp, userAgent).response();
    }

    @Transactional
    public AuthLoginResult loginSession(LoginRequest request, String clientIp, String userAgent) {
        String account = request.username().trim();
        authSecurityService.requireLoginAllowed(account, clientIp);

        AppUserEntity user = appUserRepository.findByUsernameAndDeletedAtIsNull(account).orElse(null);
        String storedHash = user == null ? DUMMY_PASSWORD_HASH : user.getPasswordHash();
        boolean passwordMatched = PasswordHashUtil.verify(request.password(), storedHash);
        boolean active = user != null && USER_STATUS_ACTIVE.equals(user.getStatus());
        if (!passwordMatched || !active) {
            authSecurityService.recordLoginAttempt(
                    account,
                    clientIp,
                    user == null ? null : user.getId(),
                    false,
                    "AUTH_LOGIN_FAILED",
                    userAgent
            );
            throw new BusinessException("AUTH_LOGIN_FAILED", "用户名或密码错误");
        }

        SessionMaterial material = createSession(user.getId(), clientIp, userAgent, request.rememberMeEnabled());
        LocalDateTime now = LocalDateTime.now();
        user.setLastLoginAt(now);
        user.setUpdatedAt(now);
        appUserRepository.save(user);
        authSecurityService.recordLoginAttempt(account, clientIp, user.getId(), true, "SUCCESS", userAgent);

        String exposedToken = properties.isExposeBearerToken() ? material.sessionToken() : null;
        LoginResponse response = new LoginResponse(
                properties.isExposeBearerToken() ? "Bearer" : null,
                exposedToken,
                material.session().getExpiresAt(),
                toUserResponse(user),
                material.csrfToken()
        );
        return new AuthLoginResult(response, material.sessionToken(), maxAgeSeconds(material.session()));
    }

    @Transactional(readOnly = true)
    public AuthUserResponse currentUser(String authorization) {
        AuthSessionEntity session = getActiveSession(authorization);
        AppUserEntity user = requireActiveUser(session.getUserId());
        return toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public Long currentUserIdOrNull(String authorization) {
        if (authorization == null || authorization.isBlank()) return null;
        return getActiveSession(authorization).getUserId();
    }

    @Transactional
    public AuthLoginResult refreshSession(String authorization, String clientIp, String userAgent) {
        AuthSessionEntity current = getActiveSession(authorization);
        AppUserEntity user = requireActiveUser(current.getUserId());
        current.setRevokedAt(LocalDateTime.now());
        authSessionRepository.save(current);

        SessionMaterial material = createSession(
                user.getId(),
                clientIp,
                userAgent,
                current.isRememberMe()
        );
        authSecurityService.recordEvent(
                user.getId(), "session_refresh", "SUCCESS", "low", clientIp, userAgent, null,
                "previousSessionId=" + current.getId()
        );
        return new AuthLoginResult(
                new LoginResponse(
                        properties.isExposeBearerToken() ? "Bearer" : null,
                        properties.isExposeBearerToken() ? material.sessionToken() : null,
                        material.session().getExpiresAt(),
                        toUserResponse(user),
                        material.csrfToken()
                ),
                material.sessionToken(),
                maxAgeSeconds(material.session())
        );
    }

    @Transactional
    public void logout(String authorization) {
        AuthSessionEntity session = getActiveSession(authorization);
        session.setRevokedAt(LocalDateTime.now());
        authSessionRepository.save(session);
        authSecurityService.recordEvent(
                session.getUserId(), "session_logout", "SUCCESS", "low", session.getClientIp(),
                session.getUserAgent(), null, "sessionId=" + session.getId()
        );
    }

    @Transactional(readOnly = true)
    public List<AuthSessionResponse> sessions(String authorization) {
        AuthSessionEntity current = getActiveSession(authorization);
        return authSessionRepository
                .findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByLastAccessAtDesc(
                        current.getUserId(), LocalDateTime.now()
                )
                .stream()
                .map(session -> toSessionResponse(session, session.getId().equals(current.getId())))
                .toList();
    }

    @Transactional
    public void revokeSession(String authorization, Long sessionId) {
        AuthSessionEntity current = getActiveSession(authorization);
        AuthSessionEntity target = authSessionRepository.findById(sessionId)
                .filter(session -> current.getUserId().equals(session.getUserId()))
                .orElseThrow(() -> new BusinessException("AUTH_SESSION_NOT_FOUND", "登录会话不存在"));
        target.setRevokedAt(LocalDateTime.now());
        authSessionRepository.save(target);
        authSecurityService.recordEvent(
                current.getUserId(), "session_revoke", "SUCCESS", "medium", current.getClientIp(),
                current.getUserAgent(), null, "revokedSessionId=" + target.getId()
        );
    }

    @Transactional
    public void revokeOtherSessions(String authorization) {
        AuthSessionEntity current = getActiveSession(authorization);
        LocalDateTime now = LocalDateTime.now();
        List<AuthSessionEntity> sessions = authSessionRepository
                .findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByLastAccessAtDesc(current.getUserId(), now);
        sessions.stream()
                .filter(session -> !session.getId().equals(current.getId()))
                .forEach(session -> session.setRevokedAt(now));
        authSessionRepository.saveAll(sessions);
        authSecurityService.recordEvent(
                current.getUserId(), "session_revoke_others", "SUCCESS", "medium", current.getClientIp(),
                current.getUserAgent(), null, "keptSessionId=" + current.getId()
        );
    }

    @Transactional
    public void revokeAllSessionsForUser(Long userId, String reason) {
        LocalDateTime now = LocalDateTime.now();
        List<AuthSessionEntity> sessions = authSessionRepository
                .findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByLastAccessAtDesc(userId, now);
        sessions.forEach(session -> session.setRevokedAt(now));
        authSessionRepository.saveAll(sessions);
        authSecurityService.recordEvent(userId, "session_revoke_all", "SUCCESS", "high", null, null, null, reason);
    }

    @Transactional(readOnly = true)
    public void validateCsrf(String sessionToken, String csrfToken) {
        if (sessionToken == null || sessionToken.isBlank() || csrfToken == null || csrfToken.isBlank()) {
            throw new BusinessException("AUTH_CSRF_INVALID", "安全校验失败，请刷新页面后重试");
        }
        AuthSessionEntity session = findActiveSession(sessionToken);
        if (session.getCsrfTokenHash() == null
                || !session.getCsrfTokenHash().equals(PasswordHashUtil.sha256(csrfToken))) {
            authSecurityService.recordEvent(
                    session.getUserId(), "csrf_rejected", "AUTH_CSRF_INVALID", "high",
                    session.getClientIp(), session.getUserAgent(), null, "csrf mismatch"
            );
            throw new BusinessException("AUTH_CSRF_INVALID", "安全校验失败，请刷新页面后重试");
        }
    }

    @Transactional
    public void touchSessionToken(String sessionToken) {
        AuthSessionEntity session = findActiveSession(sessionToken);
        LocalDateTime last = session.getLastAccessAt() == null ? session.getIssuedAt() : session.getLastAccessAt();
        if (last == null || last.isBefore(LocalDateTime.now().minusMinutes(properties.getActivityTouchMinutes()))) {
            session.setLastAccessAt(LocalDateTime.now());
            authSessionRepository.save(session);
        }
    }

    private SessionMaterial createSession(Long userId, String clientIp, String userAgent, boolean rememberMe) {
        LocalDateTime now = LocalDateTime.now();
        String sessionToken = generateToken();
        String csrfToken = generateToken();
        AuthSessionEntity session = new AuthSessionEntity();
        session.setUserId(userId);
        session.setTokenHash(PasswordHashUtil.sha256(sessionToken));
        session.setCsrfTokenHash(PasswordHashUtil.sha256(csrfToken));
        session.setIssuedAt(now);
        session.setLastAccessAt(now);
        session.setExpiresAt(now.plusHours(properties.sessionHours(rememberMe)));
        session.setClientIp(trimToLength(clientIp, 64));
        session.setUserAgent(trimToLength(userAgent, 500));
        session.setDeviceName(deviceName(userAgent));
        session.setRememberMe(rememberMe);
        return new SessionMaterial(authSessionRepository.save(session), sessionToken, csrfToken);
    }

    private AuthSessionEntity getActiveSession(String authorization) {
        return findActiveSession(extractToken(authorization));
    }

    private AuthSessionEntity findActiveSession(String rawToken) {
        return authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                        PasswordHashUtil.sha256(rawToken), LocalDateTime.now())
                .orElseThrow(() -> new BusinessException("AUTH_UNAUTHORIZED", "登录状态无效或已过期"));
    }

    private AppUserEntity requireActiveUser(Long userId) {
        AppUserEntity user = appUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("AUTH_USER_NOT_FOUND", "用户不存在"));
        if (!USER_STATUS_ACTIVE.equals(user.getStatus()) || user.getDeletedAt() != null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "登录状态无效或已过期");
        }
        return user;
    }

    private String extractToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "缺少登录凭证");
        }
        String value = authorization.trim();
        if (value.toLowerCase().startsWith("bearer ")) value = value.substring(7).trim();
        if (value.isBlank()) throw new BusinessException("AUTH_UNAUTHORIZED", "缺少登录凭证");
        return value;
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private AuthUserResponse toUserResponse(AppUserEntity user) {
        return new AuthUserResponse(
                user.getId(), user.getUsername(), user.getPhone(), user.getEmail(), user.getDisplayName(),
                user.getAvatarUrl(), user.getStatus(), user.getLastLoginAt(), user.getCreatedAt()
        );
    }

    private AuthSessionResponse toSessionResponse(AuthSessionEntity session, boolean current) {
        return new AuthSessionResponse(
                session.getId(),
                current,
                session.getIssuedAt(),
                session.getLastAccessAt() == null ? session.getIssuedAt() : session.getLastAccessAt(),
                session.getExpiresAt(),
                authSecurityService.maskIp(session.getClientIp()),
                session.getDeviceName() == null ? "未知设备" : session.getDeviceName()
        );
    }

    private int maxAgeSeconds(AuthSessionEntity session) {
        long seconds = Math.max(0, Duration.between(LocalDateTime.now(), session.getExpiresAt()).getSeconds());
        return (int) Math.min(Integer.MAX_VALUE, seconds);
    }

    private String deviceName(String userAgent) {
        String value = trimToNull(userAgent);
        if (value == null) return "未知设备";
        String browser = value.contains("Edg/") ? "Edge" : value.contains("Chrome/") ? "Chrome"
                : value.contains("Firefox/") ? "Firefox" : value.contains("Safari/") ? "Safari" : "浏览器";
        String platform = value.contains("Windows") ? "Windows" : value.contains("Macintosh") ? "macOS"
                : value.contains("Android") ? "Android" : value.contains("iPhone") ? "iPhone" : "设备";
        return platform + " · " + browser;
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String trimToLength(String value, int maxLength) {
        String trimmed = trimToNull(value);
        if (trimmed == null || trimmed.length() <= maxLength) return trimmed;
        return trimmed.substring(0, maxLength);
    }

    public record AuthLoginResult(LoginResponse response, String sessionToken, int maxAgeSeconds) {
    }

    private record SessionMaterial(AuthSessionEntity session, String sessionToken, String csrfToken) {
    }
}
