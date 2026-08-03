package com.genealogy.database;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class CurrentSeedDataContractTest {

    private static final Path ROOT = Path.of("src/main/resources/db/seed/current");

    @Test
    void resetRequiresNonProductionEnvironmentAndExplicitConfirmation() throws IOException {
        String sql = read("00_reset_business_data.sql");

        assertThat(sql)
                .contains("RESET_CURRENT_GENEALOGY_DATA")
                .contains("genealogy.seed.environment")
                .contains("pg_advisory_xact_lock")
                .contains("restart identity cascade")
                .contains("flyway_schema_history")
                .doesNotContain("truncate table app_user")
                .doesNotContain("truncate table app_role")
                .doesNotContain("truncate table app_permission");
    }

    @Test
    void scenarioSeedCoversEveryCurrentRelationshipCategoryAndDomain() throws IOException {
        String sql = read("10_seed_current_scenarios.sql");

        assertThat(sql)
                .contains("'parent_child'")
                .contains("'spouse'")
                .contains("'adoptive'")
                .contains("'successor'")
                .contains("'out_adoption'")
                .contains("'in_adoption'")
                .contains("'dual_successor'")
                .contains("'heir_son'")
                .contains("'no_descendant'")
                .contains("'blood'")
                .contains("'ritual'")
                .contains("'marriage'")
                .contains("'status'")
                .contains("insert into clan_membership")
                .contains("insert into member_role")
                .contains("insert into culture_item")
                .contains("insert into migration_event")
                .contains("insert into culture_site")
                .contains("insert into import_job")
                .contains("insert into operation_log")
                .doesNotContain("insert into clan_member (");
    }

    @Test
    void performanceGeneratorUsesSetBasedBoundedInputs() throws IOException {
        String sql = read("20_generate_performance_data.sql");

        assertThat(sql)
                .contains("generate_series")
                .contains("person_count must be between")
                .contains("children_per_parent must be between")
                .contains("nextval(pg_get_serial_sequence('person','id'))")
                .contains("relation_category")
                .contains("analyze relationship")
                .doesNotContain("\nfor ")
                .doesNotContain("\nwhile ");
    }

    @Test
    void verificationFailsOnCrossClanCyclesAndCategoryMismatch() throws IOException {
        String sql = read("30_verify_seed_data.sql");

        assertThat(sql)
                .contains("Cross-clan branch parent detected")
                .contains("Branch cycle detected")
                .contains("Self relationship detected")
                .contains("Relationship type/category mismatch detected")
                .contains("Self-review detected")
                .contains("Member role scope points outside membership clan")
                .contains("Seed integrity verification passed");
    }

    private String read(String fileName) throws IOException {
        return Files.readString(ROOT.resolve(fileName));
    }
}
