from __future__ import annotations

import re
from pathlib import Path

ROOT = Path("backend/genealogy-backend/src/main/resources/db/seed/current")
NAVICAT = ROOT / "navicat"
NAVICAT.mkdir(parents=True, exist_ok=True)


def replace_psql_echo_and_remove_meta(text: str) -> str:
    output: list[str] = []
    for line in text.splitlines():
        if line.startswith("\\echo "):
            message = line[len("\\echo ") :].strip()
            output.append(f"select {message} as result;")
        elif line.startswith("\\"):
            continue
        else:
            output.append(line)
    return "\n".join(output).rstrip() + "\n"


# 00: keep the guarded reset logic, but replace psql variables with an editable
# one-row parameter table that Navicat can execute as ordinary PostgreSQL SQL.
reset_source = (ROOT / "00_reset_business_data.sql").read_text(encoding="utf-8")
reset_body = reset_source[reset_source.index("begin;") :]
old_config = """select set_config('genealogy.seed.environment', :'environment', true);
select set_config('genealogy.seed.confirm_reset', :'confirm_reset', true);"""
new_config = """-- NAVICAT PARAMETERS: edit only the VALUES row before running the full file.
-- Keep confirm_reset as CHANGE_ME until you are certain this is a disposable non-production database.
create temporary table navicat_reset_parameters (
    environment text not null,
    confirm_reset text not null
) on commit drop;

insert into navicat_reset_parameters(environment, confirm_reset)
values ('local', 'CHANGE_ME');

select set_config(
    'genealogy.seed.environment',
    (select environment from navicat_reset_parameters),
    true
);
select set_config(
    'genealogy.seed.confirm_reset',
    (select confirm_reset from navicat_reset_parameters),
    true
);"""
if old_config not in reset_body:
    raise RuntimeError("reset parameter block changed; update Navicat generator")
reset_body = reset_body.replace(old_config, new_config, 1)
reset_body = reset_body.replace(
    "Refusing reset: pass -v confirm_reset=RESET_CURRENT_GENEALOGY_DATA",
    "Refusing reset: edit navicat_reset_parameters.confirm_reset to RESET_CURRENT_GENEALOGY_DATA",
)
reset_body = replace_psql_echo_and_remove_meta(reset_body)
reset_header = """-- Navicat-compatible guarded reset for the current genealogy model.
-- PostgreSQL only. Open this complete file in Navicat and execute the entire script.
-- Before execution, change CHANGE_ME below to RESET_CURRENT_GENEALOGY_DATA.
-- Never run this file against a production database.

"""
(NAVICAT / "00_reset_business_data.sql").write_text(reset_header + reset_body, encoding="utf-8")


# 10 and 30 only use psql meta commands for fail-fast/console output; ordinary
# PostgreSQL statements are otherwise already Navicat-compatible.
for file_name in ("10_seed_current_scenarios.sql", "30_verify_seed_data.sql"):
    source = (ROOT / file_name).read_text(encoding="utf-8")
    converted = replace_psql_echo_and_remove_meta(source)
    header = """-- Navicat-compatible PostgreSQL SQL.
-- Execute this complete file, not an arbitrary selected fragment.

"""
    (NAVICAT / file_name).write_text(header + converted, encoding="utf-8")


# 20: replace psql -v placeholders with a visible, editable literal parameter
# block. Defaults intentionally match the bounded CI dataset rather than the
# larger psql SMALL profile.
performance_source = (ROOT / "20_generate_performance_data.sql").read_text(encoding="utf-8")
performance = replace_psql_echo_and_remove_meta(performance_source)
pattern = re.compile(
    r"create temporary table perf_config as\n"
    r"select upper\(:'dataset_code'\)::text dataset_code,.*?"
    r"\(select id from app_user where username='demo_reviewer'\)::bigint reviewer_user_id;",
    re.DOTALL,
)
replacement = """-- NAVICAT PARAMETERS: edit the literal values in this SELECT before execution.
-- Defaults create a bounded dataset suitable for local validation.
create temporary table perf_config as
select upper('NAVICAT_SMALL')::text dataset_code,
       1000::integer person_count,
       50::integer branch_count,
       3::integer children_per_parent,
       2::integer events_per_person,
       20::integer source_count,
       50::integer culture_item_count,
       20::integer migration_event_count,
       100::integer review_count,
       1000::integer operation_log_count,
       null::bigint clan_id,
       (select id from app_user where username='demo_admin')::bigint admin_user_id,
       (select id from app_user where username='demo_editor')::bigint editor_user_id,
       (select id from app_user where username='demo_reviewer')::bigint reviewer_user_id;"""
performance, replacements = pattern.subn(replacement, performance, count=1)
if replacements != 1:
    raise RuntimeError("performance parameter block changed; update Navicat generator")
if ":'" in performance or re.search(r"(?m)^\\", performance):
    raise RuntimeError("psql-only syntax remains in performance Navicat variant")
