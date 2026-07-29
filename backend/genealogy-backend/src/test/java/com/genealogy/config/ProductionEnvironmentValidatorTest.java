package com.genealogy.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionEnvironmentValidatorTest {

    private final ProductionEnvironmentValidator validator = new ProductionEnvironmentValidator();

    @Test
    void shouldIgnoreNonProductionProfiles() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("local");

        assertDoesNotThrow(() -> validator.postProcessEnvironment(environment, new SpringApplication()));
    }

    @Test
    void shouldFailFastWhenProductionSecretsAreMissing() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment.setProperty("DB_URL", "jdbc:postgresql://db:5432/genealogy");

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> validator.postProcessEnvironment(environment, new SpringApplication())
        );

        assertTrue(error.getMessage().contains("DB_USERNAME"));
        assertTrue(error.getMessage().contains("DB_PASSWORD"));
    }

    @Test
    void shouldAcceptCompleteProductionSecrets() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment.setProperty("DB_URL", "jdbc:postgresql://db:5432/genealogy");
        environment.setProperty("DB_USERNAME", "genealogy_app");
        environment.setProperty("DB_PASSWORD", "from-secret-store");

        assertDoesNotThrow(() -> validator.postProcessEnvironment(environment, new SpringApplication()));
    }
}
