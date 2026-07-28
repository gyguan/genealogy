# Issue #894 Execution

## Goal

Calibrate the Ant Design override exception ledger and enforce two-way consistency between `antd-bridge.css` and the registry.

## Completed

- Removed retired tree/source exception entries.
- Added owner, review date, reason, exit condition and tracking issue metadata.
- Added an exact `!important` selector/property snapshot.
- Added coverage prefixes for every selector that reaches Ant Design internals.
- Added governance tests for stale entries, missing registrations and snapshot position changes.
- Wired the new governance test into `npm run test:dom-governance`.

## Validation

```bash
cd frontend/genealogy-web
npm run test:dom-governance
npm run typecheck
npm run build
```

## Scope boundary

No business layout, visual appearance, API, domain model or Ant Design token changes are included.
