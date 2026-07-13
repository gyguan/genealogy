package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.dto.CommercialAuthDtos.ForgotPasswordRequest;
import com.genealogy.auth.dto.CommercialAuthDtos.ResetPasswordRequest;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.entity.PasswordResetTokenEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.auth.repository.PasswordResetTokenRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PasswordResetApplicationServiceTest {

    @Test
    void unknownAccountReturnsGenericResponseWithoutCreatingToken() {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);
        AuthApplicationService auth = mock(AuthApplicationService.class);
        AuthSecurityService security = mock(AuthSecurityService.class);
        PasswordResetApplicationService service = new PasswordResetApplicationService(
                users, tokens, auth, security, new AuthProperties()
        );
        when(users.findRecoverableAccount("missing@example.com")).thenReturn(Optional.empty());

        var response = service.request(
                new ForgotPasswordRequest("missing@example.com"), "10.0.0.1", "test-agent"
        );

        assertNull(response.developmentToken());
        verify(security).recordEvent(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void resetIsSingleUseAndRevokesExistingSessions() {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);
        AuthApplicationService auth = mock(AuthApplicationService.class);
        AuthSecurityService security = mock(AuthSecurityService.class);
        PasswordResetApplicationService service = new PasswordResetApplicationService(
                users, tokens, auth, security, new AuthProperties()
        );

        String rawToken = "valid-reset-token-value-1234567890";
        PasswordResetTokenEntity token = new PasswordResetTokenEntity();
        token.setId(9L);
        token.setUserId(7L);
        token.setTokenHash(PasswordHashUtil.sha256(rawToken));
        token.setCreatedAt(LocalDateTime.now().minusMinutes(2));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(20));
        AppUserEntity user = new AppUserEntity();
        user.setId(7L);
        user.setUsername("member");
        user.setDisplayName("成员");
        user.setStatus("active");
        user.setPasswordHash(PasswordHashUtil.hash("OldPassword@123"));
        user.setCreatedAt(LocalDateTime.now().minusDays(2));
        user.setUpdatedAt(LocalDateTime.now().minusDays(1));

        when(tokens.findForUpdateByTokenHash(PasswordHashUtil.sha256(rawToken))).thenReturn(Optional.of(token));
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(users.save(any(AppUserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokens.save(any(PasswordResetTokenEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokens.findByUserIdAndUsedAtIsNullAndRevokedAtIsNull(7L)).thenReturn(List.of());

        service.reset(new ResetPasswordRequest(rawToken, "NewPassword@123"), "10.0.0.1", "agent");

        assertNotEquals(PasswordHashUtil.hash("OldPassword@123"), user.getPasswordHash());
        ArgumentCaptor<PasswordResetTokenEntity> captor = ArgumentCaptor.forClass(PasswordResetTokenEntity.class);
        verify(tokens).save(captor.capture());
        verify(auth).revokeAllSessionsForUser(7L, "password reset");
    }
}
