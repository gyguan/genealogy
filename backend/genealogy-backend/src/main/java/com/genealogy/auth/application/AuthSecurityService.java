package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import com.genealogy.auth.entity.AuthSecurityEventEntity;
import com.genealogy.auth.repository.AuthLoginAttemptRepository;
import com.genealogy.auth.repository.AuthSecurityEventRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import com.genealogy.common.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthSecurityService {

    private final AuthLoginAttemptRepository loginAttemptRepository;
    private final AuthSecurityEventRepository securityEventRepository;
    private final AuthProperties properties;
    private final TransactionTemplate requiresNew;

    public AuthSecurityService(
            AuthLoginAttemptRepository loginAttemptRepository,
            AuthSecurityEventRepository securityEventRepository,
            AuthProperties properties,
            PlatformTransactionManager transactionManager
    ) {
        this.loginAttemptRepository = loginAttemptRepository;
        this.securityEventRepository = securityEventRepository;
        this.properties = properties;
        this.requiresNew = new TransactionTemplate(transactionManager);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

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

    public void recordLoginAttempt(
            String account,
            String clientIp,
            Long userId,
            boolean success,
            String resultCode,
            String userAgent
    ) {
        requiresNew.executeWithoutResult(status -> {
            String accountHash = accountHash(account);
            if (success) {
                // Security events remain immutable audit evidence; the lightweight
                // failure counter rows are cleared so a legitimate login resets
                // the account-specific cooldown window.
                loginAttemptRepository.deleteByAccountHashAndSuccessFalse(accountHash);
            }
            AuthLoginAttemptEntity attempt = new AuthLoginAttemptEntity();
            attempt.setAccountHash(accountHash);
            attempt.setIpHash(ipHash(clientIp));
            attempt.setUserId(userId);
            attempt.setSuccess(success);
            attempt.setResultCode(resultCode);
            attempt.setCreatedAt(LocalDateTime.now());
            loginAttemptRepository.save(attempt);
            securityEventRepository.save(event(
                    userId,
                    success ? "login_success" : "login_failed",
                    resultCode,
                    success ? "low" : "medium",
                    clientIp,
                    userAgent,
                    null,
                    success ? "authentication accepted" : "authentication rejected"
            ));
        });
    }

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
        requiresNew.executeWithoutResult(status -> securityEventRepository.save(
                event(userId, eventType, resultCode, riskLevel, clientIp, userAgent, requestId, detail)
        ));
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
        if (parts.length == 4) return parts[0] + "." + parts[1] + ".***.***";
        return "***";
    }

    private AuthSecurityEventEntity event(
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
        return event;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String limit(String value, int max) {
        if (value == null || value.length() <= max) return value;
        return value.substring(0, max);
    }
}
