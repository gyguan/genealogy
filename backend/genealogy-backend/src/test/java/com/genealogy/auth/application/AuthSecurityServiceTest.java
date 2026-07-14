package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import com.genealogy.auth.entity.AuthSecurityEventEntity;
import com.genealogy.auth.repository.AuthLoginAttemptRepository;
import com.genealogy.auth.repository.AuthSecurityEventRepository;
import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthSecurityServiceTest {

    @Test
    void blocksAccountDuringConfiguredCooldownAndPersistsAudit() {
        Fixture fixture = new Fixture();
        fixture.properties.setAccountMaxFailures(3);
        AuthLoginAttemptEntity latest = failure(LocalDateTime.now().minusMinutes(1));
        when(fixture.attempts.findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.of(latest));
        when(fixture.attempts.findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.empty());
        when(fixture.attempts.countByAccountHashAndSuccessFalseAndCreatedAtAfter(anyString(), any())).thenReturn(3L);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> fixture.service.requireLoginAllowed("member", "10.0.0.1"));
        assertEquals("AUTH_LOGIN_THROTTLED", exception.getCode());
        verify(fixture.events).save(any(AuthSecurityEventEntity.class));
    }

    @Test
    void blocksIpDuringConfiguredCooldown() {
        Fixture fixture = new Fixture();
        fixture.properties.setIpMaxFailures(2);
        AuthLoginAttemptEntity latest = failure(LocalDateTime.now().minusMinutes(1));
        when(fixture.attempts.findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.empty());
        when(fixture.attempts.findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.of(latest));
        when(fixture.attempts.countByIpHashAndSuccessFalseAndCreatedAtAfter(anyString(), any())).thenReturn(2L);
        assertThrows(BusinessException.class, () -> fixture.service.requireLoginAllowed("member", "10.0.0.1"));
    }

    @Test
    void cooldownAutomaticallyExpiresWithoutPermanentLock() {
        Fixture fixture = new Fixture();
        fixture.properties.setAccountMaxFailures(3);
        fixture.properties.setLoginCooldownMinutes(15);
        AuthLoginAttemptEntity latest = failure(LocalDateTime.now().minusMinutes(16));
        when(fixture.attempts.findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.of(latest));
        when(fixture.attempts.findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.empty());
        when(fixture.attempts.countByAccountHashAndSuccessFalseAndCreatedAtAfter(anyString(), any())).thenReturn(3L);
        assertDoesNotThrow(() -> fixture.service.requireLoginAllowed("member", "10.0.0.1"));
    }

    @Test
    void failedAttemptStoresOnlyAccountAndIpHashes() {
        Fixture fixture = new Fixture();
        fixture.service.recordLoginAttempt("SensitiveUser", "192.168.10.20", null, false, "AUTH_LOGIN_FAILED", "agent");
        var captor = org.mockito.ArgumentCaptor.forClass(AuthLoginAttemptEntity.class);
        verify(fixture.attempts).save(captor.capture());
        assertEquals(fixture.service.accountHash("sensitiveuser"), captor.getValue().getAccountHash());
        assertEquals(fixture.service.ipHash("192.168.10.20"), captor.getValue().getIpHash());
    }

    @Test
    void successfulLoginClearsOnlyAccountFailureCounterRows() {
        Fixture fixture = new Fixture();
        fixture.service.recordLoginAttempt("member", "192.168.10.20", 7L, true, "SUCCESS", "agent");
        verify(fixture.attempts).deleteByAccountHashAndSuccessFalse(fixture.service.accountHash("member"));
        verify(fixture.attempts).save(any(AuthLoginAttemptEntity.class));
    }

    private static AuthLoginAttemptEntity failure(LocalDateTime createdAt) {
        AuthLoginAttemptEntity entity = new AuthLoginAttemptEntity();
        entity.setCreatedAt(createdAt);
        entity.setSuccess(false);
        return entity;
    }

    private static final class Fixture {
        final AuthLoginAttemptRepository attempts = mock(AuthLoginAttemptRepository.class);
        final AuthSecurityEventRepository events = mock(AuthSecurityEventRepository.class);
        final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        final AuthProperties properties = new AuthProperties();
        final AuthSecurityService service;

        Fixture() {
            when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
            service = new AuthSecurityService(attempts, events, properties, transactionManager);
        }
    }
}
