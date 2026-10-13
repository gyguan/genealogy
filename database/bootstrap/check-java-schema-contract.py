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


def parse_entities(schema: dict[str, dict[str, str]], v1_sql: str) -> tuple[list[str], set[str]]:
    errors: list[str] = []
    mapped_tables: set[str] = set()

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
    return errors, mapped_tables


def parse_mapper_tables(schema: dict[str, dict[str, str]]) -> list[str]:
    errors: list[str] = []
    for path in sorted(MAPPER_ROOT.rglob("*.xml")):
        text = path.read_text(encoding="utf-8")
        ctes = set(
            m.group(1).lower()
            for m in re.finditer(
                r"(?:WITH(?:\s+RECURSIVE)?|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s+AS\s*\(",
                text,
                re.IGNORECASE,
            )
        )
        scan_text = re.sub(
            r"\\bFOR\\s+UPDATE(?:\\s+SKIP\\s+LOCKED)?\\b",
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


def parse_seed_codes(v2_sql: str) -> tuple[set[str], set[str]]:
    permissions = set(
        m.group(1)
        for m in re.finditer(
            r"INSERT INTO public\.app_permission .*?VALUES \(\d+, '([^']+)'",
            v2_sql,
        )
    )
    roles = set(
        m.group(1)
        for m in re.finditer(
            r"INSERT INTO public\.app_role .*?VALUES \(\d+, '([^']+)'",
            v2_sql,
        )
    )
    return permissions, roles


def check_java_permission_contract(v2_sql: str) -> list[str]:
    errors: list[str] = []
    permissions, roles = parse_seed_codes(v2_sql)
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
            if code not in permissions:
                errors.append(
                    f"UnifiedAccessDecisionService caller requires missing V2 permission {code}"
                )

    return errors


def main() -> int:
    v1_sql = V1.read_text(encoding="utf-8")
    v2_sql = V2.read_text(encoding="utf-8")
    schema = parse_schema(v1_sql)

    errors: list[str] = []
    entity_errors, mapped_tables = parse_entities(schema, v1_sql)
    errors.extend(entity_errors)
    errors.extend(parse_mapper_tables(schema))
    errors.extend(check_java_permission_contract(v2_sql))

    permissions, roles = parse_seed_codes(v2_sql)
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
