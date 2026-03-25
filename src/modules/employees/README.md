# Employees Module

Le module `employees` couvre la base RH du tenant dans `Fluxo API`.

## Périmètre

- référentiels `roles`, `positions`, `locations`
- fiches `employees`
- historique `employee_assignments`
- historique `contracts`

## Architecture

- `employees.schema.ts` : validation Zod et contrats de requête
- `employees.types.ts` : types de sortie du module
- `employees.repository.ts` : persistence Prisma tenant + fallback mémoire
- `employees.service.ts` : règles métier RH
- `employees.controller.ts` : endpoints HTTP
- `employees.routes.ts` : routes Express
- `employees.module.ts` : composition du module

## Endpoints

- `GET /api/employees/docs`
- `GET/POST /api/employees/roles`
- `GET/POST /api/employees/positions`
- `GET/POST /api/employees/locations`
- `GET/POST /api/employees`
- `GET/PATCH/DELETE /api/employees/:id`
- `GET/POST /api/employees/:id/assignments`
- `GET/POST /api/employees/:id/contracts`
- `PATCH /api/employees/:id/contracts/:contractId`

## Règles Métier

- un employé ne peut pas avoir deux affectations qui se chevauchent
- un employé ne peut pas avoir deux contrats actifs qui se chevauchent
- un employé avec historique d’affectation ou de contrat ne peut pas être supprimé
- les entrées/sorties HTTP restent en `snake_case`, le code interne reste en `camelCase`

## Données Tenants

Le module est multi-tenant :

- les tables RH vivent dans la base tenant
- le module utilise le prisma tenant request-scoped
- `EMPLOYEES_STORAGE=memory` permet un fallback mémoire

## Référentiels Seedés

Au provisionnement tenant, on ajoute automatiquement :

- rôles : `Administrator`, `Manager`, `Officer`, `Technician`, `Staff`
- positions : `Operations Officer`, `Accountant`, `HR Officer`, `Technician`, `Driver`
- locations : `Head Office`, `Warehouse`, `Field Office`

## Limites Actuelles

- pas encore de provider `overview` RH dédié
- pas encore de paie branchée sur `contracts`
- pas encore de pièces jointes RH ou de workflow d’approbation
