package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.dto.LoginRequest;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.entity.AuthSessionEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.auth.repository.AuthSessionRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthApplicationServiceCommercialTest {

    @Test
    void issuesHashedServerSessionWithoutExposingBearerTokenByDefault() {
        AppUserRepository userRepository = mock(AppUserRepository.class);
        AuthSessionRepository sessionRepository = mock(AuthSessionRepository.class);
        AuthSecurityService securityService = mock(AuthSecurityService.class);
        AuthProperties properties = new AuthProperties();
        AuthApplicationService service = new AuthApplicationService(
                userRepository, sessionRepository, securityService, properties
        );

        AppUserEntity user = activeUser("member", "Password@123");
        when(userRepository.findByUsernameAndDeletedAtIsNull("member")).thenReturn(Optional.of(user));
        when(sessionRepository.save(any(AuthSessionEntity.class))).thenAnswer(invocation -> {
            AuthSessionEntity session = invocation.getArgument(0);
            session.setId(88L);
            return session;
        });
        when(userRepository.save(any(AppUserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthApplicationService.AuthLoginResult result = service.loginSession(
                new LoginRequest("member", "Password@123", false),
                "192.168.1.20",
                "Mozilla/5.0 Chrome/120 Windows"
        );

        assertNull(result.response().accessToken());
        assertNull(result.response().tokenType());
        assertNotNull(result.response().csrfToken());
        assertFalse(result.sessionToken().isBlank());
        assertEquals("member", result.response().user().username());

        ArgumentCaptor<AuthSessionEntity> sessionCaptor = ArgumentCaptor.forClass(AuthSessionEntity.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        AuthSessionEntity saved = sessionCaptor.getValue();
        assertNotEquals(result.sessionToken(), saved.getTokenHash());
        assertEquals(PasswordHashUtil.sha256(result.sessionToken()), saved.getTokenHash());
        assertNotNull(saved.getCsrfTokenHash());
        assertNotNull(saved.getLastAccessAt());
    }

    @Test
    void unknownAccountUsesGenericFailureAndRecordsAttempt() {
        AppUserRepository userRepository = mock(AppUserRepository.class);
        AuthSessionRepository sessionRepository = mock(AuthSessionRepository.class);
        AuthSecurityService securityService = mock(AuthSecurityService.class);
        AuthApplicationService service = new AuthApplicationService(
                userRepository, sessionRepository, securityService, new AuthProperties()
        );
        when(userRepository.findByUsernameAndDeletedAtIsNull("missing")).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(BusinessException.class, () -> service.loginSession(
                new LoginRequest("missing", "not-the-password", false),
                "10.0.0.8",
                "test-agent"
        ));

        assertEquals("AUTH_LOGIN_FAILED", exception.getCode());
        assertEquals("用户名或密码错误", exception.getMessage());
        verify(securityService).recordLoginAttempt(
                "missing", "10.0.0.8", null, false, "AUTH_LOGIN_FAILED", "test-agent"
        );
    }


    @Test
    void disabledAccountRevokesExistingSessionOnNextRequest() {
        AppUserRepository userRepository = mock(AppUserRepository.class);
        AuthSessionRepository sessionRepository = mock(AuthSessionRepository.class);
        AuthSecurityService securityService = mock(AuthSecurityService.class);
        AuthApplicationService service = new AuthApplicationService(
                userRepository, sessionRepository, securityService, new AuthProperties()
        );
        String rawToken = "disabled-session-token";
        AuthSessionEntity session = new AuthSessionEntity();
        session.setId(55L);
        session.setUserId(7L);
        session.setTokenHash(PasswordHashUtil.sha256(rawToken));
        session.setExpiresAt(LocalDateTime.now().plusHours(1));
        AppUserEntity user = activeUser("disabled", "Password@123");
        user.setStatus("disabled");
        when(sessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                org.mockito.ArgumentMatchers.eq(PasswordHashUtil.sha256(rawToken)), any(LocalDateTime.class)))
                .thenReturn(Optional.of(session));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.currentUserIdOrNull("Bearer " + rawToken));
        assertEquals("AUTH_UNAUTHORIZED", exception.getCode());
        assertNotNull(session.getRevokedAt());
        verify(sessionRepository).save(session);
        verify(securityService).recordEvent(
                org.mockito.ArgumentMatchers.eq(7L),
                org.mockito.ArgumentMatchers.eq("session_revoked_account_inactive"),
                org.mockito.ArgumentMatchers.eq("AUTH_UNAUTHORIZED"),
                org.mockito.ArgumentMatchers.eq("high"),
                any(), any(), any(), any()
        );
    }

    @Test
    void replayOfKnownRevokedSessionIsRejectedAndAudited() {
        AppUserRepository userRepository = mock(AppUserRepository.class);
        AuthSessionRepository sessionRepository = mock(AuthSessionRepository.class);
        AuthSecurityService securityService = mock(AuthSecurityService.class);
        AuthApplicationService service = new AuthApplicationService(
                userRepository, sessionRepository, securityService, new AuthProperties()
        );
        String rawToken = "revoked-session-token";
        String tokenHash = PasswordHashUtil.sha256(rawToken);
        AuthSessionEntity revoked = new AuthSessionEntity();
        revoked.setId(56L);
        revoked.setUserId(7L);
        revoked.setTokenHash(tokenHash);
        revoked.setRevokedAt(LocalDateTime.now().minusMinutes(1));
        when(sessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                org.mockito.ArgumentMatchers.eq(tokenHash), any(LocalDateTime.class))).thenReturn(Optional.empty());
        when(sessionRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(revoked));

        assertThrows(BusinessException.class, () -> service.currentUserIdOrNull("Bearer " + rawToken));
        verify(securityService).recordEvent(
                org.mockito.ArgumentMatchers.eq(7L),
                org.mockito.ArgumentMatchers.eq("session_replay_rejected"),
                org.mockito.ArgumentMatchers.eq("AUTH_SESSION_REPLAYED"),
                org.mockito.ArgumentMatchers.eq("high"),
                any(), any(), any(), any()
        );
    }

    private AppUserEntity activeUser(String username, String password) {
        AppUserEntity user = new AppUserEntity();
        user.setId(7L);
        user.setUsername(username);
        user.setDisplayName("测试成员");
        user.setPasswordHash(PasswordHashUtil.hash(password));
        user.setStatus("active");
        user.setCreatedAt(LocalDateTime.now().minusDays(1));
        user.setUpdatedAt(LocalDateTime.now().minusDays(1));
        return user;
    }
}
