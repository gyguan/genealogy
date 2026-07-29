package com.genealogy.config;

import org.springframework.core.env.ConfigurableEnvironment;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Validates production-only requirements after profiles and configuration data
 * are available, but before application beans such as the datasource are built.
 */
public final class ProductionEnvironmentValidator {

    private static final List<String> REQUIRED_SECRETS = List.of(
            "DB_URL", "DB_USERNAME", "DB_PASSWORD"
    );

    public void validate(ConfigurableEnvironment environment) {
        boolean production = Arrays.stream(environment.getActiveProfiles())
                .anyMatch("prod"::equalsIgnoreCase);
        if (!production) {
            return;
        }

        List<String> missing = new ArrayList<>();
        for (String name : REQUIRED_SECRETS) {
            String value = environment.getProperty(name);
            if (value == null || value.isBlank()) {
                missing.add(name);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "Production configuration is incomplete. Missing required Secret variables: "
                            + String.join(", ", missing)
            );
        }
    }
}
