
        package com.genealogy.database;

        import org.junit.jupiter.api.Test;

        import java.io.IOException;
        import java.nio.file.Files;
        import java.nio.file.Path;

        import static org.assertj.core.api.Assertions.assertThat;

        class CurrentSeedDataContractTest {

            private static final Path ROOT = Path.of("src/main/resources/db/seed/current");
            private static final Path MIGRATIONS = Path.of("src/main/resources/db/migration");
            private static final Path CULTURE_ENTITIES = Path.of("src/main/java/com/genealogy/culture/entity");

            @Test
            void resetRequiresNonProductionEnvironmentAndExplicitConfirmation() throws IOException {
                String sql = read("00_reset_business_data.sql");

                assertThat(sql)
                        .contains("RESET_CURRENT_GENEALOGY_DATA")
                        .contains("genealogy.seed.environment")
                        .contains("\\set environment ''")
                        .contains("pg_advisory_xact_lock")
                        .contains("restart identity cascade")
                        .contains("flyway_schema_history")
                        .contains("app_password_reset_token")
                        .contains("delete from app_login_attempt")
                        .doesNotContain("\\set environment local")
                        .doesNotContain("truncate table app_user")
                        .doesNotContain("truncate table app_role")
                        .doesNotContain("truncate table app_permission")
                        .doesNotContain("delete from app_auth_security_event");
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
                        .contains("'biological_father'")
                        .contains("'legal_father'")
                        .contains("'branch_subtree'")
                        .contains("'blood'")
                        .contains("'ritual'")
                        .contains("'marriage'")
                        .contains("'status'")
                        .contains("'oral_history'")
                        .contains("'highly_sensitive'")
                        .contains("insert into clan_membership")
                        .contains("insert into member_role")
                        .contains("insert into culture_item")
                        .contains("insert into migration_event")
                        .contains("insert into culture_site")
                        .contains("insert into import_job")
                        .contains("insert into import_job_row")
                        .contains("insert into import_job_chunk")
                        .contains("insert into import_job_payload")
                        .contains("insert into import_file_fingerprint")
                        .contains("insert into review_quality_check")
                        .contains("insert into workbench_task_action")
                        .contains("insert into culture_revision_payload")
                        .contains("insert into operation_log")
                        .doesNotContain("insert into clan_member (")
                        .doesNotContain("'verified'")
                        .doesNotContain("'unverified'")
                        .doesNotContain("'oral_record'");
            }

            @Test
            void scenarioSeedMatchesCurrentRelationshipReviewAndGrantSemantics() throws IOException {
                String sql = read("10_seed_current_scenarios.sql");

                assertThat(sql)
                        .contains("(c_zhang,'SCN-Z-3201','SCN-Z-1112','heir_son'")
                        .contains("(c_zhang,'SCN-Z-3201','SCN-Z-3201','no_descendant'")
                        .contains("'in_adoption','legal_father','ritual'")
                        .contains("select membership_branch,id,'branch_subtree',b_long")
                        .contains("select membership_editor,id,'branch_subtree',b_east")
                        .contains("select membership_viewer,id,'branch_subtree',b_east")
                        .contains("'rejected','审核驳回，待补充原始录音。'")
                        .contains("jsonb_build_object('dataStatus','pending_review')")
                        .contains("jsonb_build_object('verificationStatus','draft'),jsonb_build_object('verificationStatus','pending_review')")
                        .doesNotContain("'parent_child','father','blood'")
                        .doesNotContain("'adoptive','adoptive_father','ritual'")
                        .doesNotContain("'in_adoption','in_adopted','ritual'")
                        .doesNotContain("select membership_branch,id,'branch',b_long")
                        .doesNotContain("select membership_viewer,id,'self'");
            }

            @Test
            void cultureFeaturedFlagsUseTheExistingSchemaColumns() throws IOException {
                String migration = Files.readString(
                        MIGRATIONS.resolve("V20260803171900__add_culture_featured_home_indexes.sql")
                );
                String scenario = read("10_seed_current_scenarios.sql");
                String performance = read("20_generate_performance_data.sql");
                String itemEntity = Files.readString(CULTURE_ENTITIES.resolve("CultureItemEntity.java"));
                String siteEntity = Files.readString(CULTURE_ENTITIES.resolve("CultureSiteEntity.java"));

                assertThat(migration)
                        .contains("is_featured_on_home = true")
                        .contains("idx_culture_item_featured_home")
                        .contains("idx_culture_site_featured_home")
                        .doesNotContain("add column")
                        .doesNotContain("drop column")
                        .doesNotContain("featured_on_home boolean");
                assertThat(scenario).contains("is_featured_on_home");
                assertThat(performance).contains("is_featured_on_home");
                assertThat(itemEntity).contains("@TableField(\"is_featured_on_home\")");
                assertThat(siteEntity).contains("@TableField(\"is_featured_on_home\")");
            }

            @Test
            void performanceGeneratorUsesSetBasedBoundedInputs() throws IOException {
                String sql = read("20_generate_performance_data.sql");

                assertThat(sql)
                        .contains("generate_series")
                        .contains("person_count must be between")
                        .contains("children_per_parent must be between")
                        .contains("nextval(pg_get_serial_sequence('person','id'))")
                        .contains("with recursive branch_tree")
                        .contains("with recursive person_tree")
                        .contains("make_interval(years =>")
                        .contains("relation_category")
                        .contains("biological_mother")
                        .contains("auto reverse spouse relationship")
                        .contains("parent.external_id=child.parent_external_id")
                        .doesNotContain("greatest(1,n-c.children_per_parent)")
                        .contains("pending_review")
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
                        .contains("Illegal self relationship detected")
                        .contains("Relationship label is not normalized to current application semantics")
                        .contains("Spouse reverse relationship is missing")
                        .contains("Lineage relationship generation order conflicts with application rules")
                        .contains("Review task and revision lifecycle states are inconsistent")
                        .contains("Person state does not match revision lifecycle")
                        .contains("Member role scope does not match current grant policy")
                        .contains("Branch manager grant does not cover the managed branch")
                        .contains("Relationship type/category mismatch detected")
                        .contains("Self-review detected")
                        .contains("Member role scope points outside membership clan")
                        .contains("Root branch path/level does not match application hierarchy semantics")
                        .contains("Person death date precedes birth date")
                        .contains("Parent-child generation numbers are inconsistent")
                        .contains("Async import recovery state is incomplete")
                        .contains("Missing quality-check statuses")
                        .contains("Workbench task action scenario is missing")
                        .contains("Seed integrity verification passed");
            }

            private String read(String fileName) throws IOException {
                return Files.readString(ROOT.resolve(fileName));
            }
        }
