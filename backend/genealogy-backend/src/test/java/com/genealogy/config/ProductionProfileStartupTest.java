package com.genealogy.config;

import com.genealogy.GenealogyApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionProfileStartupTest {

    @Test
    void shouldFailApplicationStartupWithExplicitMissingSecretMessage() {
        String previousUrl = System.getProperty("DB_URL");
        String previousUsername = System.getProperty("DB_USERNAME");
        String previousPassword = System.getProperty("DB_PASSWORD");
        try {
            System.setProperty("DB_URL", "");
            System.setProperty("DB_USERNAME", "");
            System.setProperty("DB_PASSWORD", "");

            SpringApplication application = new SpringApplication(GenealogyApplication.class);
            application.setWebApplicationType(WebApplicationType.NONE);
            application.setAdditionalProfiles("prod");

            RuntimeException error = assertThrows(RuntimeException.class, application::run);
            String messages = collectMessages(error);
            assertTrue(messages.contains("Missing required Secret variables"));
            assertTrue(messages.contains("DB_URL"));
            assertTrue(messages.contains("DB_USERNAME"));
            assertTrue(messages.contains("DB_PASSWORD"));
        } finally {
            restore("DB_URL", previousUrl);
            restore("DB_USERNAME", previousUsername);
            restore("DB_PASSWORD", previousPassword);
        }
    }

    private String collectMessages(Throwable error) {
        StringBuilder messages = new StringBuilder();
        Throwable current = error;
        while (current != null) {
            if (current.getMessage() != null) {
                messages.append(current.getMessage()).append('\n');
            }
            current = current.getCause();
        }
        return messages.toString();
    }

    private void restore(String name, String value) {
        if (value == null) {
            System.clearProperty(name);
        } else {
            System.setProperty(name, value);
        }
    }
}
