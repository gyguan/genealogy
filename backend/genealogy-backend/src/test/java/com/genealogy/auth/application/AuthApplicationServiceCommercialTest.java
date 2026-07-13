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
