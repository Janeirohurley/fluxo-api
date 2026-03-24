# Assets Module

## Resume

Le module `assets` gere le patrimoine de l'entreprise dans Fluxo.

Il couvre aujourd'hui :

- les categories d'actifs
- les statuts d'actifs
- les types d'intervention
- la creation, modification, lecture et suppression controlee des actifs
- les donnees financieres 1:1 d'un actif
- les affectations d'actifs
- les maintenances
- l'overview metier du patrimoine

Le module est le premier domaine completement branche dans l'architecture multi-tenant de Fluxo.

Base path :

```text
/api/assets
```

## Ce Que Le Module Fait

Le module permet de :

- enregistrer des actifs avec un code d'inventaire unique
- rattacher un actif a une categorie et a un statut
- enregistrer la valeur d'achat, la valeur residuelle et la duree de vie estimee
- historiser les affectations
- historiser la maintenance
- calculer un overview patrimoine
- tracer les mutations importantes via l'audit tenant

## Architecture

Le module suit une structure modulaire classique :

- `assets.controller.ts` : endpoints HTTP
- `assets.routes.ts` : declaration des routes
- `assets.schema.ts` : validation Zod
- `assets.service.ts` : regles metier
- `assets.repository.ts` : acces aux donnees
- `assets.module.ts` : composition du module
- `assets.types.ts` : types de sortie

## Multi-Tenant

Le module `assets` est maintenant tenant-aware.

Cela veut dire :

- la cle d'acces est validee dans la base globale
- la cle est liee a une entreprise
- l'entreprise est liee a une base dediee
- les requetes `assets` sont routees vers la base dediee du demandeur

En pratique :

- un client A ne lit pas les actifs du client B
- un `GET /api/assets` lit la base du tenant courant
- un `POST /api/assets` cree l'actif dans la base du tenant courant

## Stockage

En mode normal, le module utilise PostgreSQL via Prisma.

Le routing multi-tenant est actif pour les requetes protegees par cle.

Il existe aussi un fallback memoire pour les cas de dev simple :

```env
ASSETS_STORAGE=memory
```

Ce mode ne doit pas etre utilise en production SaaS.

## Contrat HTTP

Le module accepte des payloads en `snake_case` et repond aussi en `snake_case`.

Exemples :

- entree : `inventory_code`, `category_id`, `status_id`
- sortie : `inventory_code`, `created_at`, `maintenance_logs`

Les listes utilisent la pagination publique suivante :

```json
{
  "data": [],
  "pagination": {
    "count": 0,
    "page_size": 20,
    "current_page": 1,
    "total_pages": 1,
    "next": null,
    "previous": null
  }
}
```

## Authentification

Le module exige une cle d'acces.

Headers acceptes :

- `x-module-key`
- `x-api-key`
- `Authorization: Bearer <key>`

La cle ne contient pas les droits en clair.
Les droits sont resolus dynamiquement depuis le plan attache a la cle.

## Endpoints

### Documentation

- `GET /api/assets/docs`

### Referentiels

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

### Finance de l'actif

- `GET /api/assets/:id/finance`
- `PUT /api/assets/:id/finance`

### Affectations

- `GET /api/assets/:id/assignments`
- `POST /api/assets/:id/assignments`

### Maintenance

- `GET /api/assets/:id/maintenance`
- `POST /api/assets/:id/maintenance`

## Filtres Et Pagination

`GET /api/assets` supporte :

- `page`
- `page_size`
- `search`
- `category_id`
- `status_id`
- `sort_by`
- `sort_order`

`search` couvre :

- `inventory_code`
- `name`
- `brand`
- `model`
- `serial_number`

## Payloads D'Exemple

### Creer une categorie

```json
{
  "name": "IT Equipment"
}
```

### Creer un actif

```json
{
  "inventory_code": "AST-001",
  "name": "Dell Latitude 5440",
  "brand": "Dell",
  "model": "Latitude 5440",
  "serial_number": "SN-0001",
  "category_id": "11111111-1111-1111-1111-111111111111",
  "status_id": "22222222-2222-2222-2222-222222222222"
}
```

### Enregistrer la finance d'un actif

```json
{
  "acquisition_date": "2026-03-24",
  "purchase_value": 1250,
  "estimated_life_years": 4,
  "residual_value": 150
}
```

### Creer une affectation

```json
{
  "employee_id": "33333333-3333-3333-3333-333333333333",
  "location_id": "44444444-4444-4444-4444-444444444444",
  "start_date": "2026-03-24"
}
```

### Creer une maintenance

```json
{
  "intervention_type_id": "55555555-5555-5555-5555-555555555555",
  "description": "Battery diagnostic and preventive maintenance",
  "intervention_cost": 35,
  "provider": "Internal IT"
}
```

## Regles Metier Importantes

Le module applique deja plusieurs regles utiles :

- `inventory_code` doit etre unique
- un `PATCH` vide est refuse
- `residual_value` ne peut pas depasser `purchase_value`
- une affectation ne peut pas chevaucher une autre affectation du meme actif
- un actif ne peut pas passer a `disposed` s'il a encore une affectation active
- un actif avec historique ne peut pas etre supprime

## Overview

Le module alimente `/api/overview` quand `assets` est actif dans le plan du tenant.

L'overview `assets` expose deja :

- total des actifs
- actifs assignes / non assignes
- taux d'utilisation
- taux de disponibilite
- actifs indisponibles
- cout de maintenance
- valeur d'achat et valeur residuelle
- distribution par statut, categorie et location
- tendance d'acquisition
- projection de depreciation
- distribution d'age
- derniers actifs ajoutes
- insights metier comme faible disponibilite ou maintenance trop couteuse

## Audit

Le module est audite a deux niveaux :

- audit global SaaS : dans la base globale
- audit metier tenant : dans la base du client

Pour `assets`, les mutations HTTP sont ecrites dans :

```text
tenant_audit_logs
```

Cela permet de savoir :

- quelle cle a fait l'action
- sur quelle route
- sur quel module
- avec quel resultat

## Observabilite

Le module beneficie du socle commun :

- `x-request-id`
- rate limit
- logs applicatifs
- `/health`
- `/metrics`
- `/observability`
- Swagger sur `/docs/`

## Provisioning Tenant

Quand une entreprise est approuvee :

- une base tenant dediee est creee
- le schema tenant est pousse
- les referentiels `assets` de base sont seedes

Pour resynchroniser les tenants existants :

```bash
pnpm run tenant:sync
```

Pour un tenant precis :

```bash
pnpm run tenant:sync -- --company <slug>
```

## Limites Actuelles

Le module est robuste pour une v1, mais il reste des pistes d'amelioration :

- audit detaille `before_data` / `after_data`
- gestion de garantie
- maintenance preventive planifiee
- assurance des actifs
- integration reelle avec `employees`, `finance` et `payroll`

## En Resume

Le module `assets` est aujourd'hui :

- le module metier le plus avance de Fluxo
- multi-tenant
- protege par abonnement et cle
- observable
- audite
- pagine
- documente
- pret pour une consommation v1 SaaS encadree
