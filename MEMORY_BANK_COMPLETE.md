# 🧠 CLASSIFY — COMPREHENSIVE AI AGENT MEMORY BANK
**Last Updated:** 2026-02-18
**Status:** ACTIVE — READ THIS FIRST BEFORE ANY WORK
**Commit:** `355479a` on `main`

---

## 📌 PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Name** | Classify — Kids Educational & Parental Control Platform |
| **Domain** | classi-fy.com |
| **Stack** | Express.js + React 18 + Vite 6 + PostgreSQL 15 + Drizzle ORM |
| **Language** | TypeScript (strict mode), Arabic-first UI (RTL) |
| **Runtime** | Node 20 (Alpine Docker), Port 5000 |
| **Repo** | github.com/promnes/classitest.git, branch: `main` |
| **Package Type** | ESM (`"type": "module"` in package.json) |
| **i18n** | Arabic (ar, default/fallback), English (en), Portuguese (pt) |
| **Mobile** | Capacitor v7 (Android + iOS) + PWA |

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌──────────────────────────────────────────────────────┐
│                   Traefik v2.11                      │
│          (SSL Let's Encrypt, HTTP→HTTPS, LB)         │
├──────────────────────────────────────────────────────┤
│          Express.js Server (port 5000)               │
│  ┌──────────────┬─────────────────────────────┐      │
│  │  API Routes   │  Static Assets (SPA)        │      │
│  │  /api/*       │  dist/public/*              │      │
│  │  /objects/*   │  SPA fallback → index.html  │      │
│  └──────────────┴─────────────────────────────┘      │
├──────────┬──────────┬──────────────┬─────────────────┤
│ Postgres │   Redis  │    MinIO     │   Monitoring    │
│  15.7    │   7.2    │ (S3 compat) │  Prom+Grafana   │
└──────────┴──────────┴──────────────┴─────────────────┘
```

### Build Pipeline
```bash
# Development (tsx hot-reload)
npm run dev   # → dotenv -v NODE_ENV=development -- tsx server/index.ts

# Production build
npm run build # → vite build + esbuild server/index.ts → dist/

# Production runtime
NODE_ENV=production node dist/index.js
```

| Step | Tool | Input | Output |
|------|------|-------|--------|
| Frontend | `vite build` | `client/` | `dist/public/` (code-split, hashed assets) |
| Backend | `esbuild` | `server/index.ts` | `dist/index.js` (ESM, node platform, external packages) |
| DB Migrate | `drizzle-kit push` | `shared/schema.ts` | PostgreSQL DDL |

### Key Config Files
| File | Purpose |
|------|---------|
| `vite.config.ts` | Aliases: `@/` → client/src, `@shared/` → shared/, `@assets/` → attached_assets/. ManualChunks for Radix/vendor/charts/i18n |
| `tsconfig.json` | strict, ES2020 target, bundler moduleResolution, paths: `@/*`, `@shared/*` |
| `drizzle.config.ts` | PostgreSQL dialect, schema: `shared/schema.ts`, out: `migrations/` |
| `package.json` | type: "module", 80+ deps, scripts documented below |
| `capacitor.config.json` | Android/iOS native app config |

---

## 📊 DATABASE SCHEMA (shared/schema.ts — 2131 lines, 132 pgTable definitions)

### Core Entity Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `parents` | Parent users | email, password, name, uniqueCode, twoFAEnabled, avatarUrl, coverImageUrl, socialLinks, smsVerified |
| `children` | Child users | name, totalPoints, avatarUrl, pin, birthday, schoolName, governorate |
| `parentChild` | Parent↔Child link | parentId, childId (CASCADE delete, UNIQUE constraint) |
| `admins` | Admin users | username, email, password, role |
| `schools` | School entities | name, username, password, referralCode, imageUrl, coverImageUrl, socialLinks |
| `schoolTeachers` | Teachers (under schools) | schoolId, name, username, password, subject, avatarUrl, socialLinks |
| `libraries` | Library merchants | name, username, password, referralCode, bio, coverImageUrl |

### Settings Tables (8)
| Table | Purpose |
|-------|---------|
| `appSettings` | Key-value app config |
| `rewardsSettings` | Points per task, daily limits |
| `tasksSettings` | Max tasks/day, custom tasks toggle |
| `storeSettings` | Store enabled, min points to buy |
| `notificationSettings` | Push/email toggles |
| `paymentSettings` | Payment enabled, gateway |
| `taskNotificationGlobalPolicy` | Notification levels, quiet hours, channels |
| `taskNotificationChildPolicy` | Per-child notification overrides |

### Task System (6)
| Table | Purpose |
|-------|---------|
| `tasks` | Parent→Child tasks (question, answers JSON, pointsReward, status) |
| `taskResults` | Child task answers (isCorrect, pointsEarned) |
| `templateTasks` | Reusable task templates (admin/parent created) |
| `teacherTasks` | Teacher-created tasks for marketplace (price, purchaseCount) |
| `scheduledTasks` | Future-scheduled tasks |
| `taskAttemptsSummary` | Composite PK (taskId, childId), attempt counts |

### Commerce & Payments (~15)
| Table | Purpose |
|-------|---------|
| `products` | Store products (pointsPrice, price, productType) |
| `productCategories` | Product categories |
| `storeOrders` | Parent orders (PENDING→PAID→FAILED) |
| `orderItems` | Order line items |
| `transactions` | Payment transactions (Stripe) |
| `webhookEvents` | Stripe webhook dedup |
| `wallets` | Parent wallets (balance, currency) |
| `walletTransfers` | Wallet ledger (DEPOSIT/REFUND/SPEND) |
| `entitlements` | Owned products (ACTIVE/ASSIGNED_AS_GIFT/EXPIRED) |
| `parentPurchases` / `childPurchases` | Purchase records |
| `priceTiers` | Multi-currency pricing |
| `profitTransactions` | 90% seller / 10% app commission tracking |

### Gift System (3)
| Table | Purpose |
|-------|---------|
| `gifts` | Parent→Child gifts (pointsThreshold, SENT→UNLOCKED→ACTIVATED) |
| `childGifts` | Legacy gifts table |
| `childEvents` | Child events (GIFT_ASSIGNED, TASK_ASSIGNED, etc.) |

### Media & Upload System (3)
| Table | Purpose |
|-------|---------|
| `media` | Uploaded files (objectKey, url, mimeType, size, scanStatus, purgeAt) |
| `mediaReferences` | Entity↔Media links (entityType, entityId, field) |
| `mediaEvents` | Audit trail (FINALIZED, DELETED, etc.) |

### Notification System (7)
| Table | Purpose |
|-------|---------|
| `notifications` | Child notifications (type, style: toast/modal/banner, priority, soundAlert) |
| `parentNotifications` | Parent notifications |
| `broadcastNotifications` | Admin→All notifications |
| `childPushSubscriptions` | Web/Mobile push tokens |
| `taskNotificationDeliveryAttempts` | Push delivery tracking |

### Auth & Security (~12)
| Table | Purpose |
|-------|---------|
| `otpCodes` | OTP codes (purpose, method, expiresAt, attempts) |
| `otpRequestLogs` | Rate-limit tracking |
| `otpProviders` | Admin-managed OTP providers (email/SMS) |
| `trustedDevicesParent` / `trustedDevicesChild` | Device trust (skip 2FA) |
| `childTrustedDevices` | Child device refresh tokens |
| `sessions` | Active parent sessions |
| `loginHistory` | Login audit log |
| `socialLoginProviders` | Social login config (Google, Facebook, Apple) |
| `parentSocialIdentities` | Linked social accounts |
| `childLoginRequests` | Child login approval flow |

### Schools & Teachers Extended (~12)
| Table | Purpose |
|-------|---------|
| `schoolPosts` / `schoolPostComments` / `schoolPostLikes` | School social feed |
| `schoolReviews` / `teacherReviews` | Rating system |
| `teacherTaskOrders` | Teacher task purchases |
| `teacherBalances` / `teacherWithdrawalRequests` | Teacher earnings |
| `teacherHiring` | Parent hires teacher for child |
| `childSchoolAssignment` / `childTeacherAssignment` | Child↔School/Teacher links |

### Library Extended (~7)
| Table | Purpose |
|-------|---------|
| `libraryProducts` | Library store products |
| `libraryOrders` | Library orders with commission tracking |
| `libraryBalances` | Library earnings/withdrawals |
| `libraryPosts` / `libraryPostComments` / `libraryPostLikes` | Library social feed |
| `libraryReviews` | Library ratings |

### Other Important Tables
| Table | Purpose |
|-------|---------|
| `siteSettings` | Site-level settings |
| `seoSettings` | SEO meta tags, robots, analytics IDs |
| `supportSettings` | Support contact info, maintenance mode |
| `themeSettings` | Primary/secondary/accent colors |
| `symbols` | Symbol library (emoji/image) |
| `subjects` | Academic subjects |
| `flashGames` | Educational games (embedUrl, pointsPerPlay) |
| `childGrowthTrees` | Gamification growth tree (8 stages) |
| `childActivityStatus` | Online/offline tracking |
| `ads` / `childAds` / `parentAds` | Advertisement system |
| `referrals` / `parentReferralCodes` | Referral system |
| `follows` | Follow system (school/teacher/library) |
| `parentTaskLibrary` / `taskFavorites` | Task library & favorites |
| `pointsHistory` / `pointsLedger` | Points tracking |

### Database Performance
- **64 indexes** for high-performance queries (5000+ concurrent users)
- Connection pool: configurable (default max=50, min=5)
- Idle timeout: 30s, Connect timeout: 10s

---

## 🔌 API ROUTES (server/routes/ — 24 files, ~25,000 lines total)

### Route Registration (server/routes/index.ts)
```
registerAuthRoutes          → /api/auth/*
registerAdminRoutes         → /api/admin/*
registerAdminSettingsRoutes → /api/admin/settings/*
registerActivityLogRoutes   → /api/admin/activity/*
registerAnalyticsRoutes     → /api/admin/analytics/*
registerGiftManagementRoutes → /api/admin/gifts/*
registerNotificationSettingsRoutes → /api/admin/notification-settings/*
registerAdminTaskNotificationRoutes → /api/admin/task-notification/*
registerParentRoutes        → /api/parent/*
registerChildRoutes         → /api/child/*
registerPaymentRoutes       → /api/payments/*
registerStoreRoutes         → /api/store/*
registerReferralRoutes      → /api/referrals/*
registerLibraryRoutes       → /api/library/*
registerSchoolRoutes        → /api/school/*
registerTeacherRoutes       → /api/teacher/*
registerFollowRoutes        → /api/follow/*
registerMarketplaceRoutes   → /api/marketplace/*
registerObjectStorageRoutes → /objects/* (file serving)
registerMediaUploadRoutes   → /api/uploads/* (presign/finalize/direct)
trustedDevicesRouter        → /api/trusted-devices/*
adsRouter                   → /api/ads/*
parentLinkingRouter         → /api/parent-linking/*
```

### Route Files by Size
| File | Lines | Purpose |
|------|-------|---------|
| `admin.ts` | 5852 | Admin dashboard, user management, all CRUD |
| `parent.ts` | 3311 | Parent CRUD, children, tasks, notifications, profile |
| `auth.ts` | 3022 | Login, register, OTP, 2FA, social login, forgot password |
| `child.ts` | 2706 | Child data, tasks, games, progress, store |
| `school.ts` | 1713 | School CRUD, teachers, students, posts, reviews |
| `teacher.ts` | 1405 | Teacher tasks, profile, earnings, withdrawals |
| `library.ts` | 1209 | Library products, orders, earnings, posts |
| `marketplace.ts` | 1138 | Task marketplace, search, recommendations |
| `store.ts` | 790 | Product CRUD, cart, orders |
| `ads.ts` | 498 | Ad serving and click tracking |
| `admin.settings.ts` | 422 | Admin settings management |
| `parent-linking.ts` | 398 | Parent-child linking via QR/code |
| `trusted-devices.ts` | 397 | Device trust management |
| `follow.ts` | 377 | Follow/unfollow schools/teachers/libraries |
| `referrals.ts` | 371 | Referral system |
| `media-uploads.ts` | 321 | Presign, finalize, direct upload |
| `admin-notification-settings.ts` | 311 | Notification config |
| `admin-analytics.ts` | 288 | Analytics endpoints |
| `admin-task-notification-settings.ts` | 280 | Task notification config |
| `payments.ts` | 236 | Stripe checkout, webhooks, wallets |
| `admin-activity.ts` | 175 | Activity log |
| `admin-gifts.ts` | 162 | Gift management |

### API Response Contract (IMMUTABLE)
```json
Success: { "success": true, "data": {}, "message": "Optional" }
Error:   { "success": false, "error": "ERROR_CODE", "message": "Human readable" }
```

### Common Error Codes
`NOT_FOUND`, `UNAUTHORIZED`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`, `PARENT_CHILD_MISMATCH`, `OTP_EXPIRED`, `RATE_LIMITED`, `FORBIDDEN`

---

## 🖼️ MEDIA UPLOAD PIPELINE

### Flow: presign → upload → finalize
1. **Presign:** `POST /api/{entity}/uploads/presign` → `{ uploadURL, objectPath, metadata }`
2. **Upload:** PUT file to `uploadURL` (local: `/api/uploads/direct/{id}`, remote: MinIO presigned)
3. **Finalize:** `POST /api/{entity}/uploads/finalize` → media record in DB
4. **Serve:** `GET /objects/*` → resolves to local file or MinIO stream

### Local Storage Fallback
- When MinIO unavailable: `__local__://{uuid}` sentinel → `/api/uploads/direct/{uuid}`
- Files saved to `LOCAL_UPLOAD_DIR/uploads/{uuid}` (default: `./uploads`)
- DB stores `url = /objects/uploads/{uuid}`

---

## 🌐 FRONTEND ARCHITECTURE

### Client Structure (client/src/)
```
App.tsx              — Routes (wouter), Providers, Lazy loading
main.tsx             — React root + i18n init
index.css            — Tailwind CSS
lib/
  apiClient.ts       — Centralized fetch with auto auth token selection
  queryClient.ts     — React Query config, apiRequest(), authenticatedFetch()
  utils.ts           — cn() utility (clsx + tailwind-merge)
hooks/
  api/               — useParentData, useChildData, useNotifications
  use-upload.ts      — Upload hook
  useAutoLogin.ts    — Auto-login from stored tokens
  useChildAuth.ts    — Child auth hook
  useSMSOTP.ts       — SMS OTP hook
  useSEO.tsx         — SEO meta hook
contexts/
  ThemeContext.tsx    — Dark/light theme (localStorage)
i18n/
  config.ts          — i18next lazy-loading backend (ar/en/pt)
  locales/ar.json    — Arabic (~3053 leaf keys)
  locales/en.json    — English (~3053 leaf keys)
  locales/pt.json    — Portuguese (~2979 leaf keys)
components/
  ui/                — shadcn/ui primitives (Button, Dialog, Card, etc.)
  admin/             — 32 admin tab components
  child/             — Child-specific components
  dashboard/         — Dashboard widgets
  parent/            — Parent-specific components
  forms/             — Form components
  notifications/     — Notification components
```

### Client Pages (50 pages)
**Parent (16):** Home, ParentAuth, ParentDashboard, ParentDashboardPro, ParentStore, ParentStoreMulti, ParentInventory, ParentTasks, ParentProfile, Wallet, Settings, SettingsPro, Notifications, Subjects, SubjectTasks, AssignTask
**Child (10):** ChildLink, ChildGames, ChildGifts, ChildNotifications, ChildProfile, ChildProgress, ChildRewards, ChildSettings, ChildStore, ChildTasks
**Admin (3):** AdminAuth, AdminDashboard, AdminPurchasesTab
**School (3):** SchoolLogin, SchoolDashboard, SchoolProfile
**Teacher (3):** TeacherLogin, TeacherDashboard, TeacherProfile
**Library (4):** LibraryLogin, LibraryDashboard, LibraryStore, LibraryProfile
**Marketplace (2):** TaskMarketplace, TaskCart
**Other (9):** ForgotPassword, OTPVerification, CreateTask, DownloadApp, Privacy, PrivacyPolicy, AccessibilityPolicy, Terms, NotFound

### Page Sizes (Top 20)
| Page | Lines |
|------|-------|
| SchoolDashboard.tsx | 2360 |
| ParentDashboard.tsx | 2067 |
| TeacherDashboard.tsx | 1934 |
| ParentStore.tsx | 1289 |
| LibraryDashboard.tsx | 1205 |
| SchoolProfile.tsx | 1202 |
| ChildLink.tsx | 940 |
| ChildStore.tsx | 910 |
| LibraryStore.tsx | 853 |
| ParentTasks.tsx | 841 |
| Settings.tsx | 692 |
| TeacherProfile.tsx | 675 |
| ParentProfile.tsx | 606 |
| SettingsPro.tsx | 572 |
| SubjectTasks.tsx | 526 |
| ChildProfile.tsx | 467 |
| Wallet.tsx | 456 |
| ChildSettings.tsx | 450 |
| ChildGames.tsx | 436 |
| ParentAuth.tsx | 419 |

### Admin Dashboard Tabs (32 components in client/src/components/admin/)
ActivityLogTab, AdsTab, CategoriesTab, ChildGameManager, DashboardTab, DepositsTab, GamesTab, GiftsTab, LegalTab, LibrariesTab, MobileAppSettingsTab, NotificationSettingsTab, NotificationsTab, OrdersTab, OTPProvidersTab, ParentsTab, PaymentMethodsTab, ProductsTab, ProfitSystemTab, ReferralsTab, SchoolsTab, SeoSettingsTab, SettingsTab, SocialLoginTab, SubjectsTab, SupportSettingsTab, SymbolsTab, TaskNotificationLevelsTab, TasksTab, UsersTab, WalletAnalytics, WalletsTab

### Auth Token Strategy
| Token | Storage | Auto-selected for |
|-------|---------|-------------------|
| Parent JWT | `localStorage.token` | `/api/parent/*`, `/api/store/*`, default |
| Child JWT | `localStorage.childToken` | `/api/child/*` |
| Admin JWT | `localStorage.adminToken` | `/api/admin/*` |
| Library JWT | separate | `/api/library/*` |
| School JWT | separate | `/api/school/*` |
| Teacher JWT | separate | `/api/teacher/*` |

### Routing (wouter)
All routes defined in `App.tsx` Router component with lazy loading and ErrorBoundary wrapping. Key routes:
```
/                       → Home
/parent-auth            → ParentAuth (login/register)
/parent-dashboard       → ParentDashboard
/child-link             → ChildLink
/child-games            → ChildGames (ChildAppWrapper)
/child-store            → ChildStore (ChildAppWrapper)
/school/login           → SchoolLogin
/school/dashboard       → SchoolDashboard
/teacher/login          → TeacherLogin
/teacher/dashboard      → TeacherDashboard
/library/login          → LibraryLogin
/library/dashboard      → LibraryDashboard
/library-store          → LibraryStore
/admin                  → AdminAuth
/admin-dashboard        → AdminDashboard
/task-marketplace       → TaskMarketplace
/task-cart              → TaskCart
/parent-profile         → ParentProfile
/wallet                 → Wallet
/settings               → Settings
```

---

## 🌍 i18n SYSTEM

### Architecture
- **i18next** with custom lazy-loading backend (only active language loaded)
- Config: `client/src/i18n/config.ts`
- Fallback: Arabic (ar), Detection: localStorage → navigator
- RTL/LTR auto-switch on language change via `document.documentElement.dir`

### Translation Coverage (as of 2026-02-18)
| Language | Sections | Leaf Keys |
|----------|----------|-----------|
| Arabic (ar) | 225 | ~3053 |
| English (en) | 225 | ~3053 |
| Portuguese (pt) | 225 | ~2979 |

### Key Sections
`common`, `auth`, `admin` (24 nested sub-sections), `parentDashboard`, `childDashboard`, `wallet`, `parentStore`, `childStore`, `libraryDashboard`, `libraryStore`, `schoolDashboard`, `teacherDashboard`, `settings`, `settingsPro`, `notifications`, `tasks`, `games`, `gifts`, `subjects`, `profile`, `taskMarketplace`, `taskCart`, plus 200+ granular sections

---

## 🔐 SECURITY

### Authentication Flow
1. Register → bcrypt hash (10 rounds) → Create parent → Auto-login
2. Login → Email lookup → Password compare → Check 2FA
3. If 2FA enabled: Generate 6-digit OTP → Email/SMS → Verify → JWT
4. If 2FA disabled: Direct JWT generation
5. JWT: 30d expiry, Trusted device: 45d

### Security Rules
- Child tokens: **read / ack only** (no write permissions)
- Parent-child ownership validated before ALL child operations
- Rate limiting: 5 OTP/hour, standard on login/register per IP
- Helmet CSP configured (script-src self+unsafe-inline, img-src self+data+blob+GCS)
- CORS: configurable via `CORS_ORIGIN` (comma-separated allowlist, default: *)
- Trust proxy: 1 (for Traefik/Nginx)
- Stripe webhook: raw body for signature verification
- No secrets in logs or responses
- Failed login lockout: 5 attempts → 15 min lock

---

## 🚀 DEPLOYMENT

### Docker Compose Stack (12 services)
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `traefik` | traefik:v2.11 | 80, 443 | Reverse proxy, SSL |
| `app` | classify-app:latest | 5000 | Express + React SPA |
| `db` | postgres:15.7-alpine | 5432 (local 5433) | PostgreSQL |
| `redis` | redis:7.2-alpine | 6379 | Sessions, cache, rate-limit |
| `minio` | minio:latest | 9000, 9001 | Object storage (S3 compat) |
| `portainer` | portainer-ce | 9000 | Docker management UI |
| `pgadmin` | pgadmin4 | 5050 | Database admin UI |
| `redis-commander` | redis-commander | 8081 | Redis admin UI |
| `prometheus` | prometheus | 9090 | Metrics collection |
| `grafana` | grafana | 3000 | Metrics dashboards |
| `loki` | loki:3.0.0 | 3100 | Log aggregation |
| `mailhog` | mailhog | 1025, 8025 | Dev email testing |

### Dockerfile (Multi-stage)
1. `deps` — npm ci (cached on package.json change)
2. `builder` — vite build + esbuild
3. `runner` — node:20-alpine, non-root user (appuser:1001), production deps + drizzle-kit + tsx

### Deploy Commands (Production VPS)
```bash
cd /docker/classitest
git pull origin main
docker compose up -d --build app
docker compose logs -f app
```

### Health Check
```bash
curl http://localhost:5000/api/health  # → {"status":"ok"}
```

---

## 📦 SERVICES MAP

### Server Services (server/services/)
| Service | Purpose |
|---------|---------|
| `uploadService.ts` (332 lines) | Presign, finalize, media CRUD |
| `otpService.ts` | OTP generation, verification, rate-limiting |
| `pointsService.ts` | Points granting, deduction, ledger |
| `notificationOrchestrator.ts` | Centralized notification dispatch |
| `notificationBus.ts` | Event bus for notifications |
| `webPushService.ts` | Web push delivery |
| `mobilePushService.ts` | Mobile push delivery |
| `taskNotificationWorker.ts` | Background task notification processing |
| `mediaWorker.ts` | Background media cleanup/purge |

### Server Other
| File | Purpose |
|------|---------|
| `server/mailer.ts` (184 lines) | Email: Resend primary, SMTP/Nodemailer fallback, OTP HTML templates |
| `server/sms-otp.ts` | Twilio SMS OTP |
| `server/notificationHandlers.ts` | Gift event → notification handlers |
| `server/giftEvents.ts` / `giftUnlock.ts` | Gift event emitter + unlock logic |
| `server/middleware/adminRole.ts` | Admin role verification |
| `server/providers/otp/bootstrap.ts` | OTP provider initialization |
| `server/replit_integrations/object_storage/` | Object storage abstraction (local + MinIO) |

### External Integrations
| Provider | Purpose | Config Key |
|----------|---------|------------|
| Stripe | Payments | `STRIPE_SECRET_KEY` |
| Resend | Email (primary) | `RESEND_API_KEY` |
| Nodemailer/SMTP | Email (fallback) | `SMTP_HOST/PORT/USER/PASSWORD` |
| Twilio | SMS | `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER` |
| Google/Facebook/Apple | Social login | OAuth2 config |
| MinIO | Object storage | `MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET` |

---

## 📋 ENVIRONMENT VARIABLES

### Required (server fails without these)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key (64+ chars) |
| `SESSION_SECRET` | Session signing key (64+ chars) |
| `ADMIN_EMAIL` | Default admin email |
| `ADMIN_PASSWORD` | Default admin password |

### Optional
| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 5000 | Server port |
| `HOST` | 0.0.0.0 | Bind address |
| `NODE_ENV` | unset | development/production |
| `CORS_ORIGIN` | * | Allowed origins (comma-separated) |
| `RESEND_API_KEY` | - | Resend email service |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM` | - | SMTP fallback |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER` | - | SMS OTP |
| `NODE_CLUSTER_ENABLED` | true (prod) | Enable clustering |
| `WEB_CONCURRENCY` | min(cpus, 4) | Worker count |
| `DB_POOL_MAX/MIN` | 50/5 | Connection pool |
| `OBJECT_STORAGE_PROVIDER` | local | local/s3 |
| `MINIO_*` | - | MinIO S3-compat config |
| `LOG_LEVEL` | info | Logging level |
| `ADMIN_PANEL_PASSWORD` | - | Extra admin panel security |
| `ADMIN_CREATION_SECRET` | - | Admin creation API secret |

---

## 📁 COMPLETE FILE MAP

### Root Files
| File | Lines | Purpose |
|------|-------|---------|
| `package.json` | 175 | Dependencies (80+ deps), scripts, config |
| `vite.config.ts` | 80 | Vite build + dev config |
| `tsconfig.json` | 38 | TypeScript strict config |
| `drizzle.config.ts` | 15 | Drizzle ORM config |
| `Dockerfile` | 109 | Multi-stage Docker build |
| `docker-compose.yml` | 486 | Full stack (12 services) |
| `docker-compose.http.yml` | ~50 | HTTP-only quick start |
| `capacitor.config.json` | - | Mobile app config |
| `tailwind.config.ts` | - | Tailwind CSS config |
| `postcss.config.js` | - | PostCSS config |
| `vitest.config.ts` | - | Test config |
| `deploy.sh` | - | Deployment script |

### Shared (5 files — SINGLE SOURCE OF TRUTH for types)
| File | Lines | Purpose |
|------|-------|---------|
| `shared/schema.ts` | 2131 | ALL 132 database tables + Zod schemas + inferred types |
| `shared/types.ts` | 61 | Core type exports (Parent, Child, Task, ApiResponse, JWTPayload) |
| `shared/constants.ts` | 159 | APP_CONFIG, AUTH_CONFIG, PAGINATION, POINTS, GROWTH_TREE, GOVERNORATES, GRADES |
| `shared/media.ts` | 36 | Media/upload type contracts (finalizeUploadSchema) |
| `shared/notificationTypes.ts` | - | Notification type definitions |

### Server Core
| File | Lines | Purpose |
|------|-------|---------|
| `server/index.ts` | 352 | Express setup: Helmet, CORS, compression, cluster, error handler, API cache |
| `server/routes/index.ts` | 102 | Route registration hub + game seeder |
| `server/storage.ts` | 48 | DB connection (pg Pool + Drizzle, configurable pool) |
| `server/vite.ts` | ~200 | Dev: Vite middleware. Prod: serveStatic + SPA fallback |
| `server/mailer.ts` | 184 | Email: Resend primary, SMTP fallback, OTP templates |

### Client Core
| File | Lines | Purpose |
|------|-------|---------|
| `client/src/App.tsx` | 493 | All routes, providers, lazy loading, swipe-back, PWA branding |
| `client/src/main.tsx` | - | React root mount + i18n import |
| `client/src/lib/apiClient.ts` | 176 | Centralized API: auto auth, error handling |
| `client/src/lib/queryClient.ts` | 134 | React Query config, getQueryFn, authenticatedFetch |
| `client/src/i18n/config.ts` | 67 | i18next lazy-loading backend (ar/en/pt) |
| `client/index.html` | 67 | PWA meta, icons, manifest, theme init script |

### Scripts
| Script | Purpose |
|--------|---------|
| `scripts/docker-entrypoint.sh` | DB migration + app start |
| `scripts/manage-admin.js` | Admin account setup/reset |
| `scripts/repair-object-urls.js` | Fix media URLs |
| `scripts/setup.sh` / `start.sh` | Dev setup/start |
| `scripts/deploy-fast.sh` / `vps-deploy.sh` | VPS deployment |
| `scripts/switch-capacity-profile.cjs` | Performance profile switcher |

---

## ✅ COMPLETED FEATURES

### Core
- Parent registration/login (email + phone + social)
- OTP 2FA (6 digits, 5 min, email/SMS via Resend/SMTP/Twilio)
- Trusted devices (skip 2FA for 45 days)
- JWT sessions (30d expiry)
- Child linking (QR + unique code + PIN login)
- PWA + Service Worker + Dark/Light mode
- i18n: Arabic (RTL), English (LTR), Portuguese (LTR)

### Parent Features
- Dashboard with stats, quick actions, children list
- Task creation (custom + templates + scheduled)
- Subject-based task system
- Gift system (points threshold → unlock)
- Store (products, cart, checkout via wallet)
- Wallet (deposits, balance, transaction history)
- Notifications (10+ types, toast/modal/banner)
- Profile management (avatar, cover, social links)
- Child progress monitoring
- Referral system (100 points per active referral)

### Child Features
- Games (educational, points per play, daily limits)
- Tasks (answer, earn points)
- Store (spend points)
- Growth tree (8 stages, seed → great tree)
- Notifications (task reminders, gifts, rewards)
- Profile (avatar, hobbies, school info)
- Annual progress report

### Admin Panel (32 tabs)
- User management (parents, children, admins)
- Product/category CRUD
- Order management
- Game management (CRUD + per-child controls)
- Ad system (targeting parents/children/all, view/click tracking)
- Notification broadcasting
- OTP provider management
- SEO settings (meta tags, robots.txt, analytics)
- Support settings (email, phone, WhatsApp, maintenance mode)
- Mobile app branding (PWA name, icon, colors)
- Profit system (90/10 commission tracking)
- Wallet/deposit management
- School/library/teacher management
- Referral analytics
- Activity log

### School/Teacher Features
- Facebook-style dashboard (posts, comments, likes, polls)
- Teacher task marketplace
- Teacher earnings/withdrawal system
- Student management
- Profile pages (public + editable)
- Image/video uploads

### Library Features
- Product management (CRUD, discounts, stock)
- Order processing (status flow, delivery codes)
- Earnings/withdrawal system
- Referral tracking
- Activity scoring

### Commerce
- Store with categories, search, filters
- Cart system + direct buy
- Wallet-based payments
- Library store (separate from main store)
- Task marketplace (teacher tasks, cart, wallet purchase)
- Profit tracking (90% seller, 10% app)

### Infrastructure
- Docker multi-stage build
- Traefik SSL (Let's Encrypt)
- PostgreSQL with 64 optimized indexes
- Redis (sessions, rate-limiting, cache)
- MinIO (S3-compatible object storage)
- Monitoring (Prometheus, Grafana, Loki)
- Health checks on all services
- Cluster mode (configurable workers)

---

## 📋 RECENT COMMITS (Last 25)
```
355479a fix: complete Portuguese translations — admin + 44 sections + 332 gaps
0182bb2 fix: translate TaskMarketplace + TaskCart across 3 languages
4624527 fix: admin sidebar object-instead-of-string + translate DashboardTab
a2c5030 fix: correct 211 Arabic translations
b9ee321 feat: complete i18n translation coverage for all pages
5dac2e2 feat: task marketplace with cart, likes, wallet purchases
c92309b feat: add LanguageSelector to all 39 remaining pages
4e60f20 fix: language selector dropdown direction RTL/LTR
2516b0f fix: notification panel direction based on language
cd959e6 feat: notification system for library/school/teacher/admin
5413614 feat: notification overlay system - bell icon on ALL pages
f0e35ed fix(ads): normalize linkUrl - prepend https://
98061fc fix(ads): broken images, toast, image upload, error handling
a83e4ad audit: admin products ordering, toast, delete safety
8153bbf fix: school name text z-index
c2be468 fix: hide delete teacher button
0e3fac2 feat: teacher transfer system + admin teacher management
cb0f5b2 fix: parent cover image display bug
0e5afdb fix: parent profile cover image improvements
95ed807 fix: library cover/avatar image
264d3ab fix: teacher cover image not displaying
7b6a60b feat: date/time on posts and polls
0a0742d fix: sort posts/polls newest to oldest
8390d9f fix: teacher polls in school dashboard
3bc2d42 feat: image upload for poll options
```

---

## 🎓 QUICK REFERENCE

### Before ANY Code Change
1. Read this memory bank
2. Identify affected tables in `shared/schema.ts`
3. Locate relevant route files in `server/routes/`
4. Check i18n impact (ar.json, en.json, pt.json)
5. Run `npx tsc --noEmit` after changes

### NPM Scripts
```bash
npm run dev          # Development server (port 5000)
npm run build        # Production build
npm run start        # Production runtime
npm run db:push      # Apply schema changes to DB
npm run admin:setup  # Create/reset admin account
npm run check        # TypeScript type check
npm run test         # Run tests (vitest)
npm run cap:sync     # Capacitor sync (Android)
npm run cap:build    # Build + sync (Android)
```

### 🚦 Mandatory Test Gate (EVERY CHANGE)

Every code modification MUST pass the full pipeline before commit:

```bash
# Step 1: TypeScript check (pre-existing server 'any' errors allowed)
npx tsc --noEmit

# Step 2: Vite frontend build
npx vite build

# Step 3: Unit tests
npm run test

# Step 4: Health check (dev server must be running)
curl http://localhost:5000/api/health
```

**Decision:**
- ✅ ALL pass → APPROVED → Commit
- ❌ ANY fails → REJECTED → Fix immediately, re-run full pipeline
- 🔄 Repeat until all 4 pass — NO exceptions, NO skipping

### Deploy Checklist
```bash
# 1. Run full test gate (above)

# 2. Commit & push
git add -A && git commit -m "..." && git push origin main

# 3. Deploy on VPS
cd /docker/classitest && git pull origin main && docker compose up -d --build app

# 4. Verify production
curl https://classi-fy.com/api/health
docker compose logs -f app
```

---

**Mode:** STRICT / ZERO-HALLUCINATION
**Maintained By:** Classify Engineering + AI Agent
**Version:** 4.1 — MASTER MEMORY BANK
**Last Commit:** 4118c22
**Last Updated:** 2026-02-28

