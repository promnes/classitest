# Phase 0 — Repository Intelligence Scan

- Backend entrypoint: server/index.ts (Express ESM). Boots registerRoutes(app), helmet + compression, CORS, static uploads. Raw-body bypass for Stripe webhook. Starts HTTP server on PORT/5000 with host 0.0.0.0 and reusePort (non-Windows).
- Dev middleware: server/vite.ts sets up Vite in middleware mode (hmr with existing HTTP server), mirrors API 404 contract, serves client/index.html with cache-busting query.
- Production static serving: serveStatic(app) from dist/public (process.cwd() based), immutable cache for hashed assets, SPA fallback to index.html excluding /api, /sw.js, /manifest.json. Logs contents and fails fast if dist/public missing.
- Frontend build output: vite.config.ts sets root=client, outDir=dist/public, assets under dist/public/assets with hashed names.
- Production runtime: node dist/index.js (per instructions; build produces dist/index.js via npm run build). Default port: 5000 unless PORT set.
- Docker: Multi-stage node:20-alpine; builder runs npm ci + npm run build; runner installs prod deps + drizzle tools, copies dist/, shared/, migrations/, entrypoint scripts; exposes 5000; healthcheck on http://localhost:5000/api/health.
- Orchestration: docker-compose.yml and docker-compose.http.yml with Traefik front, app service on 5000, Postgres 15.7, Redis 7.2. Traefik rules for classi-fy.com; healthchecks hitting /api/health.
- Static assets strategy: in production via Express static middleware; in dev via Vite middleware. SPA fallback excluded for /api, assets, sw/manifest.
