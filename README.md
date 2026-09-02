# axion-pay

## Overview

Public portal and dashboard frontend for AXION Pay. The payment API is maintained separately in [`axion-pay-core`](https://github.com/axion-dev-enterprise/axion-pay-core) and runs at `https://api.axionenterprise.cloud`.

## Repository role

- Bucket: `apps`
- Project kind: `react-portal`
- Release strategy: `github-release-build-artifact`
- Owner target: `axion-dev-enterprise`
- Notes: Axion Dev Enterprise release repository.

## Technology stack

React, Vite, TypeScript, npm

## Quality gates

- CI workflow: `.github/workflows/ci.yml`
- Release workflow: `.github/workflows/release.yml`
- Production hygiene validation: `D:\WORKSPACE\SCRIPTS\verify-production-builds.ps1`

## Local setup

```bash
npm install
```

## Validation and build

```bash
npm run build --if-present
npm run test:web --if-present
```

## Release process

1. Develop and validate in `D:\WORKSPACE\SANDBOX`.
2. Run the frontend build and typecheck.
3. Publish the portal through the canonical Vercel project.
4. Validate `/`, `/dashboard`, and `https://api.axionenterprise.cloud/health`.

## Runtime boundaries

- This repository does not create charges or expose a payment backend.
- All merchants, API keys, transactions, and payment-provider calls are handled by `axion-pay-core`.
- The former Express checkout/backend, its Vercel rewrites, and its static bundle were removed to prevent mocked, duplicate, or credential-bearing payment paths from being executed. The only payment API is `https://api.axionenterprise.cloud`.

## Source of truth

The development source of truth for this project lives in:

`D:\WORKSPACE\SANDBOX\apps\axion-pay`
