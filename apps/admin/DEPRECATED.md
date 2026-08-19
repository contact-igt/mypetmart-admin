# Deprecated — not the production Admin app

This app (`mypetmart-admin/apps/admin`, package `@mypetmart/admin`) is a
frozen early-stage scaffold. It runs entirely on an in-memory mock
repository (`src/data/admin/mock-repository.ts`), has no real
authentication, and has no Refund or Replacement feature at all.

**The authoritative Admin application is at the repo root:
`mypetmart-admin/` (its Next.js app lives under `mypetmart-admin/src/`).**
It has real JWT auth (`/admin/login`), real backend API bindings for every
module including Returns/Refunds/Replacement, and is what
`pnpm dev:admin` / `pnpm build:admin` / `pnpm lint:admin` /
`pnpm typecheck:admin` now run.

This app is kept only for reference and is no longer wired to the default
`:admin` scripts. To run it explicitly (not recommended):

```bash
pnpm dev:admin-legacy
pnpm build:admin-legacy
```

Do not add new features here. Do not point deployments at this app.
