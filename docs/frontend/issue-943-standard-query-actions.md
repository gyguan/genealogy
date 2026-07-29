# Issue #943 — Standard Query Actions

Eight query feature groups use one declarative action contract. The canonical order is more filters, reset, submit. The submit action remains the final form submit control; while it is loading, more/reset are disabled to prevent conflicting state changes. Existing field definitions, query services, pagination, sorting, permissions and URL serializers remain feature-owned.

Migrated groups: persons, tree, sources, culture, workbench, reviews, members and logs.

Governance: StandardQueryActionsGovernance.test.mjs blocks hand-built query action groups and verifies canonical source order. Existing real-browser suites cover submit, reset, URL refresh and history navigation.

Acceptance requires Frontend CI, DOM/CSS Governance, Style Debt Audit, Visual Release Gate, Functional E2E, API Contract, Security Penetration and Multi-Browser Compatibility to pass on the final human-authored branch head.
