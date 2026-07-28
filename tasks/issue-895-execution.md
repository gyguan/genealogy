# Issue #895 execution

## Scope

- Move application shell and Header styles from `antd-bridge.css` to `styles/shell/app-shell.css`.
- Move CurrentUserMenu and profile styles to `features/auth/current-user-menu.css`.
- Move shared Panel/Form/Table/Empty/Detail contracts to `styles/shared/shared-antd-contracts.css`.
- Replace the raw user-menu trigger with an Ant Design Button and explicit menu accessibility state.
- Remove migrated override-ledger entries and shrink the bridge snapshot.

## Governance result

- `antd-bridge.css` no longer owns application shell, current-user or shared UI styles.
- `!important` declarations in the bridge shrink from 13 to 6.
- Remaining bridge ownership is limited to legacy auth/member presentation and query-grid compatibility.
- `BridgeOwnershipGovernance.test.mjs` prevents migrated responsibilities from returning.

## Verification

- `npm run test:dom-governance`
- `npm run typecheck`
- `npm run build`
- four-width shell viewport regression
