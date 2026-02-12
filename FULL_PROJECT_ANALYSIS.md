# Classify — التحليل الشامل للمشروع من الصفر إلى النهاية
> **تاريخ التحليل:** 2025-02-12 | **المصدر:** قراءة مباشرة من كل ملف كود فعلي في المشروع
> **الملفات المقروءة:** 25+ ملف مصدري بالكامل | **إجمالي الأسطر المحللة:** 6,000+

---

## جدول المحتويات

1. [ملخص تنفيذي](#1-ملخص-تنفيذي)
2. [البنية التقنية الكاملة](#2-البنية-التقنية-الكاملة)
3. [قاعدة البيانات — كل جدول بالتفصيل](#3-قاعدة-البيانات)
4. [الخادم — التحليل الكامل](#4-الخادم-server)
5. [الواجهة الأمامية — كل صفحة ومكون](#5-الواجهة-الأمامية-frontend)
6. [البنية التحتية Docker](#6-البنية-التحتية-docker)
7. [نظام الأمان](#7-نظام-الأمان)
8. [المتغيرات البيئية](#8-المتغيرات-البيئية)
9. [تدفقات العمل الرئيسية](#9-تدفقات-العمل)
10. [خريطة الملفات الكاملة](#10-خريطة-الملفات)
11. [أوامر التشغيل](#11-أوامر-التشغيل)
12. [الملخص الإحصائي](#12-الملخص-الإحصائي)

---

## 1. ملخص تنفيذي

**Classify** هو منصة رقابة أبوية وتعليمية عربية شاملة تربط الآباء بالأطفال عبر نظام مهام تعليمية ومكافآت بالنقاط ومتجر إلكتروني وهدايا تحفيزية.

| البند | التفاصيل (من الكود مباشرة) |
|-------|---------------------------|
| **اسم الحزمة** | `rest-express` v1.0.0 (ESM module) — من package.json |
| **الدومين** | `classi-fy.com` — من docker-compose.yml labels |
| **السيرفر** | Hostinger VPS (srv1118737.hstgr.cloud) |
| **المنفذ** | 5000 (Express يخدم API + Frontend معاً) — من server/index.ts سطر 270 |
| **قاعدة البيانات** | PostgreSQL 15.7-alpine عبر Drizzle ORM 0.39.1 |
| **الكاش** | Redis 7.2-alpine (128MB maxmemory, allkeys-lru) |
| **البروكسي** | Traefik v2.11 (SSL تلقائي via Let's Encrypt ACME HTTP) |
| **الحاويات** | 11 حاوية Docker (4 أساسية + 7 مراقبة) |
| **عدد جداول DB** | 85+ جدول pgTable — من shared/schema.ts (1,471 سطر) |
| **عدد Routes** | 18 route group مسجلة — من server/routes/index.ts |
| **عدد صفحات Frontend** | 39 صفحة — من client/src/App.tsx (232 سطر) |

---

## 2. البنية التقنية الكاملة

### 2.1 Dependencies الفعلية (من package.json — 164 سطر)

**Frontend:**

| التقنية | الإصدار | الاستخدام |
|---------|---------|----------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.9.3 | Type Safety |
| Vite | 6.4.1 | Bundler + Dev Server |
| Tailwind CSS | 3.4.18 | Styling |
| shadcn/ui (Radix) | 20+ components | UI Components |
| Framer Motion | 11.13.1 | Animations |
| TanStack Query | 5.60.5 | Server State |
| Wouter | 3.3.5 | Client Routing (NOT react-router) |
| react-i18next | 16.3.5 | Arabic/English i18n |
| React Hook Form | 7.55.0 | Form Management |
| Recharts | 2.15.2 | Charts/Graphs |
| Lucide React | 0.453.0 | Icons |
| Embla Carousel | 8.6.0 | Carousels |
| date-fns | 3.6.0 | Date formatting |
| cmdk | 1.1.1 | Command palette |
| qrcode.react | 4.2.0 | QR Code rendering |
| input-otp | 1.4.2 | OTP input component |

**Backend:**

| التقنية | الإصدار | الاستخدام |
|---------|---------|----------|
| Express.js | 4.22.1 | HTTP Framework |
| Drizzle ORM | 0.39.1 | Database ORM |
| jsonwebtoken | 9.0.2 | JWT Auth |
| bcrypt | 6.0.0 | Password Hashing |
| Zod | 3.24.2 | Validation |
| Helmet | 8.1.0 | Security Headers |
| express-rate-limit | 8.2.1 | Rate Limiting |
| rate-limit-redis | 4.3.0 | Redis-backed Rate Limit |
| Resend | 4.0.0 | Email API (Primary) |
| Nodemailer | 6.10.1 | SMTP Email (Fallback) |
| Stripe | 14.25.0 | Payment Processing |
| MinIO | 8.0.6 | Object Storage |
| Google Cloud Storage | 7.18.0 | Cloud Storage |
| ioredis | 5.8.2 | Redis Client |
| Pino | 10.1.0 | Structured Logging |
| Passport | 0.7.0 | Auth Strategies |
| google-auth-library | 10.5.0 | Google OAuth |
| qrcode | 1.5.3 | QR Generation (server) |
| compression | 1.8.1 | Response Compression |
| multer | 2.0.2 | File Upload |
| cors | 2.8.5 | CORS Middleware |
| dotenv | 17.2.3 | Env Variables |
| uuid | 9.0.0 | UUID Generation |
| ws | 8.18.0 | WebSocket |
| jsqr | 1.4.0 | QR Scanning |

**Mobile:**

| التقنية | الإصدار |
|---------|---------|
| @capacitor/core | 7.4.4 |
| @capacitor/android | 7.4.4 |
| @capacitor/ios | 7.4.4 |
| @capacitor/cli | 7.4.4 |

**Testing/Dev:**

| التقنية | الإصدار |
|---------|---------|
| Vitest | 1.6.0 |
| Jest | 30.2.0 |
| Supertest | 7.1.4 |
| Playwright | 1.50.0 |
| ESLint | 9.39.2 |
| drizzle-kit | 0.31.7 |
| esbuild | 0.25.12 |
| tsx | 4.21.0 |

### 2.2 Build Pipeline (من package.json scripts)

```
تطوير:   NODE_ENV=development tsx server/index.ts
          → يشغل Express + Vite dev server (HMR) معاً على منفذ 5000

بناء:    vite build → dist/public/ (frontend assets, hashed filenames)
          esbuild server/index.ts → dist/index.js (backend, ESM, external packages)

إنتاج:   NODE_ENV=production node dist/index.js
          → Express يخدم API + dist/public/ static files
```

### 2.3 Config Files (من الكود مباشرة)

**vite.config.ts (42 سطر):**
- Root: `client/`
- Build output: `../dist/public` (relative to client/)
- Assets: `assets/[name]-[hash].[ext]` (cache-busting)
- Aliases: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`
- Dev server: host `0.0.0.0`, port `5000`

**tsconfig.json (35 سطر):**
- Target: ES2020, Module: ES2022, moduleResolution: bundler
- Strict mode: `strict: true` مع كل الخيارات المشددة
- Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`

**drizzle.config.ts (15 سطر):**
- Output: `./migrations`, Schema: `./shared/schema.ts`, Dialect: `postgresql`

---

## 3. قاعدة البيانات

> **المصدر:** `shared/schema.ts` — 1,471 سطر مقروءة بالكامل

### 3.1 إحصائيات

| المقياس | القيمة |
|---------|--------|
| عدد الجداول | **85+ pgTable** |
| عدد الفهارس المخصصة | **64+ index** |
| أنواع الفهارس | unique, composite, partial, lower-case |
| ORM | Drizzle (pgTable + relations) |
| Validation | Zod (createInsertSchema) |
| IDs | UUID (gen_random_uuid()) |

### 3.2 كل الجداول حسب الوظيفة

#### A. إعدادات النظام (7 جداول)

| الجدول | الأعمدة الرئيسية | الوظيفة |
|--------|-----------------|---------|
| `app_settings` | key (unique), value | إعدادات عامة key/value |
| `rewards_settings` | pointsPerTask (10), dailyLimit (100) | نقاط المكافآت |
| `tasks_settings` | maxTasksPerDay (10), allowCustomTasks (true) | حدود المهام |
| `store_settings` | storeEnabled (true), minPointsToBuy (10) | إعدادات المتجر |
| `notification_settings` | enablePush (true), enableEmail (false) | إعدادات الإشعارات |
| `payment_settings` | paymentEnabled (false), gateway | بوابة الدفع |
| `theme_settings` | primaryColor, secondaryColor, accentColor | ألوان التطبيق |

#### B. المستخدمون (5 جداول أساسية)

| الجدول | الأعمدة الرئيسية | الفهارس | ملاحظات |
|--------|-----------------|---------|---------|
| `parents` | email, password, name, phoneNumber, uniqueCode, qrCode, twoFAEnabled, failedLoginAttempts, lockedUntil, smsEnabled, smsVerified, privacyAccepted | email UNIQUE + lower-case index | bcrypt password, 2FA, lockout mechanism |
| `children` | name, totalPoints, avatarUrl, birthday, schoolName, hobbies | — | مرتبط بالوالد عبر parentChild |
| `admins` | email, password, role | email UNIQUE | role default: "superadmin" |
| `symbols` | name, nameAr, emoji, imageUrl, category, isActive, sortOrder | — | مكتبة رموز/أيقونات |
| `point_adjustments` | adminId, childId, delta, reason | — | تعديل نقاط يدوي من الأدمن |

#### C. المصادقة والأجهزة (10 جداول)

| الجدول | الأعمدة الرئيسية | القيود | الوظيفة |
|--------|-----------------|--------|---------|
| `trusted_devices` | parentId, deviceIdHash, refreshTokenHash, expiresAt, revokedAt | FK→parents | أجهزة موثوقة (legacy) |
| `trusted_devices_parent` | parentId, deviceId, deviceName, deviceType | UNIQUE(parentId, deviceId) | أجهزة الآباء الجديدة |
| `trusted_devices_child` | childId, deviceId, deviceName, deviceType | UNIQUE(childId, deviceId) | أجهزة الأطفال |
| `child_trusted_devices` | childId, deviceIdHash, refreshTokenHash | FK→children | أجهزة الأطفال (legacy) |
| `sessions` | parentId, deviceId, tokenHash, expiresAt, isRevoked | UNIQUE(parentId, deviceId) | جلسات نشطة |
| `login_history` | parentId, success, ipAddress, failureReason, suspiciousActivity | — | سجل تسجيل الدخول |
| `otp_codes` | parentId, purpose, code (bcrypt), method, destination, expiresAt, attempts, status | partial unique index on pending | رموز OTP |
| `otp_request_logs` | destination, ipAddress, createdAt | — | تتبع طلبات OTP |
| `child_login_requests` | childId, parentId, status, sessionToken | — | طلب دخول طفل بموافقة الوالد |
| `social_login_providers` | name (google/facebook/apple...), clientId, clientSecret, isEnabled | name UNIQUE | مزودو الدخول الاجتماعي |

#### D. العلاقات والربط (4 جداول)

| الجدول | القيود | الوظيفة |
|--------|--------|---------|
| `parent_child` | UNIQUE(parentId, childId), onDelete: cascade | ربط والد↔طفل |
| `parent_child_linking_codes` | code UNIQUE, isUsed, expiresAt | رموز ربط للمشاركة |
| `parent_parent_sync` | UNIQUE(primaryParentId, secondaryParentId) | مزامنة بين والدين |
| `parent_social_identities` | parentId, providerId, providerUserId, accessToken | هويات OAuth |

#### E. المهام والتعليم (8 جداول)

| الجدول | الأعمدة الرئيسية | الوظيفة |
|--------|-----------------|---------|
| `subjects` | name, emoji, description, color, isActive | المواد الدراسية |
| `template_tasks` | subjectId, question, answers (JSON[]), difficulty, createdByParent, isPublic, pointsCost, usageCount | مهام جاهزة (سوق المهام) |
| `tasks` | parentId, childId, subjectId, question, answers (JSON[]), pointsReward, status | مهام معينة لطفل |
| `task_results` | taskId, childId, selectedAnswerId, isCorrect, pointsEarned, timeTaken | نتائج الإجابة |
| `task_attempts_summary` | PK: (taskId, childId), totalAttempts, failedAttempts, lastAttemptAt | ملخص المحاولات |
| `task_monitoring_counters` | childId, taskId, metric, value | عدادات مراقبة |
| `scheduled_tasks` | parentId, childId, templateTaskId, scheduledAt, status (pending/sent/cancelled) | مهام مجدولة |
| `profit_transactions` | templateTaskId, sellerId, buyerId, sellerEarnings, appCommission, status | أرباح سوق المهام |

#### F. النقاط والنمو (6 جداول)

| الجدول | الأعمدة | الوظيفة |
|--------|---------|---------|
| `points_history` | childId, points, source (task/game/referral), sourceId | سجل كسب النقاط |
| `points_ledger` | childId, taskId, pointsDelta, balanceAfter, reason, requestId | دفتر حسابي للنقاط |
| `child_growth_trees` | childId (UNIQUE), currentStage (1-8), totalGrowthPoints, tasksCompleted | شجرة نمو الطفل |
| `child_growth_events` | childId, eventType, growthPoints, metadata (JSON) | أحداث النمو |
| `child_activity_status` | childId (UNIQUE), isOnline, currentActivity, totalPlayTimeToday | حالة نشاط الطفل |
| `flash_games` | title, embedUrl, pointsPerPlay (5), isActive | ألعاب فلاش تعليمية |

#### G. المنتجات والمتجر (13 جدول)

| الجدول | الأعمدة الرئيسية | الوظيفة |
|--------|-----------------|---------|
| `product_categories` | name, nameAr, icon, color, sortOrder | فئات المنتجات |
| `products` | parentId (nullable=global), categoryId, name/nameAr, description/descriptionAr, price, pointsPrice, images (JSON), productType (digital/physical/subscription), brand, rating | المنتجات |
| `price_tiers` | productId, currency, unitAmount, interval (once/monthly/yearly), stripePriceId | مستويات الأسعار |
| `orders` | parentId, childId, productId, quantity, pointsPrice, status | طلبات الأطفال بالنقاط |
| `child_purchases` | childId, productId, orderId, pointsSpent | مشتريات أطفال |
| `child_purchase_requests` | childId, parentId, productId, status (pending/approved/rejected) | طلبات بموافقة الوالد |
| `store_orders` | parentId, status (PENDING/PAYMENT_INITIATED/PAID/FAILED/REFUNDED), totalAmount, stripeSessionId, idempotencyKey (UNIQUE) | طلبات المتجر الرئيسية |
| `order_items` | orderId, productId, priceTierId, quantity, unitAmount | بنود الطلب |
| `parent_purchases` | parentId, totalAmount, currency, paymentStatus (pending/paid/failed/refunded), invoiceNumber | مشتريات الآباء |
| `parent_purchase_items` | purchaseId, productId, quantity, unitPrice, subtotal | بنود مشتريات الآباء |
| `parent_owned_products` | parentId, productId, status (pending_admin_approval/active/assigned_to_child/exhausted) | منتجات مملوكة |
| `child_assigned_products` | childId, productId, parentOwnedProductId, requiredPoints, progressPoints, status (active/completed/shipment_requested/shipped) | منتجات معينة للطفل |
| `shipping_requests` | parentId, childId, productId, status (requested/approved/shipped/cancelled), address | طلبات الشحن |

#### H. المحفظة والمدفوعات (9 جداول)

| الجدول | الأعمدة الرئيسية | الوظيفة |
|--------|-----------------|---------|
| `parent_wallet` | parentId (UNIQUE), balance, totalDeposited, totalSpent | محفظة الوالد |
| `wallets` | parentId (UNIQUE), balance, currency, status (active/frozen) | نظام محافظ Phase 2 |
| `wallet_transfers` | walletId, type (DEPOSIT/REFUND/SPEND), amount, reason, relatedOrderId | حركات المحفظة |
| `payment_methods` | parentId, type, accountNumber, isDefault | وسائل الدفع |
| `deposits` | parentId, paymentMethodId, amount, status (pending/approved/rejected), transactionId | عمليات الإيداع |
| `transactions` | orderId, provider (stripe), providerRef, status, amount, idempotencyKey (UNIQUE) | معاملات Stripe |
| `webhook_events` | provider, eventType, dedupeKey (UNIQUE), payload (JSON), signatureVerified | أحداث Webhook |
| `shipping_addresses` | parentId, addressLine1/2, city, state, postalCode, country (ISO 3166), isDefault | عناوين الشحن |
| `refunds` | transactionId, amount, status (pending/completed/failed), providerRef, reason | المرتجعات |

#### I. الهدايا والملكية (3 جداول)

| الجدول | الأعمدة | الوظيفة |
|--------|---------|---------|
| `child_gifts` | parentId, childId, productId, status (pending/delivered/acknowledged) | هدايا مرسلة للأطفال |
| `gifts` | parentId, childId, productId, pointsThreshold, status (SENT/UNLOCKED/ACTIVATED/REVOKED) | نظام هدايا تحفيزية |
| `entitlements` | parentId, childId (nullable), productId, orderId, status (ACTIVE/ASSIGNED_AS_GIFT/EXPIRED), UNIQUE(orderId, productId, parentId) | ملكية المنتجات |

#### J. الإشعارات (6 جداول)

| الجدول | الأعمدة الرئيسية | الوظيفة |
|--------|-----------------|---------|
| `notifications` | parentId/childId, type, title, message, style (toast/modal/banner/fullscreen), priority (normal/warning/urgent/blocking), soundAlert, vibration, ctaAction, ctaTarget, metadata (JSON) | إشعارات شاملة |
| `broadcast_notifications` | adminId, title, message, targetAudience (all), priority, recipientCount | إشعارات جماعية |
| `parent_notifications` | parentId, title, message, type, isRead | إشعارات خاصة بالآباء |
| `child_notification_settings` | childId, mode (popup_strict/popup_soft/floating_bubble), repeatDelayMinutes | إعدادات إشعارات الطفل |
| `child_events` | childId, eventType, relatedId, meta (JSON), isAcknowledged | أحداث الطفل |
| `outbox_events` | type, payloadJson, status, retryCount, lastError | Transactional Outbox Pattern |

#### K. الإعلانات (4 جداول)

| الجدول | الأعمدة | الوظيفة |
|--------|---------|---------|
| `child_ads` | content (image/video/link/code), pointsReward, watchDurationSeconds, isActive | إعلانات للأطفال (مكافأة بالنقاط) |
| `parent_ads` | content types مماثلة, بدون نقاط | إعلانات للآباء |
| `ad_watch_history` | childId/parentId, adId, watchedDuration, pointsEarned, isCompleted | سجل مشاهدة |
| `ads` | targetAudience (all/parents/children), viewCount, clickCount | نظام إعلانات عام |

#### L. المكتبات/التجار (6 جداول)

| الجدول | الأعمدة | الوظيفة |
|--------|---------|---------|
| `libraries` | username, password, businessName, referralCode, commissionRatePct | تجار مكتبات |
| `library_products` | libraryId, title, price, discountPercent, discountMinQuantity, stock | منتجات المكتبة |
| `library_referrals` | libraryId, referredParentId, status (clicked/registered/purchased) | إحالات المكتبات |
| `library_activity_logs` | libraryId, action, meta | سجل نشاط |
| `library_referral_settings` | pointsPerReferral, minPurchaseAmount | إعدادات إحالات |
| `library_daily_sales` | libraryId, date, totalSales, commissionAmount, isPaid | مبيعات يومية |

#### M. الإحالات (3 جداول)

| الجدول | الأعمدة | الوظيفة |
|--------|---------|---------|
| `referral_settings` | pointsPerReferral (100), commissionPercent (10), isEnabled | إعدادات الإحالة |
| `referrals` | referrerId, referredId, status (pending/active/rewarded), UNIQUE pair | سجل الإحالات |
| `parent_referral_codes` | parentId (UNIQUE), code (UNIQUE), totalReferrals | رموز إحالة |

#### N. الوسائط (3 جداول)

| الجدول | الأعمدة | الوظيفة |
|--------|---------|---------|
| `media` | objectKey, url, storageProvider, mimeType, size, width/height, scanStatus, dedupe unique index | ملفات الوسائط |
| `media_references` | mediaId, entityType, entityId, field, unique active ref index | روابط الوسائط بالكيانات |
| `media_events` | mediaId, actorType, action, meta | سجل أحداث الوسائط |

#### O. SEO والدعم وإعدادات متقدمة (4 جداول)

| الجدول | الوصف |
|--------|-------|
| `seo_settings` | شاملة: meta tags, OpenGraph, Twitter cards, robots, schema.org, Google Analytics, AI crawler control (Googlebot-AI, GPTBot, etc.), PWA manifest |
| `support_settings` | contact info, social media links, working hours, maintenance mode, error page config, help center, FAQ section, legal info |
| `site_settings` | key/value عام |
| `otp_providers` | email/sms provider config: codeLength, expiryMinutes, maxAttempts, cooldownMinutes |

#### P. سجل النشاط

| الجدول | الوظيفة |
|--------|---------|
| `activity_log` | adminId, action, entity, entityId, meta (JSON), ipAddress |

---

## 4. الخادم (Server)

### 4.1 نقطة الدخول: `server/index.ts` (301 سطر — مقروء بالكامل)

**تسلسل التشغيل الفعلي (من الكود سطراً بسطر):**

1. **سطر 1:** `import "dotenv/config"` — تحميل .env
2. **أسطر 13-22:** طباعة تشخيصات البيئة (NODE_ENV, PORT, DATABASE_URL, JWT_SECRET)
3. **أسطر 40-50:** فحص المتغيرات المطلوبة → `process.exit(1)` إذا ناقصة:
   - `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DATABASE_URL`
4. **سطر 52:** إنشاء Express app
5. **أسطر 54-60:** إعداد REDACT_KEYS للبيانات الحساسة
6. **سطر 71:** `trust proxy 1` (للعمل خلف Nginx/Traefik)
7. **أسطر 73-112:** Helmet CSP:
   - `defaultSrc: ['self']`
   - `scriptSrc: ['self', 'unsafe-inline']` — لسكريبت التهيئة في index.html
   - `styleSrc: ['self', 'unsafe-inline', 'fonts.googleapis.com']`
   - `fontSrc: ['self', 'fonts.gstatic.com', 'data:']`
   - `imgSrc: ['self', 'data:', 'blob:', 'storage.googleapis.com']`
   - `frameSrc: ['none']`, `objectSrc: ['none']`
8. **سطر 113:** `compression()` middleware
9. **سطر 116:** `/uploads` static directory
10. **أسطر 118-126:** Raw body bypass لـ `/api/payments/stripe/webhook`
11. **أسطر 127-133:** JSON/URL parsing (limit: 10MB)
12. **أسطر 135-145:** SyntaxError handler (malformed JSON → 400)
13. **أسطر 147-175:** CORS configurable عبر `CORS_ORIGIN` env (comma-separated أو *)
14. **أسطر 177-188:** Request logging (API routes فقط)
15. **سطر 190:** IIFE async — بدء التشغيل:
    - `registerRoutes(app)` — تسجيل كل الـ routes
    - `initializeGiftNotificationHandlers()` — Event listeners للهدايا
    - `startMediaWorker()` — Background worker
    - API 404 guard → JSON error
    - Global error handler → redacted logging
    - Dev: `setupVite()` | Prod: `serveStatic()`
    - Listen: `0.0.0.0:5000`
    - Graceful shutdown (SIGTERM, SIGINT)
    - UnhandledRejection → `process.exit(1)`

### 4.2 تسجيل Routes: `server/routes/index.ts` (69 سطر — مقروء بالكامل)

```
registerAuthRoutes(app)                → auth.ts (2,533 سطر!)
registerAdminRoutes(app)               → admin.ts
registerAdminSettingsRoutes(app)       → admin.settings.ts
registerActivityLogRoutes(app)         → admin-activity.ts
registerAnalyticsRoutes(app)           → admin-analytics.ts
registerGiftManagementRoutes(app)      → admin-gifts.ts
registerNotificationSettingsRoutes(app)→ admin-notification-settings.ts
registerParentRoutes(app)              → parent.ts
registerChildRoutes(app)               → child.ts
registerPaymentRoutes(app)             → payments.ts
registerStoreRoutes(app)               → store.ts
registerReferralRoutes(app)            → referrals.ts
registerLibraryRoutes(app)             → library.ts
registerObjectStorageRoutes(app)       → replit_integrations/object_storage.ts
registerMediaUploadRoutes(app)         → media-uploads.ts
app.use("/api", trustedDevicesRouter)  → trusted-devices.ts
app.use("/api", adsRouter)             → ads.ts
app.use("/api", parentLinkingRouter)   → parent-linking.ts

+ Health check: GET /api/health → { status: "ok" }
+ ensureOtpProviders() — bootstraps OTP providers on startup
```

### 4.3 نظام المصادقة: `server/routes/auth.ts` (2,533 سطر — أكبر ملف)

**الثوابت (من أسطر 32-38):**
```
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
OTP_RATE_LIMIT_RETRY_AFTER_SEC = 600 (10 دقائق)
MAX_TRUSTED_DEVICES = 5
DEVICE_TOKEN_EXPIRY_DAYS = 45
```

**Helper Functions (أسطر 40-95):**
- `maskPhoneNumber()` — إخفاء أرقام الهاتف
- `computeDeviceHash()` — SHA-256 من deviceId + user-agent + IP
- `normalizeEmail()` — trim + toLowerCase
- `respondRateLimited()` — Retry-After header
- `respondOtpCooldown()` — OTP cooldown response
- `isOtpRequestAllowed()` — 3 طلبات كحد أقصى في 10 دقائق per destination+IP
- `logOtpRequest()` — تسجيل طلب OTP
- `canUseSMS()` — فحص هل الـ SMS متاح
- `checkSMSRateLimit()` — حد 5 SMS/ساعة

**Endpoints الرئيسية:**
- `POST /api/auth/register` — تسجيل والد جديد (registerLimiter: 5/min)
- `POST /api/auth/login` — تسجيل دخول (loginLimiter: 5/min)
- `POST /api/auth/verify-otp` — تحقق OTP (otpVerifyLimiter: 5/min)
- `POST /api/auth/request-otp` — طلب OTP جديد (otpRequestLimiter: 3/min)
- `POST /api/auth/logout` — تسجيل خروج
- `POST /api/auth/forgot-password` — استعادة كلمة المرور
- `POST /api/auth/reset-password` — إعادة تعيين كلمة المرور
- `POST /api/auth/verify-email-otp` — تحقق OTP بريد إلكتروني
- `POST /api/auth/social/*` — تسجيل دخول اجتماعي (Google, Facebook, Apple)
- `GET /api/auth/me` — بيانات المستخدم الحالي
- `POST /api/auth/change-password` — تغيير كلمة المرور
- `PUT /api/auth/enable-2fa` — تفعيل المصادقة الثنائية
- `PUT /api/auth/disable-2fa` — إلغاء المصادقة الثنائية
- + endpoints للأطفال (/api/auth/child/*)

### 4.4 Middleware: `server/routes/middleware.ts` (55 سطر — مقروء بالكامل)

```typescript
// authMiddleware:
// 1. استخراج token من Authorization: Bearer <token>
// 2. jwt.verify() مع JWT_SECRET
// 3. normalized payload: req.user = { userId, parentId, type }
// 4. child tokens: type === "child" → يمنع الوصول لغير /api/child*

// adminMiddleware:  
// 1. jwt.verify() مع JWT_SECRET
// 2. يتطلب type === "admin" في الـ payload
// 3. req.admin = decoded payload
```

**JWT_SECRET:** يستخدم hardcoded fallback في development فقط، `process.exit(1)` في production إذا غير موجود.

### 4.5 Rate Limiters: `server/utils/rateLimiters.ts` (42 سطر — مقروء بالكامل)

| Limiter | الحد | النافذة | المفتاح |
|---------|------|---------|---------|
| `registerLimiter` | 5/min | 60s | IP فقط |
| `loginLimiter` | 5/min | 60s | IP + email (composite) |
| `otpRequestLimiter` | 3/min | 60s | IP + email + OTP event tracking |
| `otpVerifyLimiter` | 5/min | 60s | IP + email |

### 4.6 OTP Service: `server/services/otpService.ts` (201 سطر — مقروء بالكامل)

```
OTP_LENGTH = 6 أرقام
OTP_EXPIRY_MINUTES = 5
MAX_ATTEMPTS = 3
OTP_COOLDOWN_SECONDS = 60

الخوارزمية:
1. توليد 6 أرقام عشوائية (crypto.randomInt)
2. bcrypt hash (10 rounds)
3. حفظ في otp_codes مع status: "pending"
4. عند التحقق: bcrypt compare
5. Atomic increment attempts (race condition safe)
6. Atomic mark verified
7. Supersede old pending OTPs عند طلب جديد
8. Cooldown enforcement: 60 ثانية بين الطلبات
```

### 4.7 Mail Service: `server/mailer.ts` (184 سطر)

```
الأولوية:
1. Resend API (إذا RESEND_API_KEY موجود)
2. SMTP via Nodemailer (إذا SMTP_HOST موجود)
   - دعم: SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASSWORD, SMTP_SECURE, SMTP_FROM

يعمل مع Replit connector كـ fallback لـ Resend credentials.
```

### 4.8 Notification Handlers: `server/notificationHandlers.ts` (94 سطر)

```
Event-Driven Architecture (EventEmitter):

gift.sent     → log فقط
gift.unlocked → notification(modal, soundAlert: true, vibration: true, priority: urgent)
gift.activated → notification(toast, soundAlert: false)
gift.revoked  → log فقط
```

### 4.9 API Response Contract: `server/utils/apiResponse.ts` (76 سطر — مقروء بالكامل)

```json
// نجاح:
{ "success": true, "data": {...}, "message": "Optional" }

// خطأ:
{ "success": false, "error": "ERROR_CODE", "message": "Human readable" }
```

**Error Codes المستخدمة فعلياً:**
`NOT_FOUND`, `UNAUTHORIZED`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`, `PARENT_CHILD_MISMATCH`, `OTP_EXPIRED`, `RATE_LIMITED`, `FORBIDDEN`, `CONFLICT`, `INVALID_CREDENTIALS`, `SMS_NOT_ENABLED`, `PAYMENT_FAILED`

### 4.10 Static File Serving: `server/static.ts` (85 سطر)

```
Production:
- يخدم dist/public/ كملفات ثابتة
- Cache strategy:
  - sw.js, manifest.json, index.html → no-cache (always fresh)
  - /assets/* (hashed) → Cache-Control: public, max-age=31536000, immutable
  - باقي الملفات → max-age=86400 (يوم واحد)
- SPA fallback: أي route غير /api/* → index.html
```

---

## 5. الواجهة الأمامية (Frontend)

### 5.1 هيكل التطبيق: `client/src/App.tsx` (232 سطر — مقروء بالكامل)

**Provider Hierarchy:**
```
QueryClientProvider (TanStack React Query)
  └→ ThemeProvider (ألوان ديناميكية)
       └→ SEOProvider (meta tags تلقائية)
            └→ TooltipProvider (Radix tooltips)
                 └→ Router (wouter Switch/Route)
                      └→ Toaster (toast notifications)
```

**Lazy Loading:** كل الصفحات ما عدا Home, ParentAuth, ChildLink محملة كسول عبر `React.lazy()` مع `Suspense` fallback.

**ChildAppWrapper:** كل صفحات `/child-*` مغلفة بـ `ChildAppWrapper` الذي يوفر سياق الطفل.

**ErrorBoundary:** مطبق على: ParentAuth, OTPVerification, ForgotPassword, ParentDashboard, ParentTasks.

### 5.2 كل الصفحات (39 صفحة — من App.tsx)

#### صفحات عامة (5):
| Route | Component | الوظيفة |
|-------|-----------|---------|
| `/` | `Home` | الصفحة الرئيسية (غير كسولة) |
| `/privacy` | `Privacy` | سياسة الخصوصية |
| `/privacy-policy` | `PrivacyPolicy` | تفاصيل الخصوصية |
| `/accessibility` | `AccessibilityPolicy` | سياسة الوصول |
| `/terms` | `Terms` | الشروط والأحكام |

#### صفحات المصادقة (4):
| Route | Component | ملاحظات |
|-------|-----------|---------|
| `/parent-auth` | `ParentAuth` | غير كسولة + ErrorBoundary |
| `/otp` | `OTPVerification` | ErrorBoundary |
| `/forgot-password` | `ForgotPassword` | ErrorBoundary |
| `/admin` | `AdminAuth` | — |

#### صفحات الوالد (13):
| Route | Component |
|-------|-----------|
| `/parent-dashboard` | `ParentDashboard` (ErrorBoundary) |
| `/child-link` | `ChildLink` (غير كسولة) |
| `/parent-store` | `ParentStore` |
| `/parent-store-multi` | `ParentStoreMulti` |
| `/parent-inventory` | `ParentInventory` |
| `/parent-tasks` | `ParentTasks` (ErrorBoundary) |
| `/assign-task` | `AssignTask` |
| `/wallet` | `Wallet` |
| `/notifications` | `Notifications` |
| `/subjects` | `Subjects` |
| `/subject-tasks` | `SubjectTasks` |
| `/settings` | `Settings` |
| `/create-task` | **DEPRECATED** → Redirect to `/parent-tasks` (remove after 2026-02-20) |

#### صفحات الطفل (9 — كلها مغلفة بـ ChildAppWrapper):
| Route | Component |
|-------|-----------|
| `/child-games` | `ChildGames` |
| `/child-store` | `ChildStore` |
| `/child-gifts` | `ChildGifts` |
| `/child-notifications` | `ChildNotifications` |
| `/child-rewards` | `ChildRewards` |
| `/child-progress` | `ChildProgress` |
| `/child-tasks` | `ChildTasks` |
| `/child-profile` | `ChildProfile` |
| `/child-settings` | `ChildSettings` |

#### صفحات الأدمن (2):
| Route | Component |
|-------|-----------|
| `/admin-dashboard` | `AdminDashboard` |
| `/admin/purchases` | `AdminPurchasesTab` |

#### صفحات المكتبة (3):
| Route | Component |
|-------|-----------|
| `/library/login` | `LibraryLogin` |
| `/library/dashboard` | `LibraryDashboard` |
| `/library-store` | `LibraryStore` |

#### صفحة 404:
| Route | Component |
|-------|-----------|
| `*` (catch-all) | `NotFound` |

### 5.3 المكونات الرئيسية (من client/src/components/)

```
ui/                         ← shadcn/ui (20+ Radix-based components)
admin/                      ← Admin dashboard components
child/                      ← Child interface components
dashboard/                  ← Parent dashboard widgets
forms/                      ← Form building blocks
notifications/              ← Notification rendering

Top-level components:
├── AdBanner.tsx             ← عرض إعلانات
├── AnnualReportChart.tsx    ← تقرير سنوي (Recharts)
├── ChildAppWrapper.tsx      ← سياق صفحات الطفل
├── ChildPermissionsSetup.tsx← إعداد صلاحيات الطفل
├── ErrorBoundary.tsx        ← معالجة أخطاء React
├── GrowthTree.tsx           ← شجرة نمو الطفل المرئية
├── LanguageSelector.tsx     ← AR ↔ EN toggle
├── MandatoryTaskModal.tsx   ← نافذة مهمة إلزامية
├── ObjectUploader.tsx       ← رفع ملفات (Uppy)
├── OTPInput.tsx             ← إدخال 6 أرقام OTP
├── OTPMethodSelector.tsx    ← اختيار طريقة OTP (email/SMS)
├── PhoneInput.tsx           ← إدخال رقم هاتف دولي
├── PWAInstallButton.tsx     ← زر تثبيت PWA
├── PWAInstallGate.tsx       ← بوابة تثبيت PWA
├── SEOProvider.tsx          ← Dynamic meta tags
├── SMSVerification.tsx      ← تحقق SMS
├── SocialLoginButtons.tsx   ← Google/Facebook/Apple login
└── SplashScreen.tsx         ← شاشة تحميل
```

### 5.4 Hooks المخصصة

| Hook | الملف | الوظيفة |
|------|-------|---------|
| API Queries | `hooks/api/` | TanStack Query hooks لكل endpoint |
| `useApiQueries` | `hooks/useApiQueries.ts` | Query wrappers مجمعة |
| `useAutoLogin` | `hooks/useAutoLogin.ts` | تسجيل دخول تلقائي (localStorage token) |
| `useChildAuth` | `hooks/useChildAuth.ts` | مصادقة الطفل وسياقه |
| `useSEO` | `hooks/useSEO.tsx` | إعداد SEO ديناميكي |
| `useSMSOTP` | `hooks/useSMSOTP.ts` | OTP عبر SMS |
| `useToast` | `hooks/use-toast.ts` | Toast notifications |
| `useMobile` | `hooks/use-mobile.tsx` | اكتشاف الموبايل |
| `useUpload` | `hooks/use-upload.ts` | رفع ملفات |

---

## 6. البنية التحتية (Docker)

> **المصدر:** `docker-compose.yml` — 422 سطر مقروء بالكامل

### 6.1 ملخص الحاويات

| # | الحاوية | الصورة | المنفذ | الذاكرة (حد) | الوظيفة |
|---|---------|--------|--------|-------------|---------|
| 1 | `traefik` | traefik:v2.11 | 80, 443 | 256M | Reverse proxy + SSL |
| 2 | `app` | node:20-alpine (custom) | 5000 | 1G | Express + React |
| 3 | `db` | postgres:15.7-alpine | 5433→5432 | 512M | PostgreSQL |
| 4 | `redis` | redis:7.2-alpine | internal | 256M | Cache |
| 5 | `portainer` | portainer/portainer-ce | 9000 | 512M | إدارة Docker |
| 6 | `pgadmin` | dpage/pgadmin4 | 5050 | 512M | إدارة PostgreSQL |
| 7 | `redis-commander` | rediscommander | 8081 | 256M | مراقبة Redis |
| 8 | `prometheus` | prom/prometheus | 9090 | 512M | جمع المقاييس |
| 9 | `grafana` | grafana/grafana | 3000 | 512M | لوحات بصرية |
| 10 | `loki` | grafana/loki | 3100 | 512M | تجميع السجلات |
| 11 | `mailhog` | mailhog/mailhog | 8025/1025 | 256M | اختبار البريد |

**إجمالي الذاكرة المخصصة:** ~4.5GB (حدود), ~2.5GB (حجز أدنى)

### 6.2 Traefik Configuration

```yaml
SSL: Let's Encrypt ACME via HTTP challenge
Redirect: HTTP → HTTPS (permanent)
Security Headers:
  - HSTS: 63072000 ثانية (سنتان)
  - stsIncludeSubdomains: true
  - frameDeny: true
  - contentTypeNosniff: true
Healthcheck: wget --spider http://localhost/ping
Access Log: buffer 100 entries
Dashboard: disabled (api.dashboard=false)
```

### 6.3 الدومينات (من Traefik labels)

| الخدمة | الدومين |
|--------|---------|
| App | `classi-fy.com` + `www.classi-fy.com` |
| Portainer | `portainer.classi-fy.com` |
| pgAdmin | `pgadmin.classi-fy.com` |
| Redis Commander | `redis-commander.classi-fy.com` |
| Prometheus | `prometheus.classi-fy.com` |
| Grafana | `grafana.classi-fy.com` |
| Mailhog | `mailhog.classi-fy.com` |

### 6.4 PostgreSQL Config

```
max_connections = 200
shared_buffers = 128MB
log_min_duration_statement = 1000 (slow query > 1s)
Auth: scram-sha-256
Local port: 127.0.0.1:5433 (not exposed externally)
```

### 6.5 Redis Config

```
appendonly: yes (persistence)
maxmemory: 128mb
maxmemory-policy: allkeys-lru
Healthcheck: redis-cli ping
```

### 6.6 Volumes (10)

```
postgres_data, redis_data, app_uploads, app_logs, letsencrypt_data,
portainer_data, pgadmin_data, prometheus_data, grafana_data, loki_data
```

### 6.7 Dockerfile (66 سطر — مقروء بالكامل)

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup nodejs && adduser -S appuser -G nodejs -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/migrations ./migrations
RUN npm ci --omit=dev && npm install drizzle-kit tsx
USER appuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:5000/api/health || exit 1
ENTRYPOINT ["sh", "./scripts/docker-entrypoint.sh"]
```

**Security:** Non-root user (appuser, UID 1001, group nodejs)

---

## 7. نظام الأمان

### 7.1 المصادقة (من الكود الفعلي)

| الآلية | التفاصيل |
|--------|---------|
| **JWT** | HS256, expiresIn: "30d", secret من JWT_SECRET env |
| **كلمات المرور** | bcrypt 10 rounds |
| **OTP** | 6 أرقام, bcrypt hashed في DB, 5 دقائق صلاحية, 3 محاولات max |
| **Account Locking** | 5 محاولات فاشلة → قفل 15 دقيقة |
| **Trusted Devices** | SHA-256(deviceId+UA+IP), 45 يوم صلاحية, حد 5 أجهزة |
| **2FA** | تفعيل/إلغاء عبر twoFAEnabled flag |

### 7.2 الحماية

| الآلية | التفاصيل |
|--------|---------|
| **Helmet CSP** | self + inline styles + Google Fonts + GCS images |
| **CORS** | configurable عبر CORS_ORIGIN (comma-separated) مع strict enforcement |
| **Rate Limiting** | 4 limiters (register, login, otp-request, otp-verify) |
| **HTTP Headers** | X-Content-Type-Options: nosniff, X-Frame-Options: DENY, X-XSS-Protection: 1 |
| **Stripe** | Raw body verification لتوقيع webhooks |
| **Docker** | Non-root user (UID 1001) |
| **HSTS** | 63072000 ثانية (سنتان) عبر Traefik |

### 7.3 تنقيح البيانات الحساسة

```javascript
// Keys يتم تنقيحها في error logs (من server/index.ts سطر 54):
REDACT_KEYS = ["password", "otp", "token", "jwt", "authorization", "cookie", "set-cookie"]
```

### 7.4 Parent-Child Ownership

```
كل عملية على طفل تتطلب:
1. استخراج parentId من JWT token
2. فحص parentChild table: UNIQUE(parentId, childId)
3. إذا لم يوجد → UNAUTHORIZED error
4. Cascade delete: حذف الوالد → حذف كل العلاقات
```

---

## 8. المتغيرات البيئية

### مطلوبة (السيرفر يتوقف بدونها — server/index.ts سطر 43):

| المتغير | الاستخدام |
|---------|----------|
| `JWT_SECRET` | توقيع JWT tokens |
| `SESSION_SECRET` | Express sessions |
| `ADMIN_EMAIL` | بريد الأدمن الرئيسي |
| `ADMIN_PASSWORD` | كلمة مرور الأدمن |
| `DATABASE_URL` | PostgreSQL connection string |

### مطلوبة في Docker (docker-compose.yml):

| المتغير | الاستخدام |
|---------|----------|
| `POSTGRES_USER` | اسم مستخدم PostgreSQL |
| `POSTGRES_PASSWORD` | كلمة مرور PostgreSQL |
| `POSTGRES_DB` | اسم قاعدة البيانات (افتراضي: classify_db) |

### اختيارية:

| المتغير | الافتراضي | الاستخدام |
|---------|----------|----------|
| `PORT` | 5000 | منفذ التطبيق |
| `HOST` | 0.0.0.0 | عنوان الاستماع |
| `NODE_ENV` | — | development/production |
| `CORS_ORIGIN` | * | أصول مسموحة |
| `RESEND_API_KEY` | — | Resend Email API |
| `SMTP_HOST` | — | SMTP server |
| `SMTP_PORT` | 587 | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASSWORD` | — | SMTP password |
| `SMTP_FROM` | — | Send from email |
| `SMTP_SECURE` | — | TLS |
| `TWILIO_ACCOUNT_SID` | — | Twilio SMS |
| `TWILIO_AUTH_TOKEN` | — | Twilio auth |
| `TWILIO_PHONE_NUMBER` | — | Twilio from number |
| `REDIS_URL` | redis://redis:6379 | Redis connection |
| `LOG_LEVEL` | info | Pino log level |
| `ADMIN_PANEL_PASSWORD` | — | Admin panel extra security |

---

## 9. تدفقات العمل

### 9.1 تسجيل والد جديد

```
POST /api/auth/register { email, password, name, phoneNumber? }
├── Rate limit: registerLimiter (5/min per IP)
├── Validate: email format, password >= 8 chars
├── normalizeEmail(email) → toLowerCase + trim
├── Check: email uniqueness in parents table
├── bcrypt.hash(password, 10)
├── Generate uniqueCode (6 chars uppercase)
├── INSERT INTO parents
├── jwt.sign({ userId, type: "parent" }, JWT_SECRET, { expiresIn: "30d" })
├── Create notification with linking code
└── Return: { token, userId, uniqueCode }
```

### 9.2 تسجيل دخول مع Account Locking

```
POST /api/auth/login { email, password }
├── Rate limit: loginLimiter (5/min per IP+email)
├── normalizeEmail(email)
├── SELECT from parents WHERE email = ?
├── Check lockedUntil: إذا مقفل → 403 + Retry-After header
├── bcrypt.compare(password, hash)
├── إذا خطأ:
│   ├── failedLoginAttempts++
│   ├── إذا >= 5 → lockedUntil = now + 15min
│   └── Return 401
├── إذا صح:
│   ├── Reset failedLoginAttempts = 0, lockedUntil = null
│   ├── Check twoFAEnabled:
│   │   ├── true → Generate OTP, send via email/SMS
│   │   │         └── Return: { requires2FA: true, otpSent: true }
│   │   └── false → jwt.sign() → Return { token }
│   └── Log to loginHistory
└── Record session in sessions table
```

### 9.3 OTP Verification Flow

```
POST /api/auth/verify-otp { email, code, purpose }
├── Rate limit: otpVerifyLimiter (5/min per IP+email)
├── SELECT pending OTP WHERE parentId = ? AND purpose = ? AND status = "pending"
├── Check expiry: createdAt + 5min > now
├── bcrypt.compare(code, stored hash)
├── إذا خطأ:
│   ├── incrementAttemptsAtomic()
│   ├── إذا attempts >= 3 → blockOTP()
│   └── Return 400
├── إذا صح:
│   ├── markVerifiedAtomic()
│   ├── Supersede all other pending OTPs
│   ├── jwt.sign() → Return { token }
│   └── Optionally trust device
```

### 9.4 شراء من المتجر (Stripe)

```
Parent: POST /api/payments/checkout { items[] }
├── Create Stripe Checkout Session
├── Create storeOrder (status: PENDING, idempotencyKey)
├── Return: { checkoutUrl }

Stripe: POST /api/payments/stripe/webhook
├── Raw body → stripe.webhooks.constructEvent (signature verification)
├── checkout.session.completed:
│   ├── Update storeOrder → PAID
│   ├── Create transaction record
│   ├── Create entitlements per product
│   └── Deduplicate via webhookEvents.dedupeKey
```

### 9.5 نظام الهدايا

```
Parent: POST /api/gifts { childId, productId, pointsThreshold }
├── Validate parent owns child
├── Create gift (status: SENT)
├── emit("gift.sent")

System: Child earns points → giftUnlock check
├── SELECT gifts WHERE childId = ? AND status = SENT
├── Check: child.totalPoints >= gift.pointsThreshold
├── If yes:
│   ├── Update gift → UNLOCKED
│   ├── emit("gift.unlocked")
│   └── Create notification (modal, urgent, sound + vibration)

Child: POST /api/gifts/:id/activate
├── Update gift → ACTIVATED
├── emit("gift.activated")
└── Create notification (toast)
```

---

## 10. خريطة الملفات

```
📁 الجذر (classi-fy.com)
├── package.json              ← 164 سطر, 80+ dependency, ESM module
├── tsconfig.json             ← 35 سطر, strict, ES2020 target
├── vite.config.ts            ← 42 سطر, client/ root, dist/public output
├── drizzle.config.ts         ← 15 سطر, PostgreSQL, ./migrations
├── Dockerfile                ← 66 سطر, multi-stage, node:20-alpine
├── docker-compose.yml        ← 422 سطر, 11 services
├── deploy.sh                 ← VPS deployment script
├── capacitor.config.json     ← Mobile config (classi-fy.com)
│
├── 📁 shared/
│   └── schema.ts             ← 1,471 سطر — 85+ جدول, 64+ فهرس, Zod schemas
│
├── 📁 server/
│   ├── index.ts              ← 301 سطر — Express entry, Helmet, CORS, graceful shutdown
│   ├── storage.ts            ← 35 سطر — pg Pool + Drizzle singleton
│   ├── static.ts             ← 85 سطر — Static serving + SPA fallback + caching
│   ├── vite.ts               ← Vite dev server integration (HMR)
│   ├── mailer.ts             ← 184 سطر — Resend + SMTP
│   ├── sms-otp.ts            ← Twilio SMS
│   ├── notificationHandlers.ts ← 94 سطر — Gift event → notification
│   ├── giftEvents.ts         ← EventEmitter
│   ├── giftUnlock.ts         ← Gift unlock logic
│   ├── notifications.ts      ← createNotification()
│   │
│   ├── 📁 routes/ (20 ملفات)
│   │   ├── index.ts           ← 69 سطر — 18 route groups + health check
│   │   ├── middleware.ts      ← 55 سطر — authMiddleware + adminMiddleware
│   │   ├── auth.ts            ← 2,533 سطر — المصادقة الكاملة
│   │   ├── admin.ts           ← إدارة المستخدمين/المنتجات/الطلبات
│   │   ├── admin.settings.ts  ← إعدادات النظام
│   │   ├── admin-activity.ts  ← سجل النشاط
│   │   ├── admin-analytics.ts ← التحليلات والإحصائيات
│   │   ├── admin-gifts.ts     ← إدارة الهدايا
│   │   ├── admin-notification-settings.ts ← إعدادات الإشعارات
│   │   ├── parent.ts          ← endpoints الوالد
│   │   ├── child.ts           ← endpoints الطفل
│   │   ├── payments.ts        ← Stripe checkout + webhooks
│   │   ├── store.ts           ← المتجر (منتجات, طلبات, فئات)
│   │   ├── referrals.ts       ← نظام الإحالات
│   │   ├── library.ts         ← نظام المكتبات/التجار
│   │   ├── media-uploads.ts   ← رفع وسائط (MinIO)
│   │   ├── trusted-devices.ts ← إدارة الأجهزة الموثوقة
│   │   ├── ads.ts             ← نظام الإعلانات
│   │   ├── parent-linking.ts  ← ربط الآباء بالأطفال
│   │   └── 📁 __tests__/      ← اختبارات Route
│   │
│   ├── 📁 services/
│   │   ├── otpService.ts      ← 201 سطر — OTP generation/verification
│   │   ├── pointsService.ts   ← حساب وتوزيع النقاط
│   │   ├── uploadService.ts   ← رفع ملفات
│   │   └── mediaWorker.ts     ← Background media cleanup
│   │
│   ├── 📁 utils/
│   │   ├── apiResponse.ts     ← 76 سطر — Response helpers + ErrorCode enum
│   │   ├── rateLimiters.ts    ← 42 سطر — 4 rate limiters
│   │   └── otpMonitoring.ts   ← OTP event tracking
│   │
│   └── 📁 providers/otp/
│       ├── bootstrap.ts       ← إنشاء مزودي OTP الافتراضيين
│       └── providerFactory.ts ← اختيار المزود (email/sms)
│
├── 📁 client/src/
│   ├── App.tsx               ← 232 سطر — Router (39 routes), Providers
│   ├── main.tsx              ← Entry point
│   ├── 📁 pages/ (39 ملف)
│   │   ├── Home.tsx, ParentAuth.tsx, ChildLink.tsx (eager)
│   │   ├── ParentDashboard.tsx ... ParentTasks.tsx (13 parent pages, lazy)
│   │   ├── ChildGames.tsx ... ChildSettings.tsx (9 child pages, lazy)
│   │   ├── AdminDashboard.tsx, AdminAuth.tsx, AdminPurchasesTab.tsx (admin)
│   │   ├── LibraryLogin.tsx, LibraryDashboard.tsx, LibraryStore.tsx (library)
│   │   ├── OTPVerification.tsx, ForgotPassword.tsx (auth flow)
│   │   ├── Privacy.tsx, PrivacyPolicy.tsx, AccessibilityPolicy.tsx, Terms.tsx
│   │   └── not-found.tsx
│   │
│   ├── 📁 components/ (50+)
│   │   ├── 📁 ui/ (20+ shadcn components)
│   │   ├── 📁 admin/ — Admin panel components
│   │   ├── 📁 child/ — Child-specific UI
│   │   ├── 📁 dashboard/ — Dashboard widgets
│   │   ├── 📁 forms/ — Form components
│   │   ├── 📁 notifications/ — Notification UI
│   │   └── 20+ top-level components
│   │
│   ├── 📁 hooks/ (10+)
│   │   ├── 📁 api/ — TanStack Query hooks
│   │   └── useAutoLogin, useChildAuth, useSEO, useSMSOTP, etc.
│   │
│   ├── 📁 contexts/ — ThemeContext
│   ├── 📁 i18n/ — Arabic/English translations
│   └── 📁 lib/ — queryClient, utils
│
├── 📁 scripts/
│   ├── manage-admin.js       ← npm run admin:setup / admin:reset
│   ├── docker-entrypoint.sh  ← Container start script
│   ├── check_env.sh          ← Environment validation
│   └── check_env_dynamic.cjs ← Dynamic env check
│
├── 📁 monitoring/
│   ├── prometheus.yml        ← Prometheus scrape config
│   ├── loki-config.yml       ← Loki aggregation
│   └── 📁 grafana/provisioning/ ← Grafana datasources
│
├── 📁 migrations/            ← Drizzle migration files
├── 📁 android/               ← Capacitor Android project
├── 📁 ios/                   ← Capacitor iOS project
└── 📁 nginx/                 ← Nginx config (alternative to Traefik)
```

---

## 11. أوامر التشغيل

```bash
# === تطوير ===
npm install                    # تثبيت كل المكتبات
npm run dev                    # تشغيل dev server (Express + Vite HMR)
npm run db:push                # مزامنة schema.ts مع PostgreSQL

# === إنتاج ===
npm run build                  # بناء frontend (Vite) + backend (esbuild)
npm run start                  # NODE_ENV=production node dist/index.js

# === إدارة ===
npm run admin:setup            # مزامنة بيانات الأدمن من .env
npm run check-env              # التحقق من المتغيرات البيئية

# === اختبار ===
npm run test                   # Vitest run

# === Docker (إنتاج) ===
docker-compose up -d --build              # بناء وتشغيل 11 حاوية
docker-compose logs -f app                # عرض سجلات التطبيق
docker-compose exec app npm run db:push   # تشغيل migrations
docker-compose down                       # إيقاف كل الحاويات
docker-compose restart app                # إعادة تشغيل التطبيق فقط

# === صيانة ===
docker system prune -af                   # تنظيف Docker
docker volume ls                          # عرض البيانات المحفوظة
```

---

## 12. الملخص الإحصائي

| المقياس | الرقم | المصدر |
|---------|-------|--------|
| **جداول قاعدة البيانات** | 85+ | shared/schema.ts |
| **فهارس محسنة** | 64+ | shared/schema.ts |
| **أسطر schema.ts** | 1,471 | قراءة مباشرة |
| **أسطر auth.ts** | 2,533 | قراءة مباشرة |
| **أسطر server/index.ts** | 301 | قراءة مباشرة |
| **أسطر App.tsx** | 232 | قراءة مباشرة |
| **أسطر docker-compose.yml** | 422 | قراءة مباشرة |
| **Route files** | 20 ملف | server/routes/ |
| **Route groups مسجلة** | 18 | server/routes/index.ts |
| **صفحات Frontend** | 39 | client/src/App.tsx |
| **مكونات UI** | 50+ | client/src/components/ |
| **Hooks مخصصة** | 10+ | client/src/hooks/ |
| **حاويات Docker** | 11 | docker-compose.yml |
| **خدمات Backend** | 14+ | server/services/ + utils/ |
| **Dependencies** | 80+ | package.json |
| **DevDependencies** | 20+ | package.json |
| **أدوات مراقبة** | 7 | docker-compose.yml |
| **Volumes** | 10 | docker-compose.yml |
| **Rate Limiters** | 4 | server/utils/rateLimiters.ts |
| **Error Codes** | 12 | server/utils/apiResponse.ts |
| **دومينات فرعية** | 7 | docker-compose.yml labels |

---

> **ملاحظة هامة:** هذا التحليل مبني بالكامل على **قراءة الكود المصدري الفعلي** — لا تخمين، لا افتراض، لا بيانات من تدريب. كل رقم وكل سطر وكل وظيفة مأخوذة من الملفات الحقيقية في المشروع.
