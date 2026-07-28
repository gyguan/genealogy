# Issue #884 Execution

## Goal

Complete the final frontend visual consistency review and release gate after #879–#883.

## Scope

- Review remaining standard business pages: auth, app shell/header, home, culture, imports, reviews, members, audit/logs.
- Consolidate standard card, form, table, action, feedback, empty, disabled and keyboard focus states.
- Add four-width desktop regression coverage for 1280, 1366, 1440 and 1920.
- Preserve culture content visuals and lineage graph business exceptions.
- Run full frontend quality gates and close parent #877 after all child issues pass.

## Task board

- [x] T0 Restore issue context and confirm #881–#883 are complete.
- [ ] T1 Create Draft PR and write execution context back to #884.
- [ ] T2 Audit remaining page styles and remove standard-page visual drift.
- [ ] T3 Add final visual governance and desktop viewport regression coverage.
- [ ] T4 Run full frontend CI/E2E and record residual exceptions.
- [ ] T5 Merge, close #884, update and close #877.

## Validation plan

```bash
cd frontend/genealogy-web
npm run test:dom-governance
npm run typecheck
npm run build
npm run test:e2e
```

Focused tests will be added for final visual governance and the 1280/1366/1440/1920 viewport matrix.

## Constraints

- No backend API, domain model, permission or review-flow changes.
- No mobile redesign or dark-theme launch.
- No redesign of culture content or lineage graph core visuals.
