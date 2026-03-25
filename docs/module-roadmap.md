# Module Roadmap

Cette feuille de route sert de procedure standard pour ajouter un nouveau module dans Fluxo sans casser l'existant.

Regle principale :
- tout ce qui est metier client va dans `prisma/tenant.schema.prisma`
- tout ce qui est SaaS global reste dans `prisma/schema.prisma`

## Ordre Exact A Suivre

### 1. Commencer Par Le Schema Tenant
Fichier :
- `prisma/tenant.schema.prisma`

A faire :
- ajouter les modeles Prisma du module
- ajouter les enums si necessaire
- ajouter les relations
- ajouter les `@unique`
- ajouter les `@@index`

Commandes :
```bash
pnpm run prisma:validate
pnpm run prisma:generate
```

Ne pas faire :
- ajouter le module metier dans `prisma/schema.prisma`

### 2. Ajouter Le Provisioning Tenant
Fichier :
- `src/shared/tenancy/tenant-provisioning.service.ts`

A faire :
- ajouter le seed des donnees de base du module
- ajouter les referentiels si le module en a
- verifier que le module est bien couvert au provisionnement initial
- verifier que `tenant:sync` le couvre aussi

### 3. Creer Le Dossier Du Module
Dossier :
- `src/modules/<module>/`

Fichiers a creer :
- `<module>.types.ts`
- `<module>.schema.ts`
- `<module>.repository.ts`
- `<module>.service.ts`
- `<module>.controller.ts`
- `<module>.routes.ts`
- `<module>.module.ts`
- `<module>.docs.ts`
- `README.md`

Ordre conseille :
1. `types`
2. `schema`
3. `repository`
4. `service`
5. `controller`
6. `routes`
7. `module`
8. `docs`
9. `README`

### 4. Faire Les Types
Fichier :
- `src/modules/<module>/<module>.types.ts`

A faire :
- types de sortie API
- types des listes
- types des relations

### 5. Faire La Validation
Fichier :
- `src/modules/<module>/<module>.schema.ts`

A faire :
- create schema
- update schema
- list query schema
- pagination query si le module liste des donnees

Regle :
- le front peut envoyer du `snake_case`
- le backend garde sa logique en `camelCase`

### 6. Faire Le Repository
Fichier :
- `src/modules/<module>/<module>.repository.ts`

A faire :
- utiliser `TenantPrismaClientLike`
- ecrire les requetes Prisma
- mapper Prisma vers les types API
- gerer les erreurs `404`, `409`, relations invalides

Regle :
- ne jamais utiliser le client Prisma global pour un module metier

### 7. Faire Le Service
Fichier :
- `src/modules/<module>/<module>.service.ts`

A faire :
- validations metier
- orchestration du repository
- regles d'integrite
- regles de transition d'etat
- blocage des cas incoherents

### 8. Faire Le Controller
Fichier :
- `src/modules/<module>/<module>.controller.ts`

A faire :
- lire les inputs HTTP
- appeler le service
- renvoyer la reponse

Regle :
- pas de logique metier lourde ici

### 9. Faire Les Routes
Fichier :
- `src/modules/<module>/<module>.routes.ts`

A faire :
- declarer les endpoints
- brancher le controller
- ajouter la route `/docs`

### 10. Assembler Le Module
Fichier :
- `src/modules/<module>/<module>.module.ts`

A faire :
- assembler repository + service + controller + routes
- brancher le tenant prisma
- exposer le module au reste de l'application

### 11. Monter Le Module Dans L'App
Fichiers :
- `src/modules/index.ts`
- `src/app/create-app.ts`

A faire :
- enregistrer le module
- definir son `basePath`
- le monter dans l'application

### 12. Ajouter Swagger
Fichier :
- `src/docs/openapi.ts`

A faire :
- ajouter les tags
- ajouter les schemas
- ajouter les routes
- ajouter les reponses paginees si besoin

### 13. Ajouter Le Module Au Catalogue SaaS
Fichier :
- `src/web/subscriptions/module-catalog.ts`

A faire :
- ajouter le module au catalogue
- le mettre en `coming_soon` au debut
- le passer a `available` seulement a la fin

Regle :
- ne jamais rendre un module souscriptible avant qu'il soit vraiment pret

### 14. Ajouter L'Overview Progressif
Fichiers :
- `src/overview/providers/<module>-overview.provider.ts`
- `src/overview/index.ts`

A faire :
- gerer `disabled`
- gerer `empty`
- gerer `ready`
- exposer les KPI v1
- ajouter des insights simples

### 15. Ajouter Les Tests
Fichiers a creer :
- `src/modules/<module>/<module>.schema.test.ts`
- `src/modules/<module>/<module>.service.test.ts`
- `src/modules/<module>/<module>.http.test.ts`

Commandes :
```bash
pnpm exec tsc -p tsconfig.json
pnpm test
```

### 16. Synchroniser Les Tenants Existants
Commande :
```bash
pnpm run tenant:sync
```

But :
- ajouter les nouvelles tables dans les bases des entreprises deja provisionnees

### 17. Ouvrir Le Module A La Souscription
Fichier :
- `src/web/subscriptions/module-catalog.ts`

A faire :
- passer `coming_soon` a `available`
- verifier le portail
- verifier l'admin
- verifier les cles d'acces

## Checklist Finale

Avant de dire qu'un module est pret :
- schema tenant ajoute
- `prisma:validate` OK
- `prisma:generate` OK
- provisioning tenant ajoute
- dossier module cree
- repository tenant-aware OK
- service OK
- routes OK
- swagger OK
- tests OK
- `tenant:sync` OK
- catalogue SaaS mis a jour

## Resume Ultra Court

Ordre a memoriser :
1. `prisma/tenant.schema.prisma`
2. `src/shared/tenancy/tenant-provisioning.service.ts`
3. `src/modules/<module>/...`
4. `src/modules/index.ts`
5. `src/app/create-app.ts`
6. `src/docs/openapi.ts`
7. `src/web/subscriptions/module-catalog.ts`
8. `src/overview/providers/...`
9. `tests`
10. `pnpm run tenant:sync`

## Ce Qu'il Faut Eviter

Ne pas faire :
- ajouter le module metier dans `prisma/schema.prisma`
- utiliser le client Prisma global dans un repository metier
- rendre le module `available` trop tot
- oublier Swagger
- oublier les tests
- oublier `tenant:sync`
