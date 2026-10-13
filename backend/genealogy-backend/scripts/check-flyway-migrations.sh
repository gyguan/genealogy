#!/usr/bin/env bash
set -euo pipefail

MIGRATION_DIR="${MIGRATION_DIR:-src/main/resources/db/migration}"

if [ ! -d "${MIGRATION_DIR}" ]; then
  echo "Migration directory not found: ${MIGRATION_DIR}" >&2
  exit 1
fi

python3 - "${MIGRATION_DIR}" <<'PY'
import collections
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
baseline = {
    "V1__create_current_schema.sql",
    "V2__seed_system_authorization.sql",
}
timestamped = re.compile(
    r"^V(?P<version>\d{14})(?:_(?P<sequence>\d{2}))?"
    r"__(?P<description>[a-z][a-z0-9]*(?:_[a-z0-9]+)*)\.sql$"
)
repeatable = re.compile(r"^R__[a-z][a-z0-9]*(?:_[a-z0-9]+)*\.sql$")

names = sorted(path.name for path in root.glob("*.sql"))
errors = []
missing = baseline - set(names)
if missing:
    errors.append("Missing baseline migrations: " + ", ".join(sorted(missing)))

versions = collections.defaultdict(list)
for name in names:
    if name in baseline:
        versions[name.split("__", 1)[0][1:]].append(name)
        continue
    match = timestamped.fullmatch(name)
    if match:
        if match.group("sequence") == "00":
            errors.append(f"{name}: sequence must be 01-99")
        key = match.group("version") + (("." + match.group("sequence")) if match.group("sequence") else "")
        versions[key].append(name)
        continue
    if repeatable.fullmatch(name):
        continue
    errors.append(
        f"{name}: active Flyway directory only accepts the fixed V1/V2 baseline, "
        "timestamped VyyyyMMddHHmmss[_NN] migrations, or R__ repeatables"
    )

for version, files in versions.items():
    if len(files) > 1:
        errors.append(f"Duplicate Flyway version {version}: " + ", ".join(files))

if errors:
    print("\n".join(errors), file=sys.stderr)
    raise SystemExit(1)

print(f"Flyway migration check passed: {len(names)} active SQL file(s).")
PY
