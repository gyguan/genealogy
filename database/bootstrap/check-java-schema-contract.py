#!/usr/bin/env python3
"""Static contract checks between Java/MyBatis runtime code and the fresh V1/V2 database baseline."""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend/genealogy-backend"
JAVA_ROOT = BACKEND / "src/main/java"
MAPPER_ROOT = BACKEND / "src/main/resources/mapper"
V1 = BACKEND / "src/main/resources/db/migration/V1__create_current_schema.sql"
V2 = BACKEND / "src/main/resources/db/migration/V2__seed_system_authorization.sql"


def snake(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", name).lower()


def parse_schema(sql: str) -> dict[str, dict[str, str]]:
    tables: dict[str, dict[str, str]] = {}
    for match in re.finditer(
        r"^CREATE TABLE public\.([A-Za-z0-9_]+) \(\n(.*?)^\);",
        sql,
        re.MULTILINE | re.DOTALL,
    ):
        columns: dict[str, str] = {}
        for line in match.group(2).splitlines():
            col = re.match(r"^\s{4}([A-Za-z_][A-Za-z0-9_]*)\s+(.+?)(?:,)?$", line)
            if col and col.group(1).lower() != "constraint":
                columns[col.group(1)] = col.group(2)
        tables[match.group(1)] = columns
    return tables


def annotation_value(annotation: str) -> str | None:
    match = re.search(r'(?:value\s*=\s*)?"([^"]+)"', annotation)
    return match.group(1) if match else None

def java_sql_type_compatible(java_type: str, sql_definition: str) -> bool:
    sql = sql_definition.lower()
    normalized = java_type.replace(" ", "")
    checks = {
        "Long": ("bigint",),
        "long": ("bigint",),
        "Integer": ("integer",),
        "int": ("integer",),
        "Boolean": ("boolean",),
        "boolean": ("boolean",),
        "BigDecimal": ("numeric", "decimal"),
        "LocalDate": ("date",),
        "LocalDateTime": ("timestamp",),
        "OffsetDateTime": ("timestamp with time zone",),
        "Instant": ("timestamp with time zone",),
        "UUID": ("uuid",),
        "byte[]": ("bytea",),
    }
    if normalized.startswith("Map<"):
        return "jsonb" in sql or "json" in sql
    if normalized == "String":
        return any(token in sql for token in ("character varying", "varchar", "text", "jsonb", "json"))
    expected = checks.get(normalized)
    if expected is None:
        return True
    return any(token in sql for token in expected)



def parse_entities(schema: dict[str, dict[str, str]], v1_sql: str) -> tuple[list[str], set[str], dict[str, set[str]]]:
    errors: list[str] = []
    mapped_tables: set[str] = set()
    mapped_columns: dict[str, set[str]] = {}

    for path in sorted(JAVA_ROOT.rglob("entity/*.java")):
        text = path.read_text(encoding="utf-8")
        table_match = re.search(
            r'@TableName\s*\(\s*(?:value\s*=\s*)?"([^"]+)"',
            text,
        )
        if not table_match:
            continue
        table = table_match.group(1)
        mapped_tables.add(table)
        mapped_columns.setdefault(table, set())
        if table not in schema:
            errors.append(f"{path.relative_to(ROOT)}: @TableName references missing table {table}")
            continue

        pending_annotations: list[str] = []
        for raw in text.splitlines():
            line = raw.strip()
            if line.startswith("@Table"):
                pending_annotations.append(line)
                continue
            field = re.match(
                r"private\s+(?!static)([A-Za-z0-9_<>?,.\[\] ]+)\s+([A-Za-z_][A-Za-z0-9_]*)"
                r"(?:\s*=\s*[^;]+)?\s*;",
                line,
            )
            if not field:
                if line and not line.startswith("@") and not line.startswith("/"):
                    pending_annotations = []
                continue

            java_type = field.group(1).strip()
            property_name = field.group(2)
            annotation_text = " ".join(pending_annotations)
            pending_annotations = []
            if re.search(r"@TableField\s*\([^)]*exist\s*=\s*false", annotation_text):
                continue

            explicit = None
            field_match = re.search(r"@TableField\s*\(([^)]*)\)", annotation_text)
            if field_match:
                explicit = annotation_value(field_match.group(1))
            id_match = re.search(r"@TableId(?:\s*\(([^)]*)\))?", annotation_text)
            if id_match and explicit is None:
                explicit = annotation_value(id_match.group(1) or "")
            column = explicit or snake(property_name)

            if column not in schema[table]:
                errors.append(
                    f"{path.relative_to(ROOT)}: field {property_name} maps to missing {table}.{column}"
                )
                continue

            mapped_columns[table].add(column)

            if not java_sql_type_compatible(java_type, schema[table][column]):
                errors.append(
                    f"{path.relative_to(ROOT)}: Java type {java_type} is incompatible with "
                    f"{table}.{column} ({schema[table][column]})"
                )

            if id_match:
                pk_pattern = re.compile(
                    rf"ALTER TABLE ONLY public\.{re.escape(table)}\s+"
                    rf"ADD CONSTRAINT .*? PRIMARY KEY \(([^)]+)\);",
                    re.DOTALL,
                )
                pk = pk_pattern.search(v1_sql)
                if not pk or column not in {part.strip() for part in pk.group(1).split(",")}:
                    errors.append(
                        f"{path.relative_to(ROOT)}: @TableId {table}.{column} is not the V1 primary key"
                    )
                if "IdType.AUTO" in annotation_text:
                    auto_pattern = re.compile(
                        rf"ALTER TABLE ONLY public\.{re.escape(table)} "
                        rf"ALTER COLUMN {re.escape(column)} SET DEFAULT nextval\("
                    )
                    if not auto_pattern.search(v1_sql):
                        errors.append(
                            f"{path.relative_to(ROOT)}: AUTO id {table}.{column} has no sequence default"
                        )

    missing_entity_tables = set(schema) - mapped_tables
    if missing_entity_tables:
        errors.append(
            "V1 tables without a Java @TableName entity: "
            + ", ".join(sorted(missing_entity_tables))
        )
    return errors, mapped_tables, mapped_columns


def parse_mapper_tables(schema: dict[str, dict[str, str]]) -> list[str]:
    errors: list[str] = []
    for path in sorted(MAPPER_ROOT.rglob("*.xml")):
        text = path.read_text(encoding="utf-8")
        ctes = set(
            m.group(1).lower()
            for m in re.finditer(
                r"(?:WITH(?:\s+RECURSIVE)?|,)\s*([A-Za-z_][A-Za-z0-9_]*)"
                r"(?:\s*\([^)]*\))?\s+AS\s*\(",
                text,
                re.IGNORECASE,
            )
        )
        scan_text = re.sub(
            r"\bFOR\s+UPDATE(?:\s+SKIP\s+LOCKED)?\b",
            "",
            text,
            flags=re.IGNORECASE,
        )
        refs = [
            m.group(1).lower()
            for m in re.finditer(
                r"\b(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+"
                r"(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)",
                scan_text,
                re.IGNORECASE,
            )
        ]
        missing = sorted(
            set(refs)
            - set(schema)
            - ctes
            - {"id", "values"}
        )
        if missing:
            errors.append(
                f"{path.relative_to(ROOT)}: SQL references unknown tables/CTEs: "
                + ", ".join(missing)
            )

        actual_tables = sorted(set(refs) & set(schema))
        result_columns = set(
            m.group(1)
            for m in re.finditer(r'<(?:id|result)\s+column="([A-Za-z_][A-Za-z0-9_]*)"', text)
        )
        aliases = set(
            m.group(1)
            for m in re.finditer(r"\bAS\s+([A-Za-z_][A-Za-z0-9_]*)", text, re.IGNORECASE)
        )
        aliases.update(
            m.group(1)
            for m in re.finditer(
                r"\b(?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*"
                r"(?:::[A-Za-z_][A-Za-z0-9_]*)?\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:,|$)",
                text,
                re.MULTILINE,
            )
        )
        available = aliases.copy()
        for table in actual_tables:
            available.update(schema[table])
        missing_result = sorted(result_columns - available)
        if missing_result:
            errors.append(
                f"{path.relative_to(ROOT)}: resultMap columns not provided by referenced tables/aliases: "
                + ", ".join(missing_result)
            )
    return errors


def parse_seed_codes(v2_sql: str) -> tuple[set[str], set[str], set[str]]:
    permission_by_id = {
        m.group(1): m.group(2)
        for m in re.finditer(
            r"INSERT INTO public\.app_permission .*?VALUES \((\d+), '([^']+)'",
            v2_sql,
        )
    }
    role_by_id = {
        m.group(1): m.group(2)
        for m in re.finditer(
            r"INSERT INTO public\.app_role .*?VALUES \((\d+), '([^']+)'",
            v2_sql,
        )
    }
    granted_permissions: set[str] = set()
    for match in re.finditer(
        r"INSERT INTO public\.app_role_permission .*?VALUES "
        r"\(\d+, (\d+), (\d+), '[^']*', 'allow', 'active'",
        v2_sql,
    ):
        permission = permission_by_id.get(match.group(2))
        if permission:
            granted_permissions.add(permission)
    return set(permission_by_id.values()), set(role_by_id.values()), granted_permissions

def extract_check_values(v1_sql: str, constraint: str) -> set[str]:
    marker = f"CONSTRAINT {constraint} CHECK"
    start = v1_sql.find(marker)
    if start < 0:
        return set()
    end = v1_sql.find("\n", start)
    clause = v1_sql[start:] if end < 0 else v1_sql[start:end]
    return set(re.findall(r"'([^']+)'::character varying", clause))


def enum_names(path: pathlib.Path, lower: bool = False) -> set[str]:
    text = path.read_text(encoding="utf-8")
    body = text.split("{", 1)[1].split(";", 1)[0]
    names = set(
        re.findall(r"^\s*([A-Z][A-Z0-9_]*)\s*(?:\(|,|$)", body, re.MULTILINE)
    )
    return {name.lower() for name in names} if lower else names


def enum_string_values(path: pathlib.Path) -> set[str]:
    text = path.read_text(encoding="utf-8")
    body = text.split("{", 1)[1].split(";", 1)[0]
    return set(
        re.findall(r'^\s*[A-Z][A-Z0-9_]*\(\s*"([^"]+)"', body, re.MULTILINE)
    )

def check_java_value_domains(v1_sql: str) -> list[str]:
    errors: list[str] = []
    contracts: list[tuple[str, set[str]]] = [
        (
            "chk_import_job_execution_status",
            enum_names(JAVA_ROOT / "com/genealogy/imports/domain/ImportExecutionState.java", lower=True),
        ),
        (
            "ck_review_quality_scope_type",
            enum_names(JAVA_ROOT / "com/genealogy/quality/check/QualityCheckScopeType.java") | {"TASK_IDS"},
        ),
        (
            "ck_review_quality_status",
            enum_names(JAVA_ROOT / "com/genealogy/review/domain/ReviewQualityCheckStatus.java"),
        ),
        (
            "ck_review_quality_mode",
            enum_names(JAVA_ROOT / "com/genealogy/review/domain/ReviewQualityCheckMode.java"),
        ),
        (
            "ck_culture_item__category",
            enum_string_values(JAVA_ROOT / "com/genealogy/culture/domain/CultureCategory.java"),
        ),
        (
            "ck_culture_item__confidence",
            enum_string_values(JAVA_ROOT / "com/genealogy/culture/domain/CultureConfidenceLevel.java"),
        ),
        (
            "ck_culture_item__privacy",
            enum_string_values(JAVA_ROOT / "com/genealogy/culture/domain/CulturePrivacyLevel.java"),
        ),
        (
            "ck_culture_item__sensitive",
            enum_string_values(JAVA_ROOT / "com/genealogy/culture/domain/CultureSensitiveLevel.java"),
        ),
        (
            "ck_culture_site__type",
            enum_string_values(JAVA_ROOT / "com/genealogy/culture/domain/CultureSiteType.java"),
        ),
        (
            "chk_source_binding_target_type",
            enum_string_values(JAVA_ROOT / "com/genealogy/source/domain/SourceBindingTargetType.java"),
        ),
        (
            "ck_relationship_relation_category",
            enum_string_values(JAVA_ROOT / "com/genealogy/tree/query/RelationCategory.java"),
        ),
    ]
    for constraint, expected in contracts:
        actual = extract_check_values(v1_sql, constraint)
        if not actual:
            errors.append(f"V1 constraint not found or unreadable: {constraint}")
            continue
        missing = sorted(expected - actual)
        if missing:
            errors.append(
                f"{constraint} rejects Java-supported values: " + ", ".join(missing)
            )
    return errors


def check_java_permission_contract(v2_sql: str) -> list[str]:
    errors: list[str] = []
    permissions, roles, granted_permissions = parse_seed_codes(v2_sql)
    resources = {code.split(".", 1)[0] for code in permissions if "." in code}
    actions = {code.split(".", 1)[1] for code in permissions if "." in code}

    all_java = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in sorted(JAVA_ROOT.rglob("*.java"))
    )
    candidates: set[str] = set()
    for resource, action in re.findall(
        r'"([a-z][a-z0-9_]*)[\.:]([a-z][a-z0-9_]*)"',
        all_java,
    ):
        normalized = f"{resource}.{action}"
        if resource in resources and action in actions:
            candidates.add(normalized)

    missing_permissions = sorted(candidates - permissions)
    if missing_permissions:
        errors.append(
            "Java permission literals missing from V2 app_permission: "
            + ", ".join(missing_permissions)
        )

    ungranted_permissions = sorted(candidates & permissions - granted_permissions)
    if ungranted_permissions:
        print(
            "Java-used permissions currently have no direct active V2 grant "
            "(allowed when code has an explicit fallback/bypass): "
            + ", ".join(ungranted_permissions)
        )

    role_constants = set(
        re.findall(r'ROLE_[A-Z0-9_]+\s*=\s*"([a-z][a-z0-9_]*)"', all_java)
    )
    missing_roles = sorted(role_constants - roles)
    if missing_roles:
        errors.append(
            "Java role constants missing from V2 app_role: " + ", ".join(missing_roles)
        )

    # Unified access service builds these permission codes dynamically.
    action_map = {
        "VIEW": "view",
        "LIST": "view",
        "DOWNLOAD": "download",
        "CREATE": "create",
        "UPDATE": "update",
        "DELETE": "delete",
        "MANAGE": "manage",
    }
    method_resource = {
        "Person": "person",
        "Tree": "tree",
        "Source": "source",
        "Member": "member",
    }
    for method, action in re.findall(
        r"decide(Person|Tree|Source|Member)\s*\([^;]{0,600}?AccessAction\.([A-Z_]+)",
        all_java,
        flags=re.DOTALL,
    ):
        if action in action_map:
            code = f"{method_resource[method]}.{action_map[action]}"
            candidates.add(code)
            if code not in permissions:
                errors.append(
                    f"UnifiedAccessDecisionService caller requires missing V2 permission {code}"
                )
            elif code not in granted_permissions:
                print(
                    f"Unified access caller uses V2 permission without a direct role grant: {code}"
                )

    return errors


