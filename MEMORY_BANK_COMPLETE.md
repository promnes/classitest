# 🧠 CLASSIFY — AI AGENT MEMORY BANK
**Last Updated:** 2025-02-17
**Status:** ACTIVE — READ THIS FIRST BEFORE ANY WORK

---

## 📌 PROJECT IDENTITY

**Name:** Classify — Kids Educational & Parental Control Platform
**Domain:** classi-fy.com
**Stack:** Express.js + React + Vite + PostgreSQL + Drizzle ORM
**Language:** TypeScript (strict mode), Arabic-first UI (RTL)
**Runtime:** Node 20 (Alpine Docker), Port 5000
**Repo:** github.com/promnes/classitest.git, branch: `main`

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────┐
│                    Traefik                       │
│            (SSL, HTTP→HTTPS, LB)                 │
├─────────────────────────────────────────────────┤
│         Express.js Server (port 5000)            │
│  ┌─────────────┬──────────────────────────────┐  │
│  │  API Routes  │  Static Assets (SPA)         │  │
│  │  /api/*      │  dist/public/*               │  │
│  └─────────────┴──────────────────────────────┘  │
├───────────────┬───────────────┬──────────────────┤
│  PostgreSQL   │     Redis     │  Object Storage  │
│  (Drizzle)    │   (Sessions)  │  (Local/MinIO)   │
└───────────────┴───────────────┴──────────────────┘
```

### Build Pipeline
- **Frontend:** `vite build` → `dist/public/` (code-split, manualChunks for Radix/vendor)
- **Backend:** `esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
- **Dev:** `dotenv -v NODE_ENV=development -- tsx server/index.ts`
- **Prod:** `NODE_ENV=production node dist/index.js`

### Key Config Files
- `vite.config.ts` — aliases: `@/` → client/src, `@shared/` → shared/, `@assets/` → attached_assets/
- `tsconfig.json` — strict, ES2020 target, bundler moduleResolution
- `drizzle.config.ts` — PostgreSQL, schema: shared/schema.ts, migrations/
- `package.json` — type: "module" (ESM)

---

## 📊 DATABASE SCHEMA (shared/schema.ts — 2056 lines, 80+ tables)

### Core Entity Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `parents` | Parent users | email, password, name, uniqueCode, twoFAEnabled, avatarUrl, coverImageUrl, socialLinks |
| `children` | Child users | name, totalPoints, avatarUrl, pin, birthday, schoolName, governorate |
| `parentChild` | Parent↔Child link | parentId, childId (CASCADE delete, UNIQUE constraint) |
| `admins` | Admin users | username, email, password, role |
| `schools` | School entities | name, username, password, referralCode, imageUrl, coverImageUrl, socialLinks |
| `schoolTeachers` | Teachers (under schools) | schoolId, name, username, password, subject, avatarUrl, coverImageUrl, socialLinks |
| `libraries` | Library merchants | name, username, password, referralCode, bio, coverImageUrl |

### Task System
| Table | Purpose |
|-------|---------|
| `tasks` | Parent→Child tasks (question, answers JSON, pointsReward, status) |
| `taskResults` | Child task answers (isCorrect, pointsEarned) |
| `templateTasks` | Reusable task templates (admin/parent created) |
| `teacherTasks` | Teacher-created tasks for marketplace (price, purchaseCount) |
| `scheduledTasks` | Future-scheduled tasks |
| `taskAttemptsSummary` | Composite PK (taskId, childId), attempt counts |

### Commerce & Payments
| Table | Purpose |
|-------|---------|
| `products` | Store products (pointsPrice, price, productType) |
| `productCategories` | Product categories |
| `storeOrders` | Parent orders (PENDING→PAID→FAILED, Stripe) |
| `orderItems` | Order line items |
| `transactions` | Payment transactions (Stripe provider) |
| `webhookEvents` | Stripe webhook dedup (dedupeKey UNIQUE) |
| `wallets` | Parent wallets (balance, currency) |
| `walletTransfers` | Wallet ledger (DEPOSIT/REFUND/SPEND) |
| `entitlements` | Owned products (ACTIVE/ASSIGNED_AS_GIFT/EXPIRED) |
| `parentPurchases` | Purchase records |
| `childPurchases` | Child point-purchases |
| `priceTiers` | Multi-currency pricing |

### Gift System
| Table | Purpose |
|-------|---------|
| `gifts` | Parent→Child gifts (pointsThreshold, SENT→UNLOCKED→ACTIVATED) |
| `childGifts` | Legacy gifts table |
| `childEvents` | Child events (GIFT_ASSIGNED, TASK_ASSIGNED, etc.) |

### Media & Upload System
| Table | Purpose |
|-------|---------|
| `media` | Uploaded files (objectKey, url, mimeType, size, scanStatus, purgeAt) |
| `mediaReferences` | Entity↔Media links (entityType, entityId, field) |
| `mediaEvents` | Audit trail (FINALIZED, DELETED, etc.) |

### Notification System
| Table | Purpose |
|-------|---------|
| `notifications` | Child notifications (type, style: toast/modal/banner, priority, soundAlert) |
| `parentNotifications` | Parent notifications |
| `broadcastNotifications` | Admin→All notifications |
| `childPushSubscriptions` | Web/Mobile push tokens |
| `taskNotificationDeliveryAttempts` | Push delivery tracking |
| `taskNotificationGlobalPolicy` | Global notification config |
| `taskNotificationChildPolicy` | Per-child notification override |

### Auth & Security
| Table | Purpose |
|-------|---------|
| `otpCodes` | OTP codes (purpose, method, expiresAt, attempts) |
| `otpRequestLogs` | Rate-limit tracking |
| `otpProviders` | Admin-managed OTP providers (email/SMS) |
| `trustedDevices` | Parent trusted devices (old) |
| `trustedDevicesParent` | Parent trusted devices (new) |
| `trustedDevicesChild` | Child trusted devices |
| `childTrustedDevices` | Child device refresh tokens |
| `sessions` | Active parent sessions |
| `loginHistory` | Login audit log |
| `socialLoginProviders` | Social login config (Google, etc.) |
| `parentSocialIdentities` | Linked social accounts |
| `childLoginRequests` | Child login approval flow |

### Schools & Teachers Extended
| Table | Purpose |
|-------|---------|
| `schoolPosts` | School/Teacher posts (content, mediaUrls[], mediaTypes[]) |
| `schoolPostComments` | Post comments |
| `schoolPostLikes` | Post likes |
| `schoolReviews` | School ratings |
| `teacherReviews` | Teacher ratings |
| `teacherTaskOrders` | Teacher task purchases |
| `teacherBalances` | Teacher earnings (pending/available/withdrawn) |
| `teacherWithdrawalRequests` | Teacher withdrawal requests |
| `teacherHiring` | Parent hires teacher for child |
| `childSchoolAssignment` | Child→School link |
| `childTeacherAssignment` | Child→Teacher link |

### Library Extended
| Table | Purpose |
|-------|---------|
| `libraryProducts` | Library store products |
| `libraryOrders` | Library orders with commission tracking |
| `libraryBalances` | Library earnings/withdrawals |
| `libraryPosts` | Library social posts |
| `libraryPostComments/Likes` | Library post engagement |
| `libraryReviews` | Library ratings |

### Other Tables
| Table | Purpose |
|-------|---------|
| `appSettings` | Key-value app config |
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
| `parentTaskLibrary` | Purchased tasks library |
| `taskFavorites` | Favorited tasks |
| `pointsHistory` / `pointsLedger` | Points tracking |

---

## 🔌 API ROUTES (server/routes/)

### Route Registration (server/routes/index.ts)
All routes registered in `registerRoutes()`:
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

### Route Files
| File | Lines | Purpose |
|------|-------|---------|
| `auth.ts` | ~2500 | Login, register, OTP, 2FA, social login, forgot password |
| `parent.ts` | Large | Parent CRUD, children, tasks, notifications, profile |
| `child.ts` | Large | Child data, tasks, games, progress, store |
| `admin.ts` | Large | Admin dashboard, user management, settings |
| `school.ts` | ~1140 | School CRUD, teachers, students, posts, reviews, uploads |
| `teacher.ts` | ~1210 | Teacher tasks, profile, earnings, withdrawals, uploads |
| `library.ts` | Large | Library products, orders, earnings, posts |
| `payments.ts` | Large | Stripe checkout, webhooks, wallets |
| `store.ts` | Large | Product CRUD, cart, orders |
| `marketplace.ts` | Large | Task marketplace, search, recommendations |
| `follow.ts` | Small | Follow/unfollow schools/teachers/libraries |
| `media-uploads.ts` | Small | Presign, finalize, direct upload endpoints |
| `ads.ts` | Small | Ad serving and click tracking |
| `referrals.ts` | Small | Referral system |

### API Response Contract (IMMUTABLE)
```json
Success: { "success": true, "data": {}, "message": "Optional" }
Error:   { "success": false, "error": "ERROR_CODE", "message": "Human readable" }
```

---

## 🖼️ MEDIA UPLOAD PIPELINE

### Flow: presign → upload → finalize
1. **Presign:** `POST /api/{school|teacher}/uploads/presign` → `{ uploadURL, objectPath, metadata }`
2. **Upload:** PUT file to `uploadURL` (local: `/api/uploads/direct/{id}`, remote: MinIO presigned URL)
3. **Finalize:** `POST /api/{school|teacher}/uploads/finalize` with `{ objectPath, mimeType, size, originalName, purpose }`
4. **Result:** Media record in DB, `url` = `/objects/uploads/{uuid}`
5. **Serve:** `GET /objects/*` route resolves path → local file or MinIO stream

### Key Types (shared/media.ts)
```typescript
finalizeUploadSchema = { objectPath, mimeType, size, originalName, purpose, dedupeKey? }
createPresignedUpload returns: { uploadURL, objectPath, metadata }
```

### Local Storage Fallback
- `objectStorageService.getObjectEntityUploadURL()` returns `__local__://{uuid}` sentinel
- `createPresignedUpload()` converts to `/api/uploads/direct/{uuid}`
- Direct upload PUT saves to `LOCAL_UPLOAD_DIR/uploads/{uuid}`
- DB stores `url = /objects/uploads/{uuid}`

### Purpose Policies (uploadService.ts)
- `task_media`: image/video, 25MB max, private
- `answer_media`: image/video, 25MB max, private
- `default`: image/video, 25MB max, private

---

## 🌐 FRONTEND ARCHITECTURE

### Client Structure (client/src/)
```
App.tsx          — Routes (wouter), ThemeProvider, QueryClientProvider, SEOProvider
main.tsx         — React root mount
index.css        — Tailwind CSS
lib/
  apiClient.ts   — Centralized fetch wrapper with auth token selection
  queryClient.ts — React Query config, apiRequest(), auth header injection
  utils.ts       — cn() utility (clsx + tailwind-merge)
hooks/
  api/           — useParentData, useChildData, useNotifications
  use-upload.ts  — Upload hook
  useApiQueries.ts — Shared query hooks
  useAutoLogin.ts — Auto-login from stored tokens
  useChildAuth.ts — Child auth hook
contexts/
  ThemeContext.tsx — Dark/light theme
i18n/
  config.ts      — i18next config (ar, en, pt)
  locales/       — Translation JSON files
components/
  ui/            — shadcn/ui primitives (Button, Dialog, Card, etc.)
  admin/         — Admin dashboard components
  child/         — Child-specific components
  dashboard/     — Dashboard components
  parent/        — Parent components
  forms/         — Form components
  notifications/ — Notification components
```

### Client Pages (47 pages)
**Parent:** Home, ParentAuth, ParentDashboard, ParentDashboardPro, ParentStore, ParentStoreMulti, ParentInventory, ParentTasks, ParentProfile, Wallet, Settings, SettingsPro, Notifications, Subjects, SubjectTasks, CreateTask, AssignTask, ForgotPassword, OTPVerification, DownloadApp
**Child:** ChildLink, ChildGames, ChildGifts, ChildNotifications, ChildProfile, ChildProgress, ChildRewards, ChildSettings, ChildStore, ChildTasks
**Admin:** AdminAuth, AdminDashboard, AdminPurchasesTab
**School:** SchoolLogin, SchoolDashboard, SchoolProfile
**Teacher:** TeacherLogin, TeacherDashboard, TeacherProfile
**Library:** LibraryLogin, LibraryDashboard, LibraryStore, LibraryProfile
**Static:** Home, Privacy, PrivacyPolicy, AccessibilityPolicy, Terms, NotFound

### Auth Token Strategy
- `localStorage.token` — Parent JWT
- `localStorage.childToken` — Child JWT
- `localStorage.adminToken` — Admin JWT
- Auto-selection based on route prefix (`/api/admin` → adminToken, `/api/child` → childToken)

### Routing (wouter)
```
/                       → Home
/parent-auth            → ParentAuth (login/register)
/parent-dashboard       → ParentDashboard
/child-link             → ChildLink
/child-games            → ChildGames (ChildAppWrapper)
/school/login           → SchoolLogin
/school/dashboard       → SchoolDashboard
/school/:id             → SchoolProfile (public)
/teacher/login          → TeacherLogin
/teacher/dashboard      → TeacherDashboard
/teacher/:id            → TeacherProfile (public)
/library/login          → LibraryLogin
/library/dashboard      → LibraryDashboard
/library/:id            → LibraryProfile (public)
/admin                  → AdminAuth
/admin-dashboard        → AdminDashboard
/parent-profile         → ParentProfile
```

---

## 🚀 DEPLOYMENT

### Docker Compose Stack
| Service | Image | Purpose |
|---------|-------|---------|
| `traefik` | traefik:v2.11 | Reverse proxy, SSL (Let's Encrypt), HTTP→HTTPS |
| `app` | classify-app:latest | Express + React SPA (port 5000) |
| `db` | postgres:16-alpine | PostgreSQL database |
| `redis` | redis:7-alpine | Sessions, rate-limiting, caching |

### Dockerfile (Multi-stage)
1. `deps` — npm ci/install (cached on package.json change)
2. `builder` — vite build + esbuild (cached on source change)
3. `runner` — node:20-alpine, non-root user, production deps only

### Deploy Commands
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

## 🔐 SECURITY

- JWT auth (30d expiry), Bearer token in Authorization header
- Rate limiting on auth endpoints (express-rate-limit + rate-limit-redis)
- OTP: 6-digit, 5min expiry, 3 max attempts, email/SMS delivery
- 2FA: twoFAEnabled flag on parents table
- Parent-child ownership: ALWAYS validate parentId before child operations
- Child tokens: read-only (no write permissions)
- Helmet CSP: script-src 'self' 'unsafe-inline', img-src 'self' data: blob: storage.googleapis.com
- CORS: configurable via CORS_ORIGIN env var (default: *)
- Trust proxy: 1 (for Nginx/Traefik behind)
- Stripe webhook: raw body parsing for signature verification

---

## 📋 RECENT CHANGES (Last 20 commits)

```
bd6b287 Fix teacher upload field names and improve responsive profile layout
fcda9a6 Fix post image upload and add background publishing with notifications
a8e71eb School profile edit: upload avatar and cover images from local device
7291e56 School dashboard: Facebook-style profile page with posts, comments replies
4a44da1 Enhance school dashboard with server-side filters, media posting, profile management
b2ce5f6 Facebook-style school profile page with full data, social links, teachers & reviews
4c8453b feat: dynamic answer count - add/remove answers in teacher task creation
f98c7c6 feat: answer media (image/video per answer) + question images for teacher tasks
9dafd4a feat: teacher template tasks, media uploads, profile management
35f3414 feat: marketplace system - school autocomplete, search, task library, favorites
d601d9c feat: Social profiles, follow system, enhanced child registration, notifications
ba55f89 feat: add Schools & Teachers management system
5b1edb8 fix(ui): RTL switch toggle + add theme/notifications to library store
1ffa94a fix(mobile-app): apply admin app icon settings to runtime branding
7e07c42 feat(store): unify cart and add direct buy-now flow
b7e93b4 feat(notifications): centralize pipeline, realtime delivery, pagination
b19de76 feat: complete library commerce lifecycle end-to-end
665b71b fix(child-login): reuse pending request to prevent spam
7fbf0a2 fix(security): bind child login request polling to originating deviceId
5d51c90 chore(child-auth): enforce payload.valid check
```

---

## 🐛 KNOWN FIXED ISSUES

1. **TeacherDashboard upload (bd6b287):** `uploadFileForTeacher()` used wrong field names — `uploadUrl` → `uploadURL`, `key` → `objectPath`, finalize sent `key/contentType` instead of `objectPath/mimeType/purpose`. Fixed + added local URL detection.
2. **School post upload (fcda9a6):** Proxy endpoint fails on local URLs because `new URL("/api/uploads/direct/uuid")` throws on relative URLs. Fixed with unified `uploadFileToStorage()` + background publishing.
3. **SchoolDashboard profile images (a8e71eb):** Added local file upload for avatar and cover images.

---

## 📦 KEY DEPENDENCIES

### Backend
- express ^4.22, helmet ^8.1, compression ^1.8
- drizzle-orm ^0.39, pg (node-postgres)
- jsonwebtoken ^9.0, bcrypt ^6.0
- ioredis ^5.8, rate-limit-redis ^4.3
- stripe ^14.25, nodemailer ^6.10, resend ^4.0
- minio ^8.0 (object storage)
- web-push ^3.6, pino ^10.1

### Frontend
- react ^18.3, react-dom ^18.3
- wouter ^3.3 (routing)
- @tanstack/react-query ^5.60
- zod ^3.24
- lucide-react ^0.453 (icons)
- framer-motion ^11.13 (animations)
- recharts ^2.15 (charts)
- react-hook-form ^7.55 + @hookform/resolvers ^3.10
- i18next ^25.6 + react-i18next ^16.3
- All @radix-ui/* primitives (shadcn/ui)
- @capacitor/* ^7.4 (Android/iOS)

### Dev
- vite ^6.4, @vitejs/plugin-react ^4.7
- typescript ^5.9, tsx ^4.21
- esbuild ^0.25, drizzle-kit ^0.31
- vitest ^1.6, @playwright/test ^1.50

---

## 📁 CRITICAL FILE MAP

| File | Lines | Purpose |
|------|-------|---------|
| `shared/schema.ts` | 2056 | ALL database tables (Drizzle pgTable) + Zod schemas + types |
| `shared/media.ts` | 36 | Media/upload type contracts (finalizeUploadSchema) |
| `shared/types.ts` | 55 | Core type exports (Parent, Child, Task, ApiResponse, JWTPayload) |
| `shared/constants.ts` | 159 | App config, auth config, pagination, points, growth tree stages |
| `server/index.ts` | 352 | Express app setup (helmet, CORS, compression, cluster, error handler) |
| `server/routes/index.ts` | 103 | Route registration hub + game seeder |
| `server/storage.ts` | 48 | Database connection (pg Pool + Drizzle) |
| `server/services/uploadService.ts` | 332 | createPresignedUpload, finalizeUpload, media CRUD |
| `server/replit_integrations/object_storage/objectStorage.ts` | ~300 | Object storage abstraction (local + MinIO) |
| `client/src/App.tsx` | 485 | All routes, providers, lazy loading, PWA branding |
| `client/src/lib/apiClient.ts` | 176 | Centralized API client with auth |
| `client/src/lib/queryClient.ts` | 134 | React Query config |
| `client/src/pages/SchoolDashboard.tsx` | ~1740 | School admin dashboard (tabs, posts, profile, uploads) |
| `client/src/pages/TeacherDashboard.tsx` | ~1504 | Teacher dashboard (tasks, posts, profile, uploads) |
| `client/src/pages/ParentDashboard.tsx` | Large | Parent main dashboard |
| `Dockerfile` | 109 | Multi-stage build (deps→builder→runner) |
| `docker-compose.yml` | 486 | Full stack (Traefik, app, db, redis) |
| `vite.config.ts` | 80 | Build config (aliases, chunks, output) |
| `package.json` | 172 | Dependencies, scripts |

---

## 🎓 HOW TO USE THIS MEMORY

### Before ANY Code Change
1. Read this file to understand the system
2. Identify affected tables in schema section
3. Locate relevant route files
4. Check recent changes for context

### Quick Lookups
- **DB Table?** → Schema section above
- **API Route?** → Route files section
- **Upload issue?** → Media pipeline section
- **Frontend page?** → Client pages section
- **Deploy?** → Deployment section

---

**Mode:** STRICT / ZERO-HALLUCINATION
**Maintained By:** Classify Engineering + AI Agent
**Version:** 3.0 — COMPREHENSIVE MEMORY BANK
**Last Commit:** bd6b287

