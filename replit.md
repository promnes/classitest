# Classify — Kids Educational & Parental Control Platform

## Overview
Classify is an Arabic-first educational platform that helps parents manage their children through tasks, games, rewards, and a growth tree system. It features a complete multi-role architecture (Parent, Child, Admin, School, Teacher, Library) with a unified store and task marketplace.

**Domain:** classi-fy.com | **Repo:** github.com/promnes/classitest.git | **Branch:** main

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 6 + Tailwind CSS + shadcn/ui |
| Backend | Express.js 4.22 + TypeScript (ESM) |
| Database | PostgreSQL 15 + Drizzle ORM 0.39 (132 tables, 64 indexes) |
| Auth | JWT (30d) + bcrypt + OTP 2FA (email/SMS) + trusted devices |
| State | @tanstack/react-query 5.60 |
| Routing | wouter 3.3 (client), Express (server) |
| i18n | i18next 25.6 (Arabic/English/Portuguese, ~3053 keys each) |
| Mobile | Capacitor v7 (Android + iOS) + PWA |
| Payments | Stripe |
| Email | Resend (primary) + SMTP/Nodemailer (fallback) |
| Storage | MinIO (S3 compat) with local fallback |
| Deployment | Docker multi-stage, 12 services (Traefik SSL, PostgreSQL, Redis, MinIO, monitoring) |

## Project Structure
```
├── client/                     # React Frontend
│   ├── src/
│   │   ├── App.tsx             # 50 routes, lazy loading, wouter
│   │   ├── components/
│   │   │   ├── admin/          # 32 admin tab components
│   │   │   ├── child/          # Child-specific components
│   │   │   ├── dashboard/      # Dashboard widgets
│   │   │   ├── ui/             # shadcn/ui primitives
│   │   │   └── ...
│   │   ├── pages/              # 50 page files
│   │   ├── hooks/api/          # Data fetching hooks
│   │   ├── lib/
│   │   │   ├── apiClient.ts    # Centralized fetch + auto auth tokens
│   │   │   └── queryClient.ts  # React Query config
│   │   ├── contexts/           # ThemeContext
│   │   └── i18n/
│   │       ├── config.ts       # Lazy-loading backend, ar/en/pt
│   │       └── locales/        # ar.json, en.json, pt.json
│   └── public/                 # PWA assets, manifest, sw.js
├── server/                     # Express Backend
│   ├── index.ts                # Express setup (352 lines): Helmet, CORS, cluster, cache
│   ├── routes/
│   │   ├── index.ts            # Registers all 24 route groups
│   │   ├── admin.ts            # 5852 lines — Admin CRUD
│   │   ├── auth.ts             # 3022 lines — Login, OTP, 2FA, social
│   │   ├── parent.ts           # 3311 lines — Parent features
│   │   ├── child.ts            # 2706 lines — Child features
│   │   ├── school.ts           # 1713 lines — School dashboard
│   │   ├── teacher.ts          # 1405 lines — Teacher tasks/earnings
│   │   ├── library.ts          # 1209 lines — Library store/earnings
│   │   ├── marketplace.ts      # 1138 lines — Task marketplace
│   │   └── ... (24 files, ~25,000 lines total)
│   ├── services/               # Upload, OTP, Points, Notifications, Push
│   ├── middleware/              # Admin role check
│   ├── storage.ts              # DB connection (pg Pool + Drizzle)
│   ├── vite.ts                 # Dev: Vite middleware | Prod: static serving
│   └── mailer.ts               # Resend + SMTP fallback, OTP templates
├── shared/                     # Shared between client & server
│   ├── schema.ts               # 2131 lines — ALL 132 pgTable definitions
│   ├── types.ts                # Core type exports
│   └── constants.ts            # APP_CONFIG, AUTH_CONFIG, PAGINATION, POINTS
├── scripts/                    # Deploy, admin setup, repair scripts
├── migrations/                 # Drizzle SQL migrations
├── android/ & ios/             # Capacitor native projects
├── Dockerfile                  # Multi-stage (deps → builder → runner)
└── docker-compose.yml          # 12 services (Traefik, app, db, redis, minio, monitoring)
```

## Running the Project
```bash
npm run dev          # Development server (port 5000, hot-reload)
npm run build        # Production build (vite + esbuild → dist/)
npm run start        # Production runtime: node dist/index.js
npm run db:push      # Apply schema changes to PostgreSQL
npm run admin:setup  # Create/reset admin account
npm run check        # TypeScript type check (tsc --noEmit)
npm run test         # Run tests (vitest)
```

## Required Environment Variables
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key (64+ chars) |
| `SESSION_SECRET` | Session signing key (64+ chars) |
| `ADMIN_EMAIL` | Default admin email |
| `ADMIN_PASSWORD` | Default admin password |
| `RESEND_API_KEY` | Resend email service (optional: SMTP fallback) |

See `.env.example` for all optional variables (SMTP, Twilio SMS, MinIO, CORS, clustering).

## Deployment (Production VPS — Hostinger)
```bash
# Quick deploy
cd /docker/classitest && git pull origin main && docker compose up -d --build app

# Verify
curl https://classi-fy.com/api/health
docker compose logs -f app
```

### Docker Services (12)
Traefik (SSL), app (Express), db (PostgreSQL 15.7), Redis 7.2, MinIO, Portainer, pgAdmin, Redis Commander, Prometheus, Grafana, Loki, Mailhog (dev)

## API Response Contract
```json
Success: { "success": true, "data": {}, "message": "Optional" }
Error:   { "success": false, "error": "ERROR_CODE", "message": "Human readable" }
```

## Key Features
- **Multi-role system**: Parent, Child, Admin, School, Teacher, Library — each with separate JWT auth
- **Task system**: Custom tasks, templates, scheduled, teacher marketplace, subject-based
- **Gamification**: Educational games, growth tree (8 stages), points/rewards
- **Commerce**: Store with wallet-based payments, library store, task marketplace (90/10 commission)
- **Admin panel**: 32 management tabs covering all aspects of the platform
- **i18n**: Full Arabic (RTL), English (LTR), Portuguese (LTR) — ~3053 leaf keys each
- **Social features**: School/teacher/library posts, comments, likes, follows, reviews
- **Security**: bcrypt, JWT, OTP 2FA, trusted devices, rate limiting, Helmet CSP

## For Complete Documentation
See `MEMORY_BANK_COMPLETE.md` for the exhaustive memory bank including all 132 database tables, full route map, page inventory, and deployment details.
