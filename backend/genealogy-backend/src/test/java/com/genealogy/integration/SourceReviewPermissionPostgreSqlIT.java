package com.genealogy.integration;

import com.genealogy.auth.application.PermissionApplicationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration-test")
class SourceReviewPermissionPostgreSqlIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_source_permission_it")
            .withUsername("genealogy")
            .withPassword("genealogy");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.flyway.enabled", () -> true);    }

    @Autowired
    PermissionApplicationService permissionApplicationService;

    @Test
    void ftPerm008_reviewerRoleCanReviewSourceBindingAfterFlywayMigration() {
        assertThat(permissionApplicationService.roleCodeHasPermission("reviewer", "source:review")).isTrue();
        assertThat(permissionApplicationService.roleCodeHasPermission("reviewer", "source.review")).isTrue();
    }
}
