# Issue #896 Execution

## Goal

Retire member, relationship preset and legacy authentication styles from `antd-bridge.css` without changing business behavior.

## Checklist

- [x] Move member role presentation into `member-permission-page.css`.
- [x] Confirm relationship type selection uses Ant Design `Select` and delete unused preset-button CSS.
- [x] Confirm the commercial auth system owns active authentication visuals and delete unused legacy auth CSS.
- [x] Remove retired #896 exception domains from `antd-override-exceptions.json`.
- [x] Add governance preventing retired selectors from returning.
- [ ] Validate Members, Wizard, Auth, DOM/CSS Governance, TypeScript and production build.
- [ ] Merge and close #896.

## Scope boundary

No changes to member permissions, relationship domain rules, authentication APIs or branding design.
