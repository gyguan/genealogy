package com.genealogy.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;

/**
 * Seeds deterministic demo data on a fresh local database after Flyway and
 * bootstrap-account initialization have completed.
 *
 * <p>Safety rules:
 * <ul>
 *   <li>only an empty active-profile set or the single {@code local} profile is eligible;</li>
 *   <li>CI environments are always skipped;</li>
 *   <li>any existing clan causes a skip, so startup never overwrites business data;</li>
 *   <li>production/test profiles are never eligible even if the property is enabled.</li>
 * </ul>
 */
@Component
@ConditionalOnProperty(
        prefix = "genealogy.seed",
        name = "auto-enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class LocalTestDataAutoInitializer implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger log = LoggerFactory.getLogger(LocalTestDataAutoInitializer.class);
    private static final String SEED_RESOURCE =
            "db/seed/current/navicat/10_seed_current_scenarios.sql";

    private final Environment environment;
    private final JdbcTemplate jdbcTemplate;

    public LocalTestDataAutoInitializer(Environment environment, JdbcTemplate jdbcTemplate) {
        this.environment = environment;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        initializeIfNeeded();
    }

    void initializeIfNeeded() {
        if (!isEligibleLocalRuntime()) {
            log.info("event=local_test_seed_skipped reason=environment_not_local result=skipped");
            return;
        }

        Long clanCount = jdbcTemplate.queryForObject("select count(*) from clan", Long.class);
        if (clanCount != null && clanCount > 0) {
            log.info(
                    "event=local_test_seed_skipped reason=business_data_exists clanCount={} result=skipped",
                    clanCount
            );
            return;
        }

        try {
            ClassPathResource resource = new ClassPathResource(SEED_RESOURCE);
            String sql = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
            jdbcTemplate.execute(sql);

            Long scenarioClanCount = jdbcTemplate.queryForObject(
                    "select count(*) from clan where clan_code like 'SCENARIO-%'",
                    Long.class
            );
            if (scenarioClanCount == null || scenarioClanCount < 2) {
                throw new IllegalStateException(
                        "Local test data seed completed without the expected scenario clans"
                );
            }
            log.warn(
                    "event=local_test_seed_initialized scenarioClanCount={} result=success "
                            + "accounts=demo_admin,demo_branch_admin,demo_editor,demo_reviewer,demo_viewer",
                    scenarioClanCount
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to initialize local genealogy test data", exception);
        }
    }

    boolean isEligibleLocalRuntime() {
        String ci = environment.getProperty("CI");
        if ("true".equalsIgnoreCase(ci)) {
            return false;
        }

        String[] activeProfiles = environment.getActiveProfiles();
        return activeProfiles.length == 0
                || (activeProfiles.length == 1 && "local".equalsIgnoreCase(activeProfiles[0]));
    }
}
