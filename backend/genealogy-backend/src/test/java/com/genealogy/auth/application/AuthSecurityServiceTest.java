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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthSecurityServiceTest {

    @Test
    void blocksAccountAfterConfiguredFailureThresholdAndPersistsAudit() {
        AuthLoginAttemptRepository attempts = mock(AuthLoginAttemptRepository.class);
        AuthSecurityEventRepository events = mock(AuthSecurityEventRepository.class);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        AuthProperties properties = new AuthProperties();
        properties.setAccountMaxFailures(3);
        properties.setIpMaxFailures(20);
        AuthSecurityService service = new AuthSecurityService(attempts, events, properties, transactionManager);

        when(attempts.countByAccountHashAndSuccessFalseAndCreatedAtAfter(anyString(), any(LocalDateTime.class)))
                .thenReturn(3L);
        when(attempts.countByIpHashAndSuccessFalseAndCreatedAtAfter(anyString(), any(LocalDateTime.class)))
                .thenReturn(1L);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.requireLoginAllowed("member", "10.0.0.1")
        );

        assertEquals("AUTH_LOGIN_THROTTLED", exception.getCode());
        verify(events).save(any(AuthSecurityEventEntity.class));
    }

    @Test
    void failedAttemptStoresOnlyAccountAndIpHashes() {
        AuthLoginAttemptRepository attempts = mock(AuthLoginAttemptRepository.class);
        AuthSecurityEventRepository events = mock(AuthSecurityEventRepository.class);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        AuthSecurityService service = new AuthSecurityService(
                attempts, events, new AuthProperties(), transactionManager
        );

        service.recordLoginAttempt("SensitiveUser", "192.168.10.20", null, false, "AUTH_LOGIN_FAILED", "agent");

        var captor = org.mockito.ArgumentCaptor.forClass(AuthLoginAttemptEntity.class);
        verify(attempts).save(captor.capture());
        AuthLoginAttemptEntity saved = captor.getValue();
        assertEquals(service.accountHash("sensitiveuser"), saved.getAccountHash());
        assertEquals(service.ipHash("192.168.10.20"), saved.getIpHash());
        verify(events).save(any(AuthSecurityEventEntity.class));
    }

    @Test
    void successfulLoginClearsOnlyAccountFailureCounterRows() {
        AuthLoginAttemptRepository attempts = mock(AuthLoginAttemptRepository.class);
        AuthSecurityEventRepository events = mock(AuthSecurityEventRepository.class);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        AuthSecurityService service = new AuthSecurityService(
                attempts, events, new AuthProperties(), transactionManager
        );

        service.recordLoginAttempt("member", "192.168.10.20", 7L, true, "SUCCESS", "agent");

        verify(attempts).deleteByAccountHashAndSuccessFalse(service.accountHash("member"));
        verify(attempts).save(any(AuthLoginAttemptEntity.class));
        verify(events).save(any(AuthSecurityEventEntity.class));
    }
}
