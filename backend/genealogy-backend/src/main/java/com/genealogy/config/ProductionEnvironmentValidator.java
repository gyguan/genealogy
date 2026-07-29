package com.genealogy.config;

import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Validates production-only requirements after configuration data has been
 * loaded but before the application context creates the datasource.
 */
public final class ProductionEnvironmentValidator
        implements ApplicationListener<ApplicationEnvironmentPreparedEvent>, Ordered {

    private static final List<String> REQUIRED_SECRETS = List.of(
            "DB_URL", "DB_USERNAME", "DB_PASSWORD"
    );

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        validate(event.getEnvironment());
    }

    void validate(ConfigurableEnvironment environment) {
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

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
