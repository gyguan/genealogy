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
versioned_pattern = re.compile(r'^V([0-9]+(?:[._][0-9]+)*)__[a-z][a-z0-9_]*\.sql$')
repeatable_pattern = re.compile(r'^R__[a-z][a-z0-9_]*\.sql$')
callback_pattern = re.compile(r'^beforeEachMigrate__[a-z][a-z0-9_]*\.sql$')
versions = collections.defaultdict(list)
callbacks = []
repeatables = []
invalid = []

for path in sorted(root.glob('*.sql')):
    versioned_match = versioned_pattern.match(path.name)
    if versioned_match:
        normalized_version = versioned_match.group(1).replace('_', '.')
        versions[normalized_version].append(path.name)
        continue
    if repeatable_pattern.match(path.name):
        repeatables.append(path.name)
        continue
    if callback_pattern.match(path.name):
        callbacks.append(path.name)
        continue
    invalid.append(path.name)

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
if repeatables:
    print('Repeatables:')
    for name in repeatables:
        print(f'  {name}')
if callbacks:
    print('Callbacks:')
    for name in callbacks:
        print(f'  {name}')
PY
