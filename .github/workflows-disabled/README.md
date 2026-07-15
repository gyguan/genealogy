# Disabled GitHub Actions workflows

The repository keeps only four active GitHub Actions workflows:

- `.github/workflows/backend-ci.yml`
- `.github/workflows/frontend-ci.yml`
- `.github/workflows/api-contract.yml`
- `.github/workflows/database-migration-governance.yml`

The following complex workflows were removed from `.github/workflows` and are no longer available as automatic or manual GitHub Actions gates:

- Auth Commercial E2E
- Issue Delivery Governance
- Culture Governance CI
- Culture Library UI CI
- Tree Release Gate

Complex E2E, PostgreSQL integration, browser, security, performance and release validation must be executed manually outside the automatic merge gate when explicitly required.
