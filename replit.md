# APERIO

Autonomous Earth Intelligence Platform for disaster and environmental intelligence, risk assessment, and human-reviewed response planning.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
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

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Replit-managed Clerk handles sign-in; do not implement local password storage or fake authentication.
- Scenario data, model outputs, map overlays, and response actions are illustrative until real data services are connected.
- The user must be able to distinguish local demo records from live observations; never claim simulated outcomes are measured impacts.
- Response options require operator review and never contact agencies or trigger real-world operations.

## Product

APERIO connects disaster-area selection, geospatial evidence, risk assessment, response planning, verification, and continuous monitoring in one command-center experience. The workflow spans landslide, flood, wildfire, and deforestation scenarios and includes mapping, alerts, change comparison, region comparison, terrain inspection, risk simulation, relocation, resources, chat, and reporting.

## User preferences

- Keep the product professional and operational, not gaming-styled; use a light map-oriented interface with hazard colors reserved for risk and status.
- Do not use emojis in the application UI.

## Gotchas

- OpenStreetMap tiles require network access and attribution; illustrative overlays are not surveyed hazard boundaries.
- Offline state preserves local scenario records, but does not imply that maps, DEMs, or satellite imagery are cached.
- Clerk's frontend API proxy must be mounted before Express body-parsing middleware for production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
