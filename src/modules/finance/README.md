# Finance Module

The `finance` module is the accounting and cash-flow domain of Fluxo API.

It follows the same modular structure as `assets`:

- `finance.schema.ts`: Zod validation and query contracts
- `finance.types.ts`: response and aggregate types
- `finance.repository.ts`: in-memory and Prisma persistence
- `finance.service.ts`: business rules and orchestration
- `finance.controller.ts`: HTTP handlers
- `finance.routes.ts`: route registration
- `finance.docs.ts`: module self-documentation

## Scope

This first implementation is based on the PDF schema and covers:

- payment methods
- transaction types
- accounting accounts
- transactions
- journal entries and lines
- reconciliations and reconciliation items

## Base Path

`/api/finance`

## Authentication

The module is protected by the access-key middleware and requires the `finance` module in the active plan.

Accepted headers:

- `x-module-key`
- `x-api-key`
- `Authorization: Bearer <key>`

## Main Routes

- `GET /api/finance/docs`
- `GET /api/finance`
- `GET/POST /api/finance/payment-methods`
- `GET/POST /api/finance/transaction-types`
- `GET/POST /api/finance/accounts`
- `PATCH /api/finance/accounts/:id`
- `GET/POST /api/finance/transactions`
- `GET/PATCH/DELETE /api/finance/transactions/:id`
- `GET/POST /api/finance/journal-entries`
- `GET /api/finance/journal-entries/:id`
- `POST /api/finance/journal-entries/:id/post`
- `GET/POST /api/finance/reconciliations`
- `GET /api/finance/reconciliations/:id`
- `POST /api/finance/reconciliations/:id/close`
- `POST /api/finance/reconciliations/:id/items`

## Business Rules

- transaction references must point to existing transaction types and payment methods
- journal entries must be balanced
- a journal entry cannot be posted twice
- a reconciliation cannot be closed twice
- reconciliation items cannot be added to a closed reconciliation
- a reconciliation item must reference exactly one source:
  - a transaction
  - or a journal entry line
- a transaction cannot be deleted once it is linked to reconciliation items

## Persistence

By default, the module uses Prisma when `DATABASE_URL` is configured.

Fallback mode:

- set `FINANCE_STORAGE=memory` to run the module without database persistence

## Swagger

Swagger coverage for finance is registered in `src/docs/openapi.ts`.

## Notes

- this implementation uses a small amount of inference where the PDF truncates some monetary column names
- `statement_balance` and `book_balance` are the chosen reconciliation balance fields for this v1
- optional cross-domain references like `employee_id`, `asset_id` and `pay_slip_id` are preserved as nullable UUIDs
