#!/usr/bin/env bash
set -euo pipefail

MIGRATION_DIR="${MIGRATION_DIR:-src/main/resources/db/migration}"

if [ ! -d "${MIGRATION_DIR}" ]; then
  echo "Migration directory not found: ${MIGRATION_DIR}" >&2
  exit 1
fi

echo "Checking Flyway migrations in ${MIGRATION_DIR}"

python3 - "${MIGRATION_DIR}" <<'PY'
import collections
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
pattern = re.compile(r'^V([0-9]+(?:\.[0-9]+)?)__.+\.sql$')
versions = collections.defaultdict(list)
invalid = []

for path in sorted(root.glob('*.sql')):
    match = pattern.match(path.name)
    if not match:
        invalid.append(path.name)
        continue
    versions[match.group(1)].append(path.name)

errors = []
if invalid:
    errors.append('Invalid Flyway file names: ' + ', '.join(invalid))

duplicates = {version: names for version, names in versions.items() if len(names) > 1}
if duplicates:
    for version, names in duplicates.items():
        errors.append(f'Duplicate Flyway version {version}: ' + ', '.join(names))

if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)

print('Flyway migration check passed.')
print('Versions:')
for version in sorted(versions, key=lambda item: [int(part) for part in item.split('.')]):
    print(f'  V{version}: {versions[version][0]}')
PY
