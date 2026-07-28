package com.genealogy.integration;

import com.genealogy.GenealogyApplication;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class RestartRecoveryPostgreSqlIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_restart_recovery_it")
            .withUsername("genealogy")
            .withPassword("genealogy");

    @Test
    void flywayHistoryAndBusinessStateSurviveApplicationRestart() {
        Long clanId;
        Long taskId;
        Long revisionId;

        try (ConfigurableApplicationContext first = startApplication()) {
            JdbcTemplate jdbcTemplate = first.getBean(JdbcTemplate.class);
            assertFlywayHistoryHealthy(jdbcTemplate);

            AppUserRepository userRepository = first.getBean(AppUserRepository.class);
            ClanRepository clanRepository = first.getBean(ClanRepository.class);
            AuditRecordRepository auditRecordRepository = first.getBean(AuditRecordRepository.class);
            CheckTaskRepository checkTaskRepository = first.getBean(CheckTaskRepository.class);

            LocalDateTime now = LocalDateTime.now();
            AppUserEntity submitter = new AppUserEntity();
            submitter.setUsername("restart-submitter-" + UUID.randomUUID());
            submitter.setPasswordHash("not-used-in-integration-test");
            submitter.setDisplayName("重启恢复提交人");
            submitter.setStatus("active");
            submitter.setCreatedAt(now);
            submitter.setUpdatedAt(now);
            submitter = userRepository.saveAndFlush(submitter);

            ClanEntity officialClan = new ClanEntity();
            officialClan.setClanCode("RESTART-" + UUID.randomUUID());
            officialClan.setClanName("重启恢复正式宗族");
            officialClan.setSurname("黄");
            officialClan.setStatus("official");
            officialClan.setCreatedAt(now);
            officialClan.setUpdatedAt(now);
            officialClan = clanRepository.saveAndFlush(officialClan);
            clanId = officialClan.getId();

            AuditRecordEntity revision = new AuditRecordEntity();
            revision.setClanId(clanId);
            revision.setTargetType("clan");
            revision.setTargetId(clanId);
            revision.setChangeType("submit_review");
            revision.setOldPayload("{\"status\":\"draft\"}");
            revision.setNewPayload("{\"status\":\"pending_review\"}");
            revision.setDiffSummary("#837 restart recovery pending revision");
            revision.setSubmitterId(submitter.getId());
            revision.setSubmitTime(now);
            revision.setStatus("pending");
            revision = auditRecordRepository.saveAndFlush(revision);
            revisionId = revision.getId();

            CheckTaskEntity task = new CheckTaskEntity();
            task.setClanId(clanId);
            task.setRevisionId(revisionId);
            task.setReviewLevel(1);
            task.setReviewerRole("clan_admin");
            task.setStatus("pending");
            task.setCreatedAt(now);
            task = checkTaskRepository.saveAndFlush(task);
            taskId = task.getId();
        }

        try (ConfigurableApplicationContext restarted = startApplication()) {
            JdbcTemplate jdbcTemplate = restarted.getBean(JdbcTemplate.class);
            assertFlywayHistoryHealthy(jdbcTemplate);

            ClanEntity recoveredClan = restarted.getBean(ClanRepository.class).findById(clanId).orElseThrow();
            AuditRecordEntity recoveredRevision = restarted.getBean(AuditRecordRepository.class).findById(revisionId).orElseThrow();
            CheckTaskEntity recoveredTask = restarted.getBean(CheckTaskRepository.class).findById(taskId).orElseThrow();

            assertThat(recoveredClan.getStatus()).isEqualTo("official");
            assertThat(recoveredRevision.getStatus()).isEqualTo("pending");
            assertThat(recoveredTask.getStatus()).isEqualTo("pending");
            assertThat(recoveredTask.getRevisionId()).isEqualTo(revisionId);
        }
    }

    private ConfigurableApplicationContext startApplication() {
        return new SpringApplicationBuilder(GenealogyApplication.class)
                .web(WebApplicationType.NONE)
                .properties(Map.of(
                        "spring.datasource.url", POSTGRES.getJdbcUrl(),
                        "spring.datasource.username", POSTGRES.getUsername(),
                        "spring.datasource.password", POSTGRES.getPassword(),
                        "spring.datasource.driver-class-name", POSTGRES.getDriverClassName(),
                        "spring.flyway.enabled", "true",
                        "spring.jpa.hibernate.ddl-auto", "validate",
                        "spring.task.scheduling.enabled", "false",
                        "spring.main.banner-mode", "off"
                ))
                .run();
    }

    private void assertFlywayHistoryHealthy(JdbcTemplate jdbcTemplate) {
        Integer successfulMigrations = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success = true",
                Integer.class
        );
        Integer failedMigrations = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success = false",
                Integer.class
        );
        Integer duplicateRanks = jdbcTemplate.queryForObject(
                "select count(*) from (select installed_rank from flyway_schema_history group by installed_rank having count(*) > 1) duplicate_rank",
                Integer.class
        );

        assertThat(successfulMigrations).isNotNull().isGreaterThan(0);
        assertThat(failedMigrations).isZero();
        assertThat(duplicateRanks).isZero();
    }
}