performance_header = """-- Navicat-compatible performance-data generator for PostgreSQL.
-- Run the scenario seed first so the deterministic demo users exist.
-- Edit the NAVICAT PARAMETERS block below, then execute this complete file.

"""
(NAVICAT / "20_generate_performance_data.sql").write_text(
    performance_header + performance,
    encoding="utf-8",
)


navicat_readme = """# Navicat 兼容执行脚本

本目录提供纯 PostgreSQL SQL 版本，不包含 `\\set`、`\\if`、`\\echo` 或 `psql -v` 变量，可在 Navicat 的 PostgreSQL 连接中直接执行。

## 执行方式

1. 确认应用已经启动过一次，全部 Flyway 迁移已经完成。
2. 在 Navicat 中打开对应 PostgreSQL 数据库连接。
3. 使用“新建查询”打开完整 SQL 文件，执行整个文件；不要只执行随机选中的片段。
4. 按以下顺序执行：

```text
00_reset_business_data.sql
10_seed_current_scenarios.sql
30_verify_seed_data.sql
```

需要压测数据时，再执行：

```text
20_generate_performance_data.sql
30_verify_seed_data.sql
```

## 清理脚本确认

`00_reset_business_data.sql` 默认配置为：

```sql
values ('local', 'CHANGE_ME');
```

确认目标数据库是可清理的本地、开发、测试、CI 或性能环境后，将其修改为：

```sql
values ('local', 'RESET_CURRENT_GENEALOGY_DATA');
```

允许的环境值为：`local`、`dev`、`development`、`test`、`ci`、`perf`、`performance`。确认值未修改时脚本会主动报错并拒绝清理。

## 压测参数

`20_generate_performance_data.sql` 顶部包含 `NAVICAT PARAMETERS` 参数区。默认生成：

- 1,000 人；
- 50 个支派；
- 每人 2 条事件；
- 20 个来源；
- 50 条文化资料；
- 20 条迁徙；
- 100 个审核任务；
- 1,000 条操作日志。

修改参数时仍会执行原有边界校验。相同 `dataset_code` 已存在时，生成器会拒绝重复创建；可先执行清理脚本，或修改数据集编码。

## 事务与错误处理

脚本都包含显式事务。任何 SQL 出错时该事务不会正常提交。Navicat 显示错误后应先确认没有提交部分数据；如果当前会话仍处于失败事务状态，先执行：

```sql
rollback;
```

再修正问题并重新执行完整脚本。
"""
(NAVICAT / "README.md").write_text(navicat_readme, encoding="utf-8")


# Link the alternative execution mode from the primary documentation.
primary_readme_path = ROOT / "README.md"
primary_readme = primary_readme_path.read_text(encoding="utf-8")
navicat_section = """

## Navicat 执行

Navicat 等普通 SQL 客户端不能识别 `\\set`、`\\if`、`\\echo` 等 `psql` 元命令。请使用 [`navicat/`](navicat/) 目录下的纯 PostgreSQL SQL 版本，并按照其中的 README 配置确认值和参数后执行。
"""
if "## Navicat 执行" not in primary_readme:
    primary_readme_path.write_text(
        primary_readme.rstrip() + navicat_section.rstrip() + "\n",
        encoding="utf-8",
    )


# Add contract assertions without changing the existing psql contract tests.
test_path = Path("backend/genealogy-backend/src/test/java/com/genealogy/database/CurrentSeedDataContractTest.java")
test_source = test_path.read_text(encoding="utf-8")
marker = """            private String read(String fileName) throws IOException {
                return Files.readString(ROOT.resolve(fileName));
            }
"""
navicat_test = """            @Test
            void navicatVariantsContainNoPsqlMetaCommandsOrVariables() throws IOException {
                Path navicatRoot = ROOT.resolve("navicat");
                String reset = Files.readString(navicatRoot.resolve("00_reset_business_data.sql"));
                String scenario = Files.readString(navicatRoot.resolve("10_seed_current_scenarios.sql"));
                String performance = Files.readString(navicatRoot.resolve("20_generate_performance_data.sql"));
                String verification = Files.readString(navicatRoot.resolve("30_verify_seed_data.sql"));

                for (String sql : new String[]{reset, scenario, performance, verification}) {
                    assertThat(sql.lines().filter(line -> line.startsWith("\\\\")).toList()).isEmpty();
                    assertThat(sql).doesNotContain(":'").doesNotContain(":{?");
                }

                assertThat(reset)
                        .contains("values ('local', 'CHANGE_ME')")
                        .contains("RESET_CURRENT_GENEALOGY_DATA")
                        .contains("navicat_reset_parameters");
                assertThat(performance)
                        .contains("'NAVICAT_SMALL'")
                        .contains("1000::integer person_count")
                        .contains("50::integer branch_count");
                assertThat(Files.readString(navicatRoot.resolve("README.md")))
                        .contains("Navicat")
                        .contains("rollback;");
            }

"""
if "navicatVariantsContainNoPsqlMetaCommandsOrVariables" not in test_source:
    if marker not in test_source:
        raise RuntimeError("contract test insertion marker changed")
    test_source = test_source.replace(marker, navicat_test + marker, 1)
    test_path.write_text(test_source, encoding="utf-8")
