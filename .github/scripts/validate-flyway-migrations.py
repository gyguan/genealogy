#!/usr/bin/env python3
"""Validate the post-consolidation Flyway layout.

One transition is intentionally supported:
- a legacy base branch with many active migrations;
- a head branch with only the new V1/V2 baseline;
- every legacy active SQL file preserved under database/archive/legacy-flyway.

After that reset is merged, V1/V2 and the legacy archive are immutable and all
new versioned migrations must use Beijing timestamp versions.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import subprocess
import sys
from dataclasses import dataclass

ACTIVE_DIR = pathlib.PurePosixPath(
    "backend/genealogy-backend/src/main/resources/db/migration"
)
ARCHIVE_DIR = pathlib.PurePosixPath("database/archive/legacy-flyway")
BASELINE_NAMES = {
    "V1__create_current_schema.sql",
    "V2__seed_system_authorization.sql",
}
NEW_VERSIONED_RE = re.compile(
    r"^V(?P<timestamp>\d{14})(?:_(?P<sequence>\d{2}))?"
    r"__(?P<description>[a-z][a-z0-9]*(?:_[a-z0-9]+)*)\.sql$"
)
ANY_VERSIONED_RE = re.compile(r"^V(?P<version>[0-9][0-9._]*)__.+\.sql$")
REPEATABLE_RE = re.compile(r"^R__[a-z][a-z0-9]*(?:_[a-z0-9]+)*\.sql$")
ALLOWED_ACTIONS = {
    "create", "add", "alter", "rename", "backfill", "migrate",
    "normalize", "fix", "rebuild", "drop", "refresh",
}


@dataclass(frozen=True)
class Change:
    status: str
    old_path: str | None
    new_path: str | None


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        raise RuntimeError(
            f"git {' '.join(args)} failed ({result.returncode}): "
            f"{result.stderr.strip()}"
        )
    return result.stdout


def sql_paths_at(ref: str, directory: pathlib.PurePosixPath) -> list[str]:
    output = git("ls-tree", "-r", "--name-only", ref, "--", str(directory))
    return [line.strip() for line in output.splitlines() if line.strip().endswith(".sql")]


def changes_under(base_ref: str, directory: pathlib.PurePosixPath) -> list[Change]:
    output = git(
        "diff", "--name-status", "--find-renames",
        f"{base_ref}...HEAD", "--", str(directory)
    )
    changes: list[Change] = []
    for line in output.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0]
        code = status[0]
        if code in {"R", "C"}:
            changes.append(Change(status, parts[1], parts[2]))
        elif code == "D":
            changes.append(Change(status, parts[1], None))
        else:
            changes.append(Change(status, None, parts[1]))
    return changes


def filename(path: str) -> str:
    return pathlib.PurePosixPath(path).name


def version_tuple(name: str) -> tuple[int, ...] | None:
    match = ANY_VERSIONED_RE.fullmatch(name)
    if not match:
        return None
    return tuple(int(part) for part in re.split(r"[._]", match.group("version")))


def validate_new_name(name: str, errors: list[str]) -> tuple[int, ...] | None:
    match = NEW_VERSIONED_RE.fullmatch(name)
    if not match:
        errors.append(
            f"{name}: new versioned migration must match "
            "VyyyyMMddHHmmss[_NN]__action_object_detail.sql"
        )
        return None
    if match.group("sequence") == "00":
        errors.append(f"{name}: optional sequence must be 01-99")
    action = match.group("description").split("_", 1)[0]
    if action not in ALLOWED_ACTIONS:
        errors.append(
            f"{name}: description must start with one of "
            + ", ".join(sorted(ALLOWED_ACTIONS))
        )
    return version_tuple(name)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-ref", default="origin/main")
    args = parser.parse_args()

    try:
        base_active = sql_paths_at(args.base_ref, ACTIVE_DIR)
        head_active = sql_paths_at("HEAD", ACTIVE_DIR)
        head_archive = sql_paths_at("HEAD", ARCHIVE_DIR)
        active_changes = changes_under(args.base_ref, ACTIVE_DIR)
        archive_changes = changes_under(args.base_ref, ARCHIVE_DIR)
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    errors: list[str] = []
    base_names = {filename(path) for path in base_active}
    head_names = {filename(path) for path in head_active}
    archive_names = {filename(path) for path in head_archive}

    baseline_reset = len(base_active) > 2 and head_names == BASELINE_NAMES
    if baseline_reset:
        missing_archive = base_names - archive_names
        if missing_archive:
            errors.append(
                "baseline reset must archive every former active migration; missing: "
                + ", ".join(sorted(missing_archive))
            )
        if errors:
            print("Flyway baseline reset validation failed:", file=sys.stderr)
            for error in errors:
                print(f"  - {error}", file=sys.stderr)
            return 1
        print(
            f"Flyway baseline reset passed: {len(base_active)} legacy SQL files "
            f"archived; active runtime reduced to V1/V2."
        )
        return 0

    missing_baseline = BASELINE_NAMES - head_names
    if missing_baseline:
        errors.append("missing active baseline: " + ", ".join(sorted(missing_baseline)))

    if archive_changes:
        errors.append(
            "database/archive/legacy-flyway is immutable after baseline consolidation"
        )

    base_versions = [
        version_tuple(filename(path))
        for path in base_active
        if version_tuple(filename(path)) is not None
    ]
    base_max = max(base_versions, default=None)

    for change in active_changes:
        code = change.status[0]
        if change.old_path and filename(change.old_path) in BASELINE_NAMES:
            if code in {"M", "D", "R"}:
                errors.append(
                    f"{filename(change.old_path)}: baseline V1/V2 is immutable after consolidation"
                )
                continue
        if change.old_path and ANY_VERSIONED_RE.fullmatch(filename(change.old_path)):
            if code in {"M", "D", "R"}:
                errors.append(
                    f"{filename(change.old_path)}: existing versioned migration is immutable"
                )

        if not change.new_path or code not in {"A", "C", "R"}:
            continue
        name = filename(change.new_path)
        if name in BASELINE_NAMES:
            errors.append(f"{name}: baseline file may not be re-added or replaced")
        elif name.startswith("V"):
            version = validate_new_name(name, errors)
            if version is not None and base_max is not None and version <= base_max:
                errors.append(
                    f"{name}: version must be greater than current maximum "
                    + ".".join(str(v) for v in base_max)
                )
        elif name.startswith("R__"):
            if not REPEATABLE_RE.fullmatch(name):
                errors.append(f"{name}: invalid repeatable migration name")
        else:
            errors.append(f"{name}: unsupported SQL file in active Flyway directory")

    if errors:
        print("Flyway migration governance failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("Flyway migration governance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
