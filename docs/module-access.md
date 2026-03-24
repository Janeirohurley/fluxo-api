# Module Access Keys

## Purpose

This project uses module access keys instead of multi-user authentication.

The idea is simple:

- one subscription plan grants access to one or more modules
- one generated key is attached to one plan
- every protected module checks the key before serving the request

## Headers Accepted

You can send the access key using one of these headers:

- `x-module-key`
- `x-api-key`
- `Authorization: Bearer <key>`

## Current Public Endpoints

- `GET /`
- `GET /health`
- `GET /modules`
- `GET /openapi.json`
- `GET /docs/`
- `GET /api/access/plans`
- `GET /api/access/me` requires a valid key

## Protected Module Endpoints

At the moment, these modules require a valid key:

- `/api/assets`
- `/api/finance`
- `/api/payroll`
- `/api/employees`

## Default Seeded Plans

- `assets-starter`
- `finance-starter`
- `people-starter`
- `payroll-starter`
- `business-suite`

## Useful Commands

List plans:

```bash
pnpm access:plans
```

Generate a key:

```bash
pnpm access:key:generate -- --plan assets-starter --label "Acme Assets"
```

Generate a key with expiry:

```bash
pnpm access:key:generate -- --plan business-suite --label "Production" --expires-at 2026-12-31
```

## Notes

- only the hashed key is stored in the database
- the plain key is shown only when it is generated
- if a plan does not include a module, requests to that module return `403`
