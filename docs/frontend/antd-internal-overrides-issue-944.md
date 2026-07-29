# Ant Design Internal Override Governance — Issue #944

## Scope

This governance scans every active production CSS file under `frontend/genealogy-web/src` and inventories selectors containing Ant Design classes such as `.ant-form-item`, `.ant-table-cell`, `.ant-drawer-body`, and `.ant-tabs-nav`. Prototype-only CSS is excluded from the production result.

The scan is independent from the existing style-debt baseline. The style-debt baseline prevents known debt from growing; this audit provides a selector-level inventory and prevents global Ant Design internal overrides from returning.

## Classification

Every selector is assigned one classification:

1. `public-component-root` — an explicit business class is attached to the Ant Design component root, for example `.github-user-trigger.ant-btn`;
2. `scoped-component-contract` — an Ant Design element is reached below a stable business or feature scope;
3. `private-structure-contract` — the selector depends on multiple Ant classes, structural pseudo-classes, attributes, or internal combinators;
4. `portal-scoped-contract` — a portal is constrained by a business scope expressed through the page state;
5. `unscoped-internal` — no business class or data scope protects the selector.

The generated Markdown and JSON reports include the exact file, media context, selector, declarations, classification, and disposition for every item.

## Replacement order

When a selector is changed, replacement must be considered in this order:

1. global design token;
2. component token;
3. public component prop;
4. outer business layout;
5. unavoidable internal selector.

An unscoped internal selector is a blocking violation. Explicit component-root bindings and scoped contracts remain visible in the report so later page-specific work can migrate them without losing ownership or location information.

## Exception contract

A future unavoidable unscoped exception must be exact and contain:

- `id`;
- `entries` (`src/file.css|media|selector`);
- `owner`;
- `reason`;
- `replacementAssessment: unavoidable`;
- open `trackingIssue`;
- `reviewedAt`;
- `exitCondition`.

The audit fails for:

- unscoped internal selectors without an exact exception;
- replaceable entries registered as unavoidable;
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

## Remediations in #944

- Removed the global `.ant-select-multiple` width rule; `QueryMultiSelect` already applies width through the public `style` prop.
- Removed global Popconfirm title and description overrides so the component follows Ant Design tokens and locale styling.
- Updated existing tests to prevent either unscoped selector from returning.
- Added a parser that respects selector lists inside `:is()`, `:where()`, `:has()`, brackets, quoted values, and nested media rules.

## Acceptance boundary

Business visuals that do not target Ant Design classes remain outside this audit, including lineage graph nodes and edges, culture content layout, and authentication brand decoration. Their surrounding Form, Table, Drawer, Tabs, Card, Select, Upload, Modal, and Menu selector usage remains inventoried.

Issue #944 is complete when the audit reports:

- zero blocking unscoped selectors;
- zero stale exceptions;
- an exact classified inventory for all remaining scoped selector contracts;
- successful DOM/CSS governance, typecheck, build, visual, multi-browser, and functional gates.
