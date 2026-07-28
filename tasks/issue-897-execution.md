# Issue #897 Execution

## Scope

- Enable Ant Design CSS variables through `ConfigProvider.theme.cssVar`.
- Establish stable `--genealogy-*` semantic variables backed by Ant Design tokens.
- Migrate application shell, CurrentUserMenu, Shared UI and member feature away from duplicated default system colors.
- Keep commercial auth, culture content and lineage graph visuals outside this migration.
- Add governance preventing fixed Ant Design defaults from returning to standard UI responsibility files.

## Validation

- DOM/CSS Governance
- Members/Auth/Wizard focused tests
- TypeScript typecheck
- Production build
- Existing viewport and E2E gates
