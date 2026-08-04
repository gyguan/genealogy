from pathlib import Path

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
reset = reset.replace("\\set environment local", "\\set environment ''", 1)
if "\\set environment local" in reset or "\\set environment ''" not in reset:
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
    """-- The culture schema already stores featured flags in is_featured_on_home.\n"
    "-- Add partial indexes for official home-page selections without creating duplicate state.\n\n"
    "create index if not exists idx_culture_item_featured_home\n"
    "    on culture_item (clan_id, sort_order, id)\n"
    "    where deleted_at is null\n"
    "      and is_featured_on_home = true\n"
    "      and data_status = 'official';\n\n"
    "create index if not exists idx_culture_site_featured_home\n"
    "    on culture_site (clan_id, sort_order, id)\n"
    "    where deleted_at is null\n"
    "      and is_featured_on_home = true\n"
    "      and data_status = 'official';\n\n"
    "comment on column culture_item.is_featured_on_home is\n"
    "    'Whether an official culture item is selected for clan home-page display.';\n\n"
    "comment on column culture_site.is_featured_on_home is\n"
    "    'Whether an official culture site is selected for clan home-page display.';\n""",
)

old_rollback = ROLLBACK / "20260803_drop_culture_item_featured_on_home.sql"
new_rollback = ROLLBACK / "20260803_drop_culture_featured_home_indexes.sql"
old_rollback.unlink(missing_ok=True)
write(
    new_rollback,
    """-- Rollback for V20260803171900__add_culture_featured_home_indexes.sql.\n\n"
    "begin;\n\n"
    "drop index if exists idx_culture_item_featured_home;\n"
    "drop index if exists idx_culture_site_featured_home;\n\n"
    "commit;\n""",
)