def main() -> int:
    v1_sql = V1.read_text(encoding="utf-8")
    v2_sql = V2.read_text(encoding="utf-8")
    schema = parse_schema(v1_sql)

    errors: list[str] = []
    entity_errors, mapped_tables, mapped_columns = parse_entities(schema, v1_sql)
    errors.extend(entity_errors)
    errors.extend(parse_mapper_tables(schema))
    errors.extend(check_java_value_domains(v1_sql))
    errors.extend(check_java_permission_contract(v2_sql))

    mapper_text = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in sorted(MAPPER_ROOT.rglob("*.xml"))
    )
    schema_only_columns: dict[str, list[str]] = {}
    for table, columns in schema.items():
        unused = [
            column for column in columns
            if column not in mapped_columns.get(table, set())
            and not re.search(rf"\b{re.escape(column)}\b", mapper_text)
        ]
        if unused:
            schema_only_columns[table] = unused
    if schema_only_columns:
        print("Schema columns with no Java entity or Mapper XML reference:")
        for table, columns in sorted(schema_only_columns.items()):
            print(f"  - {table}: {', '.join(columns)}")

    permissions, roles, _ = parse_seed_codes(v2_sql)
    print(
        f"Java/schema contract summary: tables={len(schema)}, "
        f"mapped_tables={len(mapped_tables)}, permissions={len(permissions)}, roles={len(roles)}"
    )

    if errors:
        print("Java/schema contract check failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("Java/schema contract check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
