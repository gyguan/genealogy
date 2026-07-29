# Issue #946 — Responsive Release Matrix

## Formal scope

The responsive release registry contains exactly 14 production pages: home, wizard, person archive/detail/edit, lineage, source library, clan culture, imports, editing workspace, review center, member management, audit trace, and authentication.

## Required viewports

| Matrix key | Viewport | Release purpose |
|---|---:|---|
| mobile | 390 × 844 | phone reachability and full-page screenshot evidence |
| tablet | 768 × 1024 | portrait tablet layout |
| compact-desktop | 1024 × 768 | landscape tablet / narrow desktop layout |
| desktop regression | 1280 / 1440 / 1920 | retained desktop visual baseline |

The core matrix therefore executes 42 formal page/viewport combinations per browser project.

## Assertions

Every combination validates:

- no document-level horizontal overflow;
- the primary shell and header stay inside the viewport;
- a page-specific primary action, query, save, cancel, back, upload, or authentication action remains reachable;
- visible Ant Design Table, Form, Descriptions, Card, Upload, Steps, Drawer, and Modal containers remain bounded by the viewport;
- phone runs retain a full-page screenshot for each formal page;
- each viewport writes a JSON report with per-page results and a zero-failure summary.

Tables keep Ant Design ownership and may use component-contained horizontal scrolling. The matrix does not require private Ant Design DOM rewrites or mobile-only table-card emulation.

## Browser coverage

The complete matrix runs in Chromium through Visual Release Gate. Multi-Browser Compatibility reuses the same core responsive specification in Chrome/Chromium, Edge, Firefox, WebKit, and high-DPI desktop projects. Functional E2E remains responsible for real backend workflows and authentication semantics.

## Governance

`ResponsiveReleaseMatrixGovernance.test.mjs` freezes the 14-page registry, the three responsive viewport definitions, desktop regression widths, screenshot evidence, component boundary assertions, and JSON reporting. A new production page must update the registry and governance test in the same pull request.