write(
    TEST,
    """package com.genealogy.database;\n\n"
    "import org.junit.jupiter.api.Test;\n\n"
    "import java.io.IOException;\n"
    "import java.nio.file.Files;\n"
    "import java.nio.file.Path;\n\n"
    "import static org.assertj.core.api.Assertions.assertThat;\n\n"
    "class CurrentSeedDataContractTest {\n\n"
    "    private static final Path ROOT = Path.of(\"src/main/resources/db/seed/current\");\n"
    "    private static final Path MIGRATIONS = Path.of(\"src/main/resources/db/migration\");\n"
    "    private static final Path CULTURE_ENTITIES = Path.of(\"src/main/java/com/genealogy/culture/entity\");\n\n"
    "    @Test\n"
    "    void resetRequiresNonProductionEnvironmentAndExplicitConfirmation() throws IOException {\n"
    "        String sql = read(\"00_reset_business_data.sql\");\n\n"
    "        assertThat(sql)\n"
    "                .contains(\"RESET_CURRENT_GENEALOGY_DATA\")\n"
    "                .contains(\"genealogy.seed.environment\")\n"
    "                .contains(\"\\\\set environment ''\")\n"
    "                .contains(\"pg_advisory_xact_lock\")\n"
    "                .contains(\"restart identity cascade\")\n"
    "                .contains(\"flyway_schema_history\")\n"
    "                .doesNotContain(\"\\\\set environment local\")\n"
    "                .doesNotContain(\"truncate table app_user\")\n"
    "                .doesNotContain(\"truncate table app_role\")\n"
    "                .doesNotContain(\"truncate table app_permission\");\n"
    "    }\n\n"
    "    @Test\n"
    "    void scenarioSeedCoversEveryCurrentRelationshipCategoryAndDomain() throws IOException {\n"
    "        String sql = read(\"10_seed_current_scenarios.sql\");\n\n"
    "        assertThat(sql)\n"
    "                .contains(\"'parent_child'\")\n"
    "                .contains(\"'spouse'\")\n"
    "                .contains(\"'adoptive'\")\n"
    "                .contains(\"'successor'\")\n"
    "                .contains(\"'out_adoption'\")\n"
    "                .contains(\"'in_adoption'\")\n"
    "                .contains(\"'dual_successor'\")\n"
    "                .contains(\"'heir_son'\")\n"
    "                .contains(\"'no_descendant'\")\n"
    "                .contains(\"'blood'\")\n"
    "                .contains(\"'ritual'\")\n"
    "                .contains(\"'marriage'\")\n"
    "                .contains(\"'status'\")\n"
    "                .contains(\"'oral_history'\")\n"
    "                .contains(\"'highly_sensitive'\")\n"
    "                .contains(\"insert into clan_membership\")\n"
    "                .contains(\"insert into member_role\")\n"
    "                .contains(\"insert into culture_item\")\n"
    "                .contains(\"insert into migration_event\")\n"
    "                .contains(\"insert into culture_site\")\n"
    "                .contains(\"insert into import_job\")\n"
    "                .contains(\"insert into import_job_row\")\n"
    "                .contains(\"insert into import_job_chunk\")\n"
    "                .contains(\"insert into import_job_payload\")\n"
    "                .contains(\"insert into import_file_fingerprint\")\n"
    "                .contains(\"insert into review_quality_check\")\n"
    "                .contains(\"insert into workbench_task_action\")\n"
    "                .contains(\"insert into culture_revision_payload\")\n"
    "                .contains(\"insert into operation_log\")\n"
    "                .doesNotContain(\"insert into clan_member (\")\n"
    "                .doesNotContain(\"'verified'\")\n"
    "                .doesNotContain(\"'unverified'\")\n"
    "                .doesNotContain(\"'oral_record'\");\n"
    "    }\n\n"
    "    @Test\n"
    "    void cultureFeaturedFlagsUseTheExistingSchemaColumns() throws IOException {\n"
    "        String migration = Files.readString(\n"
    "                MIGRATIONS.resolve(\"V20260803171900__add_culture_featured_home_indexes.sql\")\n"
    "        );\n"
    "        String scenario = read(\"10_seed_current_scenarios.sql\");\n"
    "        String performance = read(\"20_generate_performance_data.sql\");\n"
    "        String itemEntity = Files.readString(CULTURE_ENTITIES.resolve(\"CultureItemEntity.java\"));\n"
    "        String siteEntity = Files.readString(CULTURE_ENTITIES.resolve(\"CultureSiteEntity.java\"));\n\n"
    "        assertThat(migration)\n"
    "                .contains(\"is_featured_on_home = true\")\n"
    "                .contains(\"idx_culture_item_featured_home\")\n"
    "                .contains(\"idx_culture_site_featured_home\")\n"
    "                .doesNotContain(\"add column\")\n"
    "                .doesNotContain(\"drop column\")\n"
    "                .doesNotContain(\"featured_on_home boolean\");\n"
    "        assertThat(scenario).contains(\"is_featured_on_home\");\n"
    "        assertThat(performance).contains(\"is_featured_on_home\");\n"
    "        assertThat(itemEntity).contains(\"@TableField(\\\"is_featured_on_home\\\")\");\n"
    "        assertThat(siteEntity).contains(\"@TableField(\\\"is_featured_on_home\\\")\");\n"
    "    }\n\n"
    "    @Test\n"
    "    void performanceGeneratorUsesSetBasedBoundedInputs() throws IOException {\n"
    "        String sql = read(\"20_generate_performance_data.sql\");\n\n"
    "        assertThat(sql)\n"
    "                .contains(\"generate_series\")\n"
    "                .contains(\"person_count must be between\")\n"
    "                .contains(\"children_per_parent must be between\")\n"
    "                .contains(\"nextval(pg_get_serial_sequence('person','id'))\")\n"
    "                .contains(\"with recursive branch_tree\")\n"
    "                .contains(\"with recursive person_tree\")\n"
    "                .contains(\"make_interval(years =>\")\n"
    "                .contains(\"relation_category\")\n"
    "                .contains(\"analyze relationship\")\n"
    "                .doesNotContain(\"\\nfor \")\n"
    "                .doesNotContain(\"\\nwhile \");\n"
    "    }\n\n"
    "    @Test\n"
    "    void verificationFailsOnCrossClanCyclesAndCategoryMismatch() throws IOException {\n"
    "        String sql = read(\"30_verify_seed_data.sql\");\n\n"
    "        assertThat(sql)\n"
    "                .contains(\"Cross-clan branch parent detected\")\n"
    "                .contains(\"Branch cycle detected\")\n"
    "                .contains(\"Self relationship detected\")\n"
    "                .contains(\"Relationship type/category mismatch detected\")\n"
    "                .contains(\"Self-review detected\")\n"
    "                .contains(\"Member role scope points outside membership clan\")\n"
    "                .contains(\"Root branch path/level does not match application hierarchy semantics\")\n"
    "                .contains(\"Person death date precedes birth date\")\n"
    "                .contains(\"Parent-child generation numbers are inconsistent\")\n"
    "                .contains(\"Async import recovery state is incomplete\")\n"
    "                .contains(\"Missing quality-check statuses\")\n"
    "                .contains(\"Workbench task action scenario is missing\")\n"
    "                .contains(\"Seed integrity verification passed\");\n"
    "    }\n\n"
    "    private String read(String fileName) throws IOException {\n"
    "        return Files.readString(ROOT.resolve(fileName));\n"
    "    }\n"
    "}\n""",
)

print("Applied PR #1160 review fixes")
