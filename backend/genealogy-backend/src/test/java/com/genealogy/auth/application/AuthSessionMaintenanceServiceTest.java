package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.repository.AuthSessionRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthSessionMaintenanceServiceTest {

    @Test
    void removesOnlySessionsOlderThanConfiguredRetention() {
        AuthSessionRepository repository = mock(AuthSessionRepository.class);
        AuthProperties properties = new AuthProperties();
        properties.setSessionRetentionDays(30);
        when(repository.deleteRetiredBefore(any(LocalDateTime.class))).thenReturn(4);
        AuthSessionMaintenanceService service = new AuthSessionMaintenanceService(repository, properties);
        assertEquals(4, service.cleanupRetiredSessions());
        verify(repository).deleteRetiredBefore(any(LocalDateTime.class));
    }
}
