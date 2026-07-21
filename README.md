# axion-pay

## Overview

axion-pay is maintained as a production-ready release copy generated from the SANDBOX workspace.

## Repository role

- Bucket: `apps`
- Project kind: `node-react-app`
- Release strategy: `github-release-build-artifact`
- Owner target: `axion-dev-enterprise`
- Notes: Axion Dev Enterprise release repository.

## Technology stack

React, Node.js, npm

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
npm test --if-present
```

## Release process

1. Develop and validate in `D:\WORKSPACE\SANDBOX`.
2. Sync the clean release copy into `D:\WORKSPACE\PRODUCTION\apps\axion-pay`.
3. Run CI and local validation.
4. Create or update the GitHub repository for this project.
5. Publish tagged releases through GitHub Actions.

## Source of truth

The development source of truth for this project lives in:

`D:\WORKSPACE\SANDBOX\apps\axion-pay`
