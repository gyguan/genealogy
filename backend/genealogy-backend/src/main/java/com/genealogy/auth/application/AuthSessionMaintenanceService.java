package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.repository.AuthSessionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthSessionMaintenanceService {

    private final AuthSessionRepository authSessionRepository;
    private final AuthProperties properties;

    public AuthSessionMaintenanceService(AuthSessionRepository authSessionRepository, AuthProperties properties) {
        this.authSessionRepository = authSessionRepository;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${genealogy.auth.session-cleanup-interval-ms:3600000}")
    @Transactional
    public int cleanupRetiredSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(1, properties.getSessionRetentionDays()));
        return authSessionRepository.deleteRetiredBefore(cutoff);
    }
}
