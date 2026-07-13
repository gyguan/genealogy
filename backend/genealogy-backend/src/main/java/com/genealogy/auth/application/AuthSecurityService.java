package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import com.genealogy.auth.entity.AuthSecurityEventEntity;
import com.genealogy.auth.repository.AuthLoginAttemptRepository;
import com.genealogy.auth.repository.AuthSecurityEventRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import com.genealogy.common.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthSecurityService {

    private final AuthLoginAttemptRepository loginAttemptRepository;
    private final AuthSecurityEventRepository securityEventRepository;
    private final AuthProperties properties;

    public AuthSecurityService(
            AuthLoginAttemptRepository loginAttemptRepository,
            AuthSecurityEventRepository securityEventRepository,
            AuthProperties properties
    ) {
        this.loginAttemptRepository = loginAttemptRepository;
        this.securityEventRepository = securityEventRepository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public void requireLoginAllowed(String account, String clientIp) {
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(properties.getLoginWindowMinutes());
        long accountFailures = loginAttemptRepository.countByAccountHashAndSuccessFalseAndCreatedAtAfter(
                accountHash(account), windowStart
        );
        long ipFailures = loginAttemptRepository.countByIpHashAndSuccessFalseAndCreatedAtAfter(
                ipHash(clientIp), windowStart
        );
        if (accountFailures >= properties.getAccountMaxFailures() || ipFailures >= properties.getIpMaxFailures()) {
            recordEvent(null, "login_throttled", "AUTH_LOGIN_THROTTLED", "high", clientIp, null, null,
                    "accountLimit=" + properties.getAccountMaxFailures() + ",ipLimit=" + properties.getIpMaxFailures());
            throw new BusinessException("AUTH_LOGIN_THROTTLED", "登录尝试过于频繁，请稍后再试");
        }
    }

    @Transactional
    public void recordLoginAttempt(
            String account,
            String clientIp,
            Long userId,
            boolean success,
            String resultCode,
            String userAgent
    ) {
        AuthLoginAttemptEntity attempt = new AuthLoginAttemptEntity();
        attempt.setAccountHash(accountHash(account));
        attempt.setIpHash(ipHash(clientIp));
        attempt.setUserId(userId);
        attempt.setSuccess(success);
        attempt.setResultCode(resultCode);
        attempt.setCreatedAt(LocalDateTime.now());
        loginAttemptRepository.save(attempt);

        recordEvent(
                userId,
                success ? "login_success" : "login_failed",
                resultCode,
                success ? "low" : "medium",
                clientIp,
                userAgent,
                null,
                success ? "authentication accepted" : "authentication rejected"
        );
    }

    @Transactional
    public void recordEvent(
            Long userId,
            String eventType,
            String resultCode,
            String riskLevel,
            String clientIp,
            String userAgent,
            String requestId,
            String detail
    ) {
        AuthSecurityEventEntity event = new AuthSecurityEventEntity();
        event.setUserId(userId);
        event.setEventType(limit(eventType, 64));
        event.setResultCode(limit(resultCode, 64));
        event.setRiskLevel(limit(riskLevel, 32));
        event.setIpMasked(maskIp(clientIp));
        event.setUserAgent(limit(userAgent, 500));
        event.setRequestId(limit(requestId, 100));
        event.setDetail(limit(detail, 1000));
        event.setCreatedAt(LocalDateTime.now());
        securityEventRepository.save(event);
    }

    public String accountHash(String account) {
        return PasswordHashUtil.sha256(normalize(account));
    }

    public String ipHash(String clientIp) {
        return PasswordHashUtil.sha256(normalize(clientIp));
    }

    public String maskIp(String value) {
        String ip = normalize(value);
        if (ip.isBlank()) return null;
        if (ip.contains(":")) {
            int marker = ip.indexOf(':');
            return ip.substring(0, Math.min(marker + 1, ip.length())) + "***";
        }
        String[] parts = ip.split("\\.");
        if (parts.length == 4) {
            return parts[0] + "." + parts[1] + ".***.***";
        }
        return "***";
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String limit(String value, int max) {
        if (value == null || value.length() <= max) return value;
        return value.substring(0, max);
    }
}
