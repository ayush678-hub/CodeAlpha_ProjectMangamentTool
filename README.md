# Collabo — Team Project Management (CodeAlpha_ProjectMangamentTool)

Local development guide for the Collabo monorepo (API + Web).

## Requirements
- Node.js (18+)
- npm
- Docker & Docker Compose (for Postgres + Redis)

## Quick start

1. Install dependencies

```bash
npm install
```

2. Start PostgreSQL and Redis (dev)

```bash
docker compose -f docker-compose.dev.yml up -d
```

3. Create or copy environment files

Copy `.env.example` to the repo root and `apps/api/.env` if you need per-app overrides. Update secrets:

```env
DATABASE_URL=postgresql://collabo:collabo_pass@localhost:5432/collabo_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-should-be-changed
JWT_REFRESH_SECRET=dev-refresh-secret-should-be-changed
FRONTEND_URL=http://localhost:5174
VITE_API_URL=http://localhost:3001/api
```

4. Push Prisma schema and generate client (API)

```bash
cd apps/api
npx prisma db push --schema=prisma/schema.prisma
npx prisma generate --schema=prisma/schema.prisma
```

5. Run development servers (from repo root)

```bash
npm run dev
```

This runs the API on `http://localhost:3001/api` and the web app on `http://localhost:5174` (Vite).

## Useful scripts
- `npm run dev` — start both API and web for local development
- `npm run dev --workspace=apps/api` — start API only
- `npm run dev --workspace=apps/web` — start web only
- `npm run build` — build both projects

## Notes
- If you change ports, ensure `FRONTEND_URL` and Vite `server.port` match to avoid CORS issues.
- Email sending requires SMTP credentials; by default sends are skipped when not configured.
- If Prisma client generation fails on Windows due to locked engine files, try closing Node processes, removing `node_modules/.prisma/client/query_engine-windows.dll.node`, then re-run `npx prisma generate`.

## Repository
Pushed to: https://github.com/ayush678-hub/CodeAlpha_ProjectMangamentTool

---
If you'd like a more detailed README (architecture, env descriptions, CI), tell me which sections to expand.
