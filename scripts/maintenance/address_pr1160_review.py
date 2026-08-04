from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend/genealogy-backend"
SEED = BACKEND / "src/main/resources/db/seed/current"
MIGRATIONS = BACKEND / "src/main/resources/db/migration"
JAVA = BACKEND / "src/main/java/com/genealogy/culture/entity"
TEST = BACKEND / "src/test/java/com/genealogy/database/CurrentSeedDataContractTest.java"
WORKFLOW = ROOT / ".github/workflows/current-seed-data-ci.yml"
ROLLBACK = ROOT / "database/rollback"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def map_existing_featured_column(path: Path) -> None:
    text = read(path)
    if "import com.baomidou.mybatisplus.annotation.TableField;" not in text:
        text = text.replace(
            "import com.baomidou.mybatisplus.annotation.TableId;\n",
            "import com.baomidou.mybatisplus.annotation.TableId;\n"
            "import com.baomidou.mybatisplus.annotation.TableField;\n",
            1,
        )
    if '@TableField("is_featured_on_home")' not in text:
        text = text.replace(
            "    private boolean featuredOnHome;",
            '    @TableField("is_featured_on_home")\n'
            "    private boolean featuredOnHome;",
            1,
        )
    if text.count('@TableField("is_featured_on_home")') != 1:
        raise RuntimeError(f"Unexpected featured column mapping count in {path}")
    write(path, text)


for entity in (JAVA / "CultureItemEntity.java", JAVA / "CultureSiteEntity.java"):
    map_existing_featured_column(entity)

for sql_name in ("10_seed_current_scenarios.sql", "20_generate_performance_data.sql"):
    path = SEED / sql_name
    text = read(path)
    if "featured_on_home" not in text:
        raise RuntimeError(f"Expected featured_on_home reference in {path}")
    text = text.replace("featured_on_home", "is_featured_on_home")
    if "is_is_featured_on_home" in text:
        raise RuntimeError(f"Double replacement detected in {path}")
    write(path, text)

reset_path = SEED / "00_reset_business_data.sql"
reset = read(reset_path)
reset = reset.replace(r"\set environment local", r"\set environment ''", 1)
if r"\set environment local" in reset or r"\set environment ''" not in reset:
    raise RuntimeError("Reset environment must fail closed when omitted")
write(reset_path, reset)

readme_path = SEED / "README.md"
readme = read(readme_path)
marker = "脚本要求非生产环境标识和显式确认口令，任一条件不满足都会在清理前失败。"
addition = marker + "环境参数没有默认值，必须显式传入；省略时按未知环境拒绝执行。"
if addition not in readme:
    if marker not in readme:
        raise RuntimeError("README reset safety marker not found")
    readme = readme.replace(marker, addition, 1)
write(readme_path, readme)

workflow = read(WORKFLOW)
migration_filter = '      - "backend/genealogy-backend/src/main/resources/db/migration/**"\n'
seed_filter = '      - "backend/genealogy-backend/src/main/resources/db/seed/current/**"\n'
if workflow.count(migration_filter) == 0:
    if workflow.count(seed_filter) != 2:
        raise RuntimeError("Expected pull_request and push seed path filters")
    workflow = workflow.replace(seed_filter, seed_filter + migration_filter)
if workflow.count(migration_filter) != 2:
    raise RuntimeError("Migration path filter must exist for pull_request and push")
write(WORKFLOW, workflow)

old_migration = MIGRATIONS / "V20260803171900__add_culture_item_featured_on_home.sql"
new_migration = MIGRATIONS / "V20260803171900__add_culture_featured_home_indexes.sql"
old_migration.unlink(missing_ok=True)
write(
    new_migration,
    dedent(
        """\
        -- The culture schema already stores featured flags in is_featured_on_home.
        -- Add partial indexes for official home-page selections without creating duplicate state.

        create index if not exists idx_culture_item_featured_home
            on culture_item (clan_id, sort_order, id)
            where deleted_at is null
              and is_featured_on_home = true
              and data_status = 'official';

        create index if not exists idx_culture_site_featured_home
            on culture_site (clan_id, sort_order, id)
            where deleted_at is null
              and is_featured_on_home = true
              and data_status = 'official';

        comment on column culture_item.is_featured_on_home is
            'Whether an official culture item is selected for clan home-page display.';

        comment on column culture_site.is_featured_on_home is
            'Whether an official culture site is selected for clan home-page display.';
        """
    ),
)

old_rollback = ROLLBACK / "20260803_drop_culture_item_featured_on_home.sql"
new_rollback = ROLLBACK / "20260803_drop_culture_featured_home_indexes.sql"
old_rollback.unlink(missing_ok=True)
write(
    new_rollback,
    dedent(
        """\
        -- Rollback for V20260803171900__add_culture_featured_home_indexes.sql.

        begin;

        drop index if exists idx_culture_item_featured_home;
        drop index if exists idx_culture_site_featured_home;

        commit;
        """
    ),
)

write(
    TEST,
    dedent(
        r"""\
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
                        .doesNotContain("\\set environment local")
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
        """
    ),
)

print("Applied PR #1160 review fixes")
