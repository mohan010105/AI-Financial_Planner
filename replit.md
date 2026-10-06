# SYNOVATE

AI-powered personal financial planning and decision-support app foundation. Phase 1 includes a responsive UI shell, module status endpoints, and an identity-ready PostgreSQL schema.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db exec drizzle-kit generate --config ./drizzle.config.ts` — generate a SQL migration from schema changes
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/synovate` — React/Vite application and placeholder pages
- `artifacts/api-server` — shared Express API and module status routes
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema` — Drizzle PostgreSQL schema for users and profiles

## Architecture decisions

- Phase 1 auth and financial feature routes expose availability only; they do not accept or persist user or financial data.
- User identity is modeled as an external provider + subject pair, not a local password; configure an auth provider before implementing sign-in.
- Drizzle uses PostgreSQL through `DATABASE_URL`, so a compatible PostgreSQL provider such as Supabase can be selected by changing connection configuration rather than rewriting app data models.

## Product

SYNOVATE is a personal finance planning interface. The current dashboard values are illustrative only; calculations, recommendations, AI assistance, and real financial records are not part of Phase 1.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
