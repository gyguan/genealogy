#!/usr/bin/env python3
"""Validate Flyway migration naming and immutable-history rules.

The validator is incremental:
- Existing duplicate versions in the base branch are reported as legacy debt.
- A PR fails only when it introduces/worsens duplicates or violates new rules.
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import pathlib
import re
import subprocess
import sys
from dataclasses import dataclass
from typing import Iterable

MIGRATION_DIR = pathlib.PurePosixPath(
    "backend/genealogy-backend/src/main/resources/db/migration"
)

NEW_VERSIONED_RE = re.compile(
    r"^V(?P<timestamp>\d{14})(?:_(?P<sequence>\d{2}))?"
    r"__(?P<description>[a-z][a-z0-9]*(?:_[a-z0-9]+)*)\.sql$"
)
ANY_VERSIONED_RE = re.compile(
    r"^V(?P<version>[0-9][0-9._]*)__"
    r"(?P<description>.+)\.sql$"
)
REPEATABLE_RE = re.compile(
    r"^R__(?P<description>[a-z][a-z0-9]*(?:_[a-z0-9]+)*)\.sql$"
)
ALLOWED_ACTIONS = {
    "create",
    "add",
    "alter",
    "rename",
    "backfill",
    "migrate",
    "normalize",
    "fix",
    "rebuild",
    "drop",
    "refresh",
}


@dataclass(frozen=True)
class Change:
    status: str
    old_path: str | None
    new_path: str | None


def git(*args: str) -> str:
    completed = subprocess.run(
        ["git", *args],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if completed.returncode != 0:
        command = " ".join(["git", *args])
        raise RuntimeError(
            f"Command failed ({completed.returncode}): {command}\n"
            f"{completed.stderr.strip()}"
        )
    return completed.stdout


def migration_paths_at(ref: str) -> list[str]:
    output = git("ls-tree", "-r", "--name-only", ref, "--", str(MIGRATION_DIR))
    return [
        line.strip()
        for line in output.splitlines()
        if line.strip().endswith(".sql")
    ]


def parse_changes(base_ref: str) -> list[Change]:
    output = git(
        "diff",
        "--name-status",
        "--find-renames",
        f"{base_ref}...HEAD",
        "--",
        str(MIGRATION_DIR),
    )
    changes: list[Change] = []
    for raw_line in output.splitlines():
        if not raw_line.strip():
            continue
        parts = raw_line.split("\t")
        status = parts[0]
        code = status[0]
        if code in {"R", "C"}:
            if len(parts) != 3:
                raise RuntimeError(f"Unexpected rename/copy record: {raw_line}")
            changes.append(Change(status=status, old_path=parts[1], new_path=parts[2]))
        elif len(parts) == 2:
            path = parts[1]
            if code == "D":
                changes.append(Change(status=status, old_path=path, new_path=None))
            else:
                changes.append(Change(status=status, old_path=None, new_path=path))
        else:
            raise RuntimeError(f"Unexpected git diff record: {raw_line}")
    return changes


def filename(path: str) -> str:
    return pathlib.PurePosixPath(path).name


def is_versioned(path: str | None) -> bool:
    return bool(path and ANY_VERSIONED_RE.fullmatch(filename(path)))


def is_repeatable(path: str | None) -> bool:
    return bool(path and filename(path).startswith("R__"))


def normalized_version(name: str) -> tuple[int, ...] | None:
    match = ANY_VERSIONED_RE.fullmatch(name)
    if not match:
        return None
    components = re.split(r"[._]", match.group("version"))
    return tuple(int(component) for component in components)


def versions_by_key(paths: Iterable[str]) -> dict[tuple[int, ...], list[str]]:
    grouped: dict[tuple[int, ...], list[str]] = collections.defaultdict(list)
    for path in paths:
        version = normalized_version(filename(path))
        if version is not None:
            grouped[version].append(path)
    return dict(grouped)


def format_version(version: tuple[int, ...]) -> str:
    return ".".join(str(component) for component in version)


def validate_description(description: str, name: str, errors: list[str]) -> None:
    action = description.split("_", 1)[0]
    if action not in ALLOWED_ACTIONS:
        errors.append(
            f"{name}: description must start with one of "
            f"{', '.join(sorted(ALLOWED_ACTIONS))}; got '{action}'"
        )


def validate_new_versioned(
    path: str,
    base_max_version: tuple[int, ...] | None,
    errors: list[str],
) -> None:
    name = filename(path)
    match = NEW_VERSIONED_RE.fullmatch(name)
    if not match:
        errors.append(
            f"{name}: new versioned migration must match "
            "VyyyyMMddHHmmss[_NN]__action_object_detail.sql"
        )
        return

    timestamp = match.group("timestamp")
    sequence = match.group("sequence")
    try:
        dt.datetime.strptime(timestamp, "%Y%m%d%H%M%S")
    except ValueError:
        errors.append(f"{name}: invalid Beijing timestamp '{timestamp}'")

    if sequence == "00":
        errors.append(f"{name}: optional sequence must be 01-99, not 00")

    validate_description(match.group("description"), name, errors)

    version = normalized_version(name)
    if version is None:
        errors.append(f"{name}: unable to parse Flyway version")
    elif base_max_version is not None and version <= base_max_version:
        errors.append(
            f"{name}: version {format_version(version)} must be greater than "
            f"base maximum {format_version(base_max_version)}; regenerate the "
            "Beijing timestamp before merge"
        )


def validate_repeatable(path: str, errors: list[str]) -> None:
    name = filename(path)
    match = REPEATABLE_RE.fullmatch(name)
    if not match:
        errors.append(
            f"{name}: repeatable migration must match "
            "R__action_object_detail.sql using lowercase snake_case"
        )
        return
    validate_description(match.group("description"), name, errors)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-ref",
        default="origin/main",
        help="Git ref used as the pull-request base (default: origin/main)",
    )
    args = parser.parse_args()

    try:
        base_paths = migration_paths_at(args.base_ref)
        head_paths = migration_paths_at("HEAD")
        changes = parse_changes(args.base_ref)
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    errors: list[str] = []
    warnings: list[str] = []

    base_versions = versions_by_key(base_paths)
    head_versions = versions_by_key(head_paths)
    base_max_version = max(base_versions, default=None)

    for change in changes:
        code = change.status[0]

        # Versioned migrations are immutable once present in the base branch.
        if change.old_path and is_versioned(change.old_path):
            if code in {"D", "R"}:
                errors.append(
                    f"{filename(change.old_path)}: existing versioned migration "
                    "must not be deleted or renamed; add a forward compensation"
                )

        if code == "M" and change.new_path and is_versioned(change.new_path):
            errors.append(
                f"{filename(change.new_path)}: existing versioned migration "
                "must not be modified; add a new migration"
            )

        if change.new_path is None:
            continue

        name = filename(change.new_path)
        if code in {"A", "C", "R"}:
            if name.startswith("V"):
                validate_new_versioned(change.new_path, base_max_version, errors)
            elif name.startswith("R__"):
                validate_repeatable(change.new_path, errors)
            else:
                errors.append(
                    f"{name}: SQL files in the Flyway directory must use V...__... "
                    "or R__... naming"
                )
        elif code == "M" and is_repeatable(change.new_path):
            validate_repeatable(change.new_path, errors)

    # Existing duplicates are legacy debt; fail only when this PR introduces or
    # increases a duplicate version.
    all_versions = sorted(set(base_versions) | set(head_versions))
    for version in all_versions:
        base_count = len(base_versions.get(version, []))
        head_count = len(head_versions.get(version, []))
        if head_count > 1 and head_count > base_count:
            errors.append(
                f"Flyway version {format_version(version)} is duplicated in HEAD: "
                + ", ".join(filename(path) for path in head_versions[version])
            )
        elif base_count > 1 and head_count == base_count:
            warnings.append(
                f"legacy duplicate version {format_version(version)} remains: "
                + ", ".join(filename(path) for path in head_versions.get(version, []))
            )

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if errors:
        print("Flyway migration governance failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("Flyway migration governance passed.")
    if not changes:
        print("No migration files changed in this pull request.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
