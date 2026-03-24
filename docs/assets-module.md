# Assets Module

## Overview

The `assets` module manages the asset domain from the PDF schema.

Base path: `/api/assets`

Swagger UI: `/docs/`

OpenAPI JSON: `/openapi.json`

Access key required: yes

Accepted headers:

- `x-module-key`
- `x-api-key`
- `Authorization: Bearer <key>`

It includes:

- asset reference data: categories, statuses, intervention types
- asset records
- asset finance data in a 1:1 relation
- asset assignment history
- maintenance logs

## Storage Mode

By default, the module uses Prisma and PostgreSQL when `DATABASE_URL` is configured and available.

You can force the in-memory fallback with:

```env
ASSETS_STORAGE=memory
```

This is useful when you want to test the routes before your PostgreSQL instance is ready.

## Main Routes

### Module documentation

- `GET /api/assets/docs`

### Reference data

- `GET /api/assets/categories`
- `POST /api/assets/categories`
- `GET /api/assets/statuses`
- `POST /api/assets/statuses`
- `GET /api/assets/intervention-types`
- `POST /api/assets/intervention-types`

### Assets

- `GET /api/assets`
- `POST /api/assets`
- `GET /api/assets/:id`
- `PATCH /api/assets/:id`
- `DELETE /api/assets/:id`

### Finance

- `GET /api/assets/:id/finance`
- `PUT /api/assets/:id/finance`

### Assignments

- `GET /api/assets/:id/assignments`
- `POST /api/assets/:id/assignments`

### Maintenance

- `GET /api/assets/:id/maintenance`
- `POST /api/assets/:id/maintenance`

## Example Payloads

### Create a category

```json
{
  "name": "IT Equipment"
}
```

### Create an asset

```json
{
  "inventoryCode": "AST-001",
  "name": "Dell Latitude 5440",
  "brand": "Dell",
  "model": "Latitude 5440",
  "serialNumber": "SN-0001",
  "categoryId": "11111111-1111-1111-1111-111111111111",
  "statusId": "22222222-2222-2222-2222-222222222222"
}
```

### Upsert finance data

```json
{
  "acquisitionDate": "2026-03-24",
  "purchaseValue": 1250,
  "estimatedLifeYears": 4,
  "residualValue": 150
}
```

### Create an assignment

```json
{
  "employeeId": "33333333-3333-3333-3333-333333333333",
  "locationId": "44444444-4444-4444-4444-444444444444",
  "startDate": "2026-03-24"
}
```

### Create a maintenance log

```json
{
  "interventionTypeId": "55555555-5555-5555-5555-555555555555",
  "description": "Battery diagnostic and preventive maintenance",
  "interventionCost": 35,
  "provider": "Internal IT"
}
```

## Notes

- If you call `/assets` instead of `/api/assets`, the API will return `Route not found`.
- If PostgreSQL is not running, Prisma-backed routes will fail unless you switch to `ASSETS_STORAGE=memory`.
- The module is intentionally independent from `employees` and `locations` for now, so assignment references are stored as external UUIDs.
