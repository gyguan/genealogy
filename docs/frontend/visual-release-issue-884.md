# Frontend Visual Release Report — Issue #884

## Release scope

This release closes the Ant Design visual governance program tracked by #877 and child issues #879–#884.

## Verified standard UI contracts

- Ant Design `ConfigProvider` is the global token source.
- Standard pages use the shared 12/14/16/20px typography hierarchy.
- Form labels, helper text, validation feedback, controls and actions use the shared density baseline.
- Header user entry has an explicit keyboard focus ring.
- Standard tables and statistics use tabular numeric alignment.
- Tree/source interaction rules are feature-owned and no longer duplicated in `antd-bridge.css`.
- Auth presentation remains isolated under `.commercial-auth-*` selectors.

## Desktop viewport matrix

The release E2E matrix runs at:

- 1280 × 900
- 1366 × 900
- 1440 × 900
- 1920 × 900

Each run verifies application-shell horizontal overflow, culture query action overlap, Header user-entry visibility and focus styling, and records a full-page screenshot artifact.

## Approved visual exceptions

- Commercial auth pages may use branded colors, large radius and stronger shadow because all selectors are auth-feature scoped.
- Culture content presentation may retain content-specific visual treatments.
- Lineage graph canvas, nodes, edges and graph state visuals remain business-specific.
- Temporary bridge rules listed in `antd-override-exceptions.json` remain governed by owners and exit conditions; the bridge may only shrink.

## Residual risks

- The viewport matrix is a structural screenshot regression rather than pixel-diff snapshot approval.
- Mobile is covered by existing responsive tests but is not redesigned in this release.
- Dark theme remains out of scope.

## Required release gates

- DOM/CSS Governance
- TypeScript typecheck
- Production build
- Frontend focused tests
- Functional E2E
- Culture page gate and four-width desktop matrix
