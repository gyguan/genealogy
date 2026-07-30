# Standard Ant Design Page Patterns — Issue #942

## Goal

Standard business modules use one typed page contract for title, description, query, result, table, detail drawer, editor and page state. Business data, URL state, permissions and service calls remain inside each feature.

## Public API

| Component | Responsibility |
| --- | --- |
| `StandardPage` | One business page root, one level-one title and shared content spacing. |
| `StandardPageHeader` | Title, supporting description and page-level actions. |
| `StandardQueryPanel` | Query card, optional guidance and the canonical query action slot. |
| `StandardResultSection` | Result title, total count, result-level actions and content. |
| `StandardTable` | Accessible horizontally scrollable Ant Design table wrapper. |
| `StandardDetailDrawer` | Detail drawer title, guidance and content contract. |
| `StandardEditorPage` | Editor page body with secondary action before primary action. |
| `StandardPageState` | Loading, empty, warning, forbidden and error states. |

All components expose explicit TypeScript props and preserve Ant Design public props where delegation is appropriate.

## Migrated modules

The following formal modules are registered through `StandardPage`:

1. 人物档案 — `personArchive`
2. 来源资料库 — `sourceLibrary`
3. 审核中心 — `reviewCenter`
4. 成员与权限 — `memberManage`
5. 审计追踪 — `auditTrace`
6. 修谱工作台 — `editingWorkspace`

The migration is intentionally structural. Existing feature query state, table columns, pagination, drawers, permissions and URL behavior are not changed.

## Style ownership

`standard-page-patterns.css` is imported by `StandardPagePatterns.tsx`, not by the global style entry. This keeps the styles component-owned and prevents a new global business selector bundle from bypassing Issue #947 classification.

Rules:

- Ant Design tokens only;
- no `!important`;
- no fixed system colors;
- no unscoped `.ant-*` selector;
- no runtime DOM movement;
- no static inline style object;
- responsive header actions without CSS `order`.

## Governance

`StandardPagePatternGovernance.test.mjs` verifies:

- all eight APIs and props types remain exported;
- all six representative modules remain migrated;
- styles stay token-driven and scoped;
- runtime DOM rearrangement and static inline style objects do not return.

The test is part of `npm run test:dom-governance`.

## Acceptance evidence

The Visual Release Gate covers formal pages at 1280, 1366, 1440 and 1920 desktop widths. The PR must keep the Style Debt Audit, DOM/CSS Governance, Frontend CI, production build, visual release and functional E2E gates green.
