# Fluxo API

`Fluxo API` is a modular ERP backend built as a decoupled modular monolith for SaaS usage.

The current `v1` covers:
- `assets`
- `finance`
- `employees`
- `payroll`
- adaptive `overview`
- tenant provisioning
- subscription and access-key management

## Product Scope

Fluxo is designed to let one company subscribe to one or more business modules, then operate inside its own isolated tenant database.

Current functional domains:
- `assets`: asset registry, assignments, finance data, maintenance
- `finance`: transactions, accounts, journal entries, reconciliations
- `employees`: staff directory, roles, positions, assignments, contracts
- `payroll`: payslips, pay runs, payroll-finance integration

## Architecture

Fluxo uses a multi-tenant architecture with two database layers:

- global admin database:
  - companies
  - subscription requests
  - plans
  - access keys
  - tenant database registry
  - global audit
- tenant database:
  - assets
  - finance
  - employees
  - payroll
  - tenant audit

Prisma schemas:
- global SaaS schema: [prisma/schema.prisma](/c:/Users/janeiro%20hurley/Desktop/projects/Fluxo/fluxo-api/prisma/schema.prisma)
- tenant business schema: [prisma/tenant.schema.prisma](/c:/Users/janeiro%20hurley/Desktop/projects/Fluxo/fluxo-api/prisma/tenant.schema.prisma)

Runtime behavior:
- access keys are validated against the global database
- the tenant company is resolved from the access key
- requests are routed to the company tenant database
- business modules operate only on tenant data

## Module Status

`v1` modules currently available:
- `assets`
- `finance`
- `employees`
- `payroll`

All four modules are:
- tenant-aware
- protected by subscription access keys
- documented in Swagger
- exposed in the adaptive `/api/overview`

## Overview

The `/api/overview` endpoint is progressive and subscription-aware.

It returns:
- one block per module
- `cross_module` metrics when multiple ready modules are enabled

Current cross-module coverage includes:
- `assets + employees`
- `assets + finance`
- `payroll + finance`
- `payroll + employees`
- `assets + payroll + finance`

## Request And Response Contract

The public API contract is frontend-friendly:

- request payloads may be sent in `snake_case`
- internal backend logic stays in `camelCase`
- responses are returned in `snake_case`

Pagination is centralized and reusable across modules.

## Security And Access

Fluxo currently uses module access keys instead of multi-user authentication.

Access flow:
1. the client requests modules from the portal
2. an admin approves the subscription
3. a tenant company database is provisioned
4. an access key is generated
5. the key grants access only to subscribed modules

Related docs:
- [module-access.md](/c:/Users/janeiro%20hurley/Desktop/projects/Fluxo/fluxo-api/docs/module-access.md)

## Operations

Operational features already included:
- request logging with `request_id`
- rate limiting
- health endpoint
- metrics endpoint
- monitoring snapshot
- global audit
- tenant audit
- backup and restore scripts
- tenant schema synchronization

Related docs:
- [backup-restauration.md](/c:/Users/janeiro%20hurley/Desktop/projects/Fluxo/fluxo-api/docs/backup-restauration.md)

## Main Commands

Install:

```bash
pnpm install
```

Generate Prisma clients:

```bash
pnpm run prisma:generate
```

Validate both Prisma schemas:

```bash
pnpm run prisma:validate
```

Run the API in development:

```bash
pnpm run dev
```

Build production bundle:

```bash
pnpm run build
```

Run tests:

```bash
pnpm test
```

Create a release locally, then push commits and tags:

```bash
pnpm run release
pnpm run release:push
```

This flow:
- updates `package.json`
- updates `CHANGELOG.md`
- creates a Git tag like `v1.2.0`
- pushes commits and tags to `main`
- triggers GitHub Actions to create the GitHub Release automatically

Synchronize tenant schemas:

```bash
pnpm run tenant:sync
```

Seed asset mock data for one tenant:

```bash
pnpm run tenant:seed:assets -- --company <tenant-slug> --count 25
```

Create a database backup:

```bash
pnpm run db:backup
```

Restore a backup:

```bash
pnpm run db:restore -- --file backups/<file>.dump
```

## API Entry Points

Main endpoints:
- `/docs`
- `/openapi.json`
- `/health`
- `/metrics`
- `/observability`
- `/modules`
- `/api/overview`
- `/api/access/plans`
- `/api/access/me`
- `/api/assets`
- `/api/finance`
- `/api/employees`
- `/api/payroll`

Public subscription/admin web pages:
- `/portal`
- `/admin/subscriptions?token=...`

## Project References

Module docs:
- [assets README](/c:/Users/janeiro%20hurley/Desktop/projects/Fluxo/fluxo-api/src/modules/assets/README.md)
- [employees README](/c:/Users/janeiro%20hurley/Desktop/projects/Fluxo/fluxo-api/src/modules/employees/README.md)
- [payroll README](/c:/Users/janeiro%20hurley/Desktop/projects/Fluxo/fluxo-api/src/modules/payroll/README.md)

Development guide:
- [module-roadmap.md](/c:/Users/janeiro%20hurley/Desktop/projects/Fluxo/fluxo-api/docs/module-roadmap.md)

## V1 Status

The project is now in a `v1 production-ready` zone for controlled SaaS rollout, with the main remaining work being:
- final deployment validation
- real SMTP configuration
- final backup/restore rehearsal
- final production environment setup

From an application and architecture perspective, the first version is now functionally complete.
