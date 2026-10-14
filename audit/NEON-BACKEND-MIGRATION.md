# X4Kiss backend migration — Neon + ElasticLake

This branch adds a PostgreSQL-compatible runtime adapter while preserving the existing Worker handler and ElasticLake storage adapter.

## Current state
- Neon project provisioned: `x4kiss-backend-replacement`.
- New database schema is in `migrations/postgres/0001_x4kiss_baseline.sql`.
- `server.mjs` uses `DATABASE_URL` to attach PostgreSQL bindings to the existing handler.
- ElasticLake configuration remains environment-driven and is not replaced.
- Cloudflare is not removed from the live deployment by this branch. Do not switch DNS or delete the old Worker until acceptance tests pass.

## Required environment variables on the new Node host
- `DATABASE_URL`: Neon connection string (store as a secret; never commit it).
- `ELASTICLAKE_ENDPOINT`, `ELASTICLAKE_REGION`, `ELASTICLAKE_BUCKET`, plus the existing ElasticLake access credentials used by `storage/elasticlake-adapter.js`.
- All required provider secrets currently used by the app, entered through the host's secret manager only.

## Apply schema
Apply `migrations/postgres/0001_x4kiss_baseline.sql` to the new, empty Neon database. It creates the account/session/MFA/audit/video-index tables only; it does not copy old production records.

## Deployment gate
1. Install dependencies and run `npm test`.
2. Apply schema and set secrets on a new Node host.
3. Test health, register/login/me/logout, session revocation, MFA, admin authorization, creator-video metadata, ElasticLake write/read/delete, and safety fail-closed behavior.
4. Compare response contracts and browser CORS behavior.
5. Only after evidence passes: migrate any required existing records with a verified export/import, switch the frontend API origin, then retire the old Worker/D1/KV resources.
