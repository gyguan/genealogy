# Issue #945 — Business Visual Boundaries

## Governing principle

All three exceptional product areas use standard Ant Design components for their surrounding application UI. Custom CSS is permitted only for a stable, explicitly named business visual core and must never depend on Ant Design internal DOM, global document selectors, CSS ordering, or `!important`.

| Area | Standard Ant Design periphery | Permitted custom business visual core | Stable root |
|---|---|---|---|
| Authentication | `Layout`, `Card`, `Form`, `Input`, `Button`, governed feedback | Background, product mark, brand copy, decorative lineage motif | `.commercial-auth-shell` |
| Clan culture | Query actions, Tabs, result containers, editor controls, Drawer, pagination, feedback | Culture prose, media/attachment presentation, editor outer layout and history content | `.culture-product-page` |
| Lineage | Query controls, toolbar actions, Tabs, alert/feedback, Drawer, Descriptions | Graph shell, canvas, nodes, edges, legend positioning, zoom/pan and selection visuals | `.lineage-tree-page--standardized` |

## Prohibited patterns

- `body`, `html`, `#root`, or selectors that affect another feature.
- `.ant-*` selectors in the governed exceptional CSS files.
- Styling based on undocumented Ant Design child DOM.
- `!important`, CSS `order`, or runtime DOM movement.
- Recreating standard form, table, tabs, drawer, button, alert, pagination, or feedback visuals.

## Responsive contract

The standard Ant Design periphery remains responsible for control sizing and accessibility. Feature CSS may only change outer business layout at 1280, 1440, 1920, 768, and 390 widths. Narrow layouts must not introduce document-level horizontal overflow, unreachable actions, or feature leakage.

## Regression enforcement

`BusinessVisualBoundaryGovernance.test.mjs` blocks boundary violations. Existing Visual Release, Functional E2E, Security, Style Debt, API Contract, Tracking Page, and Multi-Browser gates provide release evidence.
