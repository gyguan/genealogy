# Ant Design Internal Override Governance — Issue #944

## Scope

This governance scans every production CSS file under `frontend/genealogy-web/src` and identifies selectors that depend on Ant Design internal class names such as `.ant-form-item`, `.ant-table-cell`, `.ant-drawer-body`, or `.ant-tabs-nav`.

The scan is independent from the existing style-debt baseline. The baseline prevents debt growth; this gate answers a stricter question: does production CSS depend on Ant Design internal DOM at all?

## Replacement order

Every identified selector must be assessed in this order:

1. global design token;
2. component token;
3. public component prop;
4. outer business layout;
5. unavoidable internal selector.

Items in the first four categories must be migrated. Only the fifth category may be registered as an exception.

## Exception contract

An unavoidable exception must be exact and contain:

- `id`;
- `entries` (`src/file.css|selector`);
- `owner`;
- `reason`;
- `replacementAssessment: unavoidable`;
- open `trackingIssue`;
- `reviewedAt`;
- `exitCondition`.

The audit fails for:

- unregistered internal selectors;
- unscoped `.ant-*` selectors;
- replaceable entries registered as exceptions;
- stale exception entries;
- malformed registry metadata.

## Commands

```bash
cd frontend/genealogy-web
npm run audit:antd-overrides
npm run test:dom-governance
```

The audit writes:

- `antd-internal-overrides-audit.json`;
- `antd-internal-overrides-audit.md`.

## Acceptance boundary

Business visuals that do not target Ant Design internals remain outside this audit, including lineage graph nodes and edges, culture content layout, and authentication brand decoration. Their surrounding Form, Table, Drawer, Tabs, Card, Select, Upload, Modal, and Menu components remain covered.

## Current target

Issue #944 is complete only when the audit reports:

- zero unregistered selectors;
- zero unscoped selectors;
- zero stale exceptions;
- all retained selectors, if any, registered as unavoidable exact exceptions.
