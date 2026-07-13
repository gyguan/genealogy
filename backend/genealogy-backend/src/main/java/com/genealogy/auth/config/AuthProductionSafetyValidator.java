package com.genealogy.auth.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class AuthProductionSafetyValidator implements ApplicationRunner {

    private final AuthProperties properties;
    private final Environment environment;

    public AuthProductionSafetyValidator(AuthProperties properties, Environment environment) {
        this.properties = properties;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean production = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile));
        if (!production) return;
        if (properties.isDemoModeEnabled()) {
            throw new IllegalStateException("Production must not enable genealogy.auth.demo-mode-enabled");
        }
        if (properties.isExposeResetToken()) {
            throw new IllegalStateException("Production must not expose password reset tokens");
        }
        if (properties.isExposeBearerToken()) {
            throw new IllegalStateException("Production must not expose Bearer compatibility tokens");
        }
        if (!properties.isCookieSecure()) {
            throw new IllegalStateException("Production authentication cookies must use Secure=true");
        }
        if (properties.isPublicRegistrationEnabled()) {
            throw new IllegalStateException("Production public registration must remain disabled");
        }
        if (properties.getResetDeliveryUrl() == null || properties.getResetDeliveryUrl().isBlank()) {
            throw new IllegalStateException("Production password recovery requires a reset delivery endpoint");
        }
    }
}
