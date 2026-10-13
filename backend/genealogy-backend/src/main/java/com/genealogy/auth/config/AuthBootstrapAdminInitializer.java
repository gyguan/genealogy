package com.genealogy.auth.config;

import com.genealogy.auth.application.AuthApplicationService;
import com.genealogy.auth.dto.RegisterRequest;
import com.genealogy.auth.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first login account for a deliberately empty installation.
 *
 * <p>The account is created only when the bootstrap flag is explicitly enabled
 * and app_user is empty. It receives no role here. After login, the existing
 * clan creation flow creates the first clan membership and grants clan_admin.
 * Disable the bootstrap flag after the first account has been created.</p>
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
@ConditionalOnProperty(
        prefix = "genealogy.auth",
        name = "bootstrap-admin-enabled",
        havingValue = "true"
)
public class AuthBootstrapAdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AuthBootstrapAdminInitializer.class);

    private final AuthProperties properties;
    private final AppUserRepository appUserRepository;
    private final AuthApplicationService authApplicationService;

    public AuthBootstrapAdminInitializer(
            AuthProperties properties,
            AppUserRepository appUserRepository,
            AuthApplicationService authApplicationService
    ) {
        this.properties = properties;
        this.appUserRepository = appUserRepository;
        this.authApplicationService = authApplicationService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (appUserRepository.existsAny()) {
            log.info("event=bootstrap_admin_skipped reason=users_exist result=skipped");
            return;
        }

        String username = required(properties.getBootstrapAdminUsername(), "GENEALOGY_AUTH_BOOTSTRAP_ADMIN_USERNAME");
        String password = required(properties.getBootstrapAdminPassword(), "GENEALOGY_AUTH_BOOTSTRAP_ADMIN_PASSWORD");
        String displayName = normalizeDisplayName(properties.getBootstrapAdminDisplayName());

        if (username.length() > 80) {
            throw invalid("GENEALOGY_AUTH_BOOTSTRAP_ADMIN_USERNAME must be at most 80 characters");
        }
        if (password.length() < 12 || password.length() > 64) {
            throw invalid("GENEALOGY_AUTH_BOOTSTRAP_ADMIN_PASSWORD must contain 12 to 64 characters");
        }
        if (displayName.length() > 120) {
            throw invalid("GENEALOGY_AUTH_BOOTSTRAP_ADMIN_DISPLAY_NAME must be at most 120 characters");
        }

        try {
            authApplicationService.registerApproved(
                    new RegisterRequest(username, password, displayName, null, null)
            );
            log.warn(
                    "event=bootstrap_admin_created username={} result=success action=disable_bootstrap_flag",
                    username
            );
        } catch (RuntimeException exception) {
            // Two application instances may race during the very first deployment.
            // registerApproved can observe the other instance either before insert
            // (business duplicate) or during insert (database unique violation).
            // Only swallow the failure when the configured bootstrap username now
            // exists; unrelated failures still abort startup.
            if (appUserRepository.existsByUsernameAndDeletedAtIsNull(username)) {
                log.info(
                        "event=bootstrap_admin_skipped username={} reason=created_concurrently result=skipped",
                        username
                );
                return;
            }
            throw exception;
        }
    }

    private String required(String value, String environmentName) {
        if (value == null || value.isBlank()) {
            throw invalid(environmentName + " is required when bootstrap admin is enabled");
        }
        return value.trim();
    }

    private String normalizeDisplayName(String value) {
        return value == null || value.isBlank() ? "Initial Administrator" : value.trim();
    }

    private IllegalStateException invalid(String message) {
        return new IllegalStateException("Invalid bootstrap admin configuration: " + message);
    }
}
