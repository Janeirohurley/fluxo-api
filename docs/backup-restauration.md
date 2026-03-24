# Backup et restauration PostgreSQL

## Prerequis

- `DATABASE_URL` configuree
- `pg_dump` disponible dans le `PATH`
- `pg_restore` disponible dans le `PATH`

Alternative Windows :

- definir `PG_BIN_DIR`, par exemple `C:\Program Files\PostgreSQL\16\bin`
- ou laisser les scripts detecter automatiquement une installation PostgreSQL classique

## Backup

Commande par defaut :

```bash
pnpm db:backup
```

Cette commande cree un fichier `.dump` dans le dossier `backups/`.

Choisir un fichier cible :

```bash
pnpm db:backup -- --file backups/fluxo-prod.dump
```

## Restauration

Restaurer un dump :

```bash
pnpm db:restore -- --file backups/fluxo-prod.dump
```

La restauration utilise `pg_restore --clean --if-exists`, donc les objets existants sont recrees proprement.

## Recommandation production

- faire un backup avant chaque migration
- stocker les backups hors de la machine applicative
- tester periodiquement une restauration complete sur une base de preproduction
