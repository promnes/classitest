# خطة الإصلاح الأمني الشاملة — Classify Platform

**التاريخ:** 2026-02-27
**الحالة:** في انتظار الموافقة قبل التنفيذ
**الأولوية:** يجب إكمال كل المراحل قبل نزول الإنتاج

---

## الملخص التنفيذي

تم اكتشاف **23 مشكلة أمنية** عبر فحص عميق للكود:
- 🔴 **CRITICAL:** 7 مشاكل (ممكن تخرّب قاعدة البيانات أو تسرق أموال)
- 🟠 **HIGH:** 5 مشاكل (ممكن تُستغل لسرقة حسابات)
- 🟡 **MEDIUM:** 8 مشاكل (يفضل إصلاحها)
- 🟢 **LOW:** 3 مشاكل (تحسينات)

---

## المرحلة 1: الثغرات الحرجة — CRITICAL (إلزامي قبل الإنتاج)

### 1.1 🔴 SQL Injection — أخطر ثغرة

**الملف:** `server/routes/child.ts` سطر ~4214
**المشكلة:** `postIds` من المستخدم تُدخل مباشرة في `sql.raw()` بدون تنظيف
```typescript
// الكود الحالي (خطير):
sql.raw(`ARRAY[${postIds.map((id: string) => `'${id}'`).join(",")}]`)
// هجوم محتمل: postIds: ["'; DROP TABLE children; --"]
```

**الإصلاح:**
```typescript
// الكود الآمن:
const likes = await db.select({ postId: childPostLikes.postId })
  .from(childPostLikes)
  .where(and(
    eq(childPostLikes.childId, childId),
    inArray(childPostLikes.postId, postIds.map(String))
  ));
```
- استخدام `inArray()` من Drizzle بدل `sql.raw()`
- إضافة تحقق: `postIds.every(id => typeof id === 'string' && id.length < 50)`
- **الأثر:** صفر — نفس النتيجة بأمان كامل

---

### 1.2 🔴 نقاط إعلانات لا نهائية

**الملف:** `server/routes/ads.ts` سطر ~92
**المشكلة:** 3 مشاكل مجتمعة:
1. `watchedDuration` يُرسلها الكلاينت — الطفل يقول "شاهدت 30 ثانية" بدون مشاهدة فعلية
2. لا يوجد rate limiting على الإطلاق
3. لا يوجد cooldown — نفس الإعلان يُشاهد 1000 مرة في الدقيقة

**الإصلاح (3 طبقات حماية):**

```typescript
// 1. Rate limiter: 10 مشاهدات في الساعة كحد أقصى
const adWatchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 10,
  keyGenerator: (req) => `ad-watch:${req.user.userId}`,
  message: "Too many ad watches"
});

// 2. Server-side timing: لا نثق بالكلاينت
// عند بدء المشاهدة: POST /child/ads/:adId/start → يحفظ timestamp في Redis/DB
// عند الانتهاء: POST /child/ads/:adId/complete → يحسب الفرق من السيرفر
const startTime = await getAdWatchStart(childId, adId); // من Redis
const actualDuration = (Date.now() - startTime) / 1000;
const isCompleted = actualDuration >= ad.watchDurationSeconds * 0.8; // 80% tolerance

// 3. Cooldown: نفس الإعلان مرة واحدة كل 5 دقائق
const lastWatch = await db.select().from(adWatchHistory)
  .where(and(
    eq(adWatchHistory.childId, childId),
    eq(adWatchHistory.adId, adId),
    gt(adWatchHistory.createdAt, sql`NOW() - INTERVAL '5 minutes'`)
  )).limit(1);
if (lastWatch.length > 0) return res.status(429).json(errorResponse(...));

// 4. حد يومي: 50 نقطة إعلانات في اليوم
const dailyAdPoints = await getDailyAdPoints(childId); // SUM of today's ad points
if (dailyAdPoints >= 50) return res.status(429).json(errorResponse(...));
```

---

### 1.3 🔴 Race Condition — سقي الشجرة (Double-Spend)

**الملف:** `server/routes/child.ts` سطر ~2622
**المشكلة:** خمس عمليات منفصلة بدون transaction:
1. فحص الحد اليومي ← 2. فحص النقاط ← 3. خصم النقاط ← 4. تسجيل السقي ← 5. تحديث الشجرة

طلبان متزامنان: كلاهما يقرأ "النقاط = 100"، كلاهما يخصم 10، النتيجة: 90 بدل 80

**الإصلاح:**
```typescript
app.post("/api/child/water-tree", authMiddleware, async (req: any, res) => {
  const result = await db.transaction(async (tx) => {
    // 1. قفل صف الطفل (SELECT FOR UPDATE)
    const [child] = await tx.select().from(children)
      .where(eq(children.id, childId))
      .for("update"); // يمنع أي طلب آخر من القراءة حتى ينتهي هذا

    // 2. فحص الحد اليومي (داخل الـ tx)
    const todayCount = await tx.select({ count: sql`COUNT(*)` })
      .from(treeWateringLog)
      .where(and(
        eq(treeWateringLog.childId, childId),
        gt(treeWateringLog.createdAt, sql`CURRENT_DATE`)
      ));
    if (Number(todayCount[0].count) >= config.maxDailyWaterings) throw "DAILY_LIMIT";

    // 3. فحص وخصم النقاط (atomic)
    const { newTotalPoints } = await applyPointsDelta(tx, {
      childId, delta: -config.wateringCostPoints,
      reason: "TREE_WATERING", requestId: `water-${childId}-${Date.now()}`
    });

    // 4. تسجيل السقي
    await tx.insert(treeWateringLog).values({ childId, ... });

    // 5. تحديث الشجرة
    await tx.update(trees).set({ waterLevel: sql`water_level + 1` })...;

    return { newTotalPoints };
  });
  res.json(successResponse(result));
});
```

---

### 1.4 🔴 Race Condition — شراء مهمة معلم (Double-Spend)

**الملف:** `server/routes/marketplace.ts` سطر ~297
**المشكلة:** فحص الرصيد ثم الخصم بدون atomicity

**الإصلاح:**
```typescript
const result = await db.transaction(async (tx) => {
  // Atomic: يخصم فقط إذا الرصيد كافي
  const updated = await tx.update(parentWallet)
    .set({ balance: sql`${parentWallet.balance} - ${price.toFixed(2)}` })
    .where(and(
      eq(parentWallet.parentId, parentId),
      sql`${parentWallet.balance} >= ${price}`  // ← الحارس الذري
    ))
    .returning();

  if (updated.length === 0) throw new Error("INSUFFICIENT_BALANCE");

  // ... إنشاء الطلب (داخل الـ tx)
  await tx.insert(teacherTaskPurchases).values({ ... });
  return updated[0];
});
```

---

### 1.5 🔴 JWT Secret بقيمة افتراضية مكشوفة

**الملف:** `server/routes/middleware.ts` سطر 3
**المشكلة:** `const JWT_SECRET = process.env.JWT_SECRET || "classify-app-2025-secret"`

**الإصلاح:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required");
  process.exit(1);
}
```
- إزالة الـ fallback نهائياً
- Fail-fast في كل البيئات (مش production بس)

---

### 1.6 🔴 أدوات الإدارة مكشوفة على الإنترنت

**الملف:** `docker-compose.yml` أسطر 253-315
**المشكلة:** PgAdmin, Redis Commander, MailHog كلها على subdomains عامة بدون أي حماية

**الإصلاح (3 خيارات — نختار واحد):**

**الخيار أ (الأفضل): إزالة الـ Traefik labels وكشف local فقط**
```yaml
pgadmin:
  # حذف كل labels الخاصة بـ traefik
  ports:
    - "127.0.0.1:5050:80"  # فقط من localhost عبر SSH tunnel

redis-commander:
  ports:
    - "127.0.0.1:8081:8081"

mailhog:
  ports:
    - "127.0.0.1:8025:8025"
```
الوصول عبر SSH tunnel: `ssh -L 5050:localhost:5050 user@server`

**الخيار ب: إضافة Basic Auth عبر Traefik**
```yaml
# إنشاء middleware للمصادقة
labels:
  - "traefik.http.middlewares.admin-auth.basicauth.users=admin:$$apr1$$..."
  - "traefik.http.routers.pgadmin.middlewares=admin-auth"
```

**الخيار ج: تقييد بـ IP**
```yaml
labels:
  - "traefik.http.middlewares.admin-ip.ipwhitelist.sourcerange=YOUR_IP/32"
  - "traefik.http.routers.pgadmin.middlewares=admin-ip"
```

---

### 1.7 🔴 كلمات سر MinIO افتراضية

**الملف:** `docker-compose.yml` أسطر 115-116
**المشكلة:** `classifyminio` / `classifyminio123`

**الإصلاح:**
```yaml
- MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY is required}
- MINIO_SECRET_KEY=${MINIO_SECRET_KEY:?MINIO_SECRET_KEY is required}
```
- إزالة القيم الافتراضية
- استخدام `:?` بدل `:-` ← Docker يرفض البدء إذا غير موجودة
- إضافة كلمات سر قوية في `.env` على السيرفر

---

## المرحلة 2: ثغرات عالية الخطورة — HIGH

### 2.1 🟠 JWT طويل المدة (30 يوم) بدون إلغاء

**الملف:** `server/routes/auth.ts`
**المشكلة:** توكن مسروق = وصول كامل لمدة شهر

**الإصلاح (متدرج):**
```
الخطوة 1: تقليل مدة JWT إلى 7 أيام (تغيير بسيط)
  { expiresIn: "30d" } → { expiresIn: "7d" }

الخطوة 2 (مستقبلاً): تقليل إلى 1 ساعة + refresh token
  - JWT: { expiresIn: "1h" }
  - Refresh token: 30 يوم في DB، يتجدد عند كل استخدام
  - عند logout: حذف refresh token من DB
```
**سننفذ الخطوة 1 فقط الآن** (آمن كفاية + لا يكسر الجلسات الحالية)

---

### 2.2 🟠 cookie-parser غير مثبت (Trusted Device معطل)

**الملف:** `server/routes/auth.ts` سطر ~2387
**المشكلة:** `req.cookies?.device_refresh` دايماً `undefined`

**الإصلاح:**
```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```
```typescript
// server/index.ts — إضافة middleware
import cookieParser from "cookie-parser";
app.use(cookieParser());
```

---

### 2.3 🟠 Race Condition — تفعيل الإحالة (Double Reward)

**الملف:** `server/routes/referrals.ts` سطر ~162
**المشكلة:** تحديث الحالة وإضافة الرصيد بدون transaction

**الإصلاح:**
```typescript
const result = await db.transaction(async (tx) => {
  // 1. قفل صف الإحالة (FOR UPDATE)
  const [referral] = await tx.select().from(referrals)
    .where(eq(referrals.id, referralId))
    .for("update");
  
  if (referral.status !== "active") throw "ALREADY_PROCESSED";

  // 2. تحديث الحالة → rewarded
  await tx.update(referrals).set({ status: "rewarded" }).where(...);

  // 3. إضافة الرصيد (atomic)
  await tx.update(parentWallet)
    .set({ balance: sql`${parentWallet.balance} + ${rewardPoints}` })
    .where(eq(parentWallet.parentId, referral.referrerId));

  return referral;
});
```

---

### 2.4 🟠 لا يوجد تحقق من قيمة `pointsReward` في إنشاء المهام

**الملف:** `server/routes/parent.ts` سطر ~655
**المشكلة:** قيمة سالبة تزيد الرصيد بدل ما تنقصه

**الإصلاح:**
```typescript
// بعد قراءة req.body:
const pointsRewardNum = Number(pointsReward);
if (!Number.isInteger(pointsRewardNum) || pointsRewardNum < 1 || pointsRewardNum > 10000) {
  return res.status(400).json(errorResponse(
    ErrorCode.BAD_REQUEST,
    "pointsReward must be a positive integer between 1 and 10,000"
  ));
}
```

---

### 2.5 🟠 PgAdmin كلمة سر `admin123`

**الملف:** `docker-compose.yml` سطر 259

**الإصلاح:**
```yaml
PGADMIN_DEFAULT_PASSWORD: ${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}
```
- إزالة `:-admin123`
- تعيين كلمة سر قوية في `.env`

---

## المرحلة 3: ثغرات متوسطة — MEDIUM

### 3.1 🟡 Rate Limiting على endpoints الماليّة

**Endpoints المتأثرة:**
- `POST /api/child/answer-task`
- `POST /api/child/complete-game`
- `POST /api/child/water-tree`
- `POST /api/child/ads/:adId/watch`
- `POST /api/parent/gifts/send`
- `POST /api/parent/buy-teacher-task`
- `POST /api/referrals/activate`

**الإصلاح:**
```typescript
// rate-limiters.ts — ملف مركزي
import rateLimit from "express-rate-limit";

export const financialLimiter = rateLimit({
  windowMs: 60 * 1000,  // دقيقة
  max: 10,              // 10 طلبات في الدقيقة
  keyGenerator: (req: any) => req.user?.userId || req.ip,
  message: { success: false, error: "RATE_LIMITED", message: "Too many requests" }
});

export const gamePlayLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 ألعاب في الدقيقة
  keyGenerator: (req: any) => req.user?.userId || req.ip,
});

// تطبيق على كل endpoint:
app.post("/api/child/water-tree", authMiddleware, financialLimiter, async ...);
app.post("/api/child/complete-game", authMiddleware, gamePlayLimiter, async ...);
```

---

### 3.2 🟡 Idempotency Key ضعيف في complete-game

**الملف:** `server/routes/child.ts` سطر ~1058
**المشكلة:** `requestId: \`game-${gameId}-${Date.now()}\`` — كل طلب فريد

**الإصلاح:**
```typescript
// الكلاينت يرسل requestId فريد لكل جلسة لعب
const { gameId, score, requestId } = req.body;

// تحقق من وجود requestId
if (!requestId || typeof requestId !== 'string' || requestId.length > 100) {
  return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "requestId required"));
}

// استخدام requestId من الكلاينت (UUID يُولد مرة عند بدء اللعبة)
const result = await db.transaction(async (tx) => {
  const { newTotalPoints } = await applyPointsDelta(tx, {
    childId, delta: earnedPoints,
    reason: "GAME_COMPLETED",
    requestId: `game-${gameId}-${requestId}`, // requestId من الكلاينت
  });
```

---

### 3.3 🟡 `recalcWalletBalance` لا يأخذ نوع التحويل بالاعتبار

**الملف:** `server/utils/walletHelper.ts`
**المشكلة:** يجمع كل amounts كأرقام موجبة بغض النظر عن نوع SPEND/DEPOSIT

**الإصلاح:**
```typescript
export async function recalcWalletBalance(walletId: string) {
  // حساب الرصيد في SQL مباشرة (أسرع + atomic)
  const [result] = await db.select({
    total: sql<string>`COALESCE(SUM(
      CASE 
        WHEN ${walletTransfers.type} = 'SPEND' THEN -ABS(${walletTransfers.amount}::numeric)
        WHEN ${walletTransfers.type} = 'REFUND' THEN ABS(${walletTransfers.amount}::numeric)
        ELSE ABS(${walletTransfers.amount}::numeric)
      END
    ), 0)`
  }).from(walletTransfers).where(eq(walletTransfers.walletId, walletId));

  await db.update(wallets)
    .set({ balance: result.total })
    .where(eq(wallets.id, walletId));
}
```

---

### 3.4 🟡 `/api/referrals/apply` بدون Authentication

**الملف:** `server/routes/referrals.ts` سطر ~103

**الإصلاح:**
```typescript
// إضافة authMiddleware
app.post("/api/referrals/apply", authMiddleware, async (req: any, res) => {
  const parentId = req.user.userId; // بدل ما يرسلها الكلاينت
  // ...
});
```

---

### 3.5 🟡 CORS افتراضياً `*`

**الملف:** `server/index.ts` سطر ~161

**الإصلاح:**
```typescript
const CORS_ORIGIN = process.env.CORS_ORIGIN;
if (!CORS_ORIGIN && process.env.NODE_ENV === "production") {
  console.error("FATAL: CORS_ORIGIN must be set in production");
  process.exit(1);
}
const allowedOrigins = (CORS_ORIGIN || "http://localhost:5000").split(",")...;
```

---

### 3.6 🟡 CSP يسمح `unsafe-inline` للسكربتات

**الملف:** `server/index.ts` سطر ~83

**الإصلاح (مرحلي):**
```typescript
// المرحلة 1: لا تغيير الآن (Vite يحتاج unsafe-inline في development)
// المرحلة 2: في production، إزالته بعد التأكد من عدم وجود inline scripts
scriptSrc: process.env.NODE_ENV === "production"
  ? ["'self'"]
  : ["'self'", "'unsafe-inline'"],
```

---

### 3.7 🟡 XSS عبر `dangerouslySetInnerHTML`

**الملف:** `client/src/components/admin/LegalTab.tsx`

**الإصلاح:**
```bash
npm install dompurify
npm install -D @types/dompurify
```
```typescript
import DOMPurify from "dompurify";
// ...
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentContent) }} />
```

---

### 3.8 🟡 PIN Login بدون Lockout

**الملف:** `server/routes/auth.ts` سطر ~2728

**الإصلاح:**
```typescript
// إضافة حد على مستوى familyCode (ليس IP فقط)
const pinLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات
  keyGenerator: (req) => `pin:${req.body.familyCode || req.ip}`,
  message: { success: false, error: "RATE_LIMITED", message: "Too many PIN attempts. Try again in 15 minutes." }
});

app.post("/api/auth/pin-login", pinLoginLimiter, async (req, res) => { ... });
```

---

### 3.9 🟡 Child Token Scope غير مقيّد

**الملف:** `server/routes/middleware.ts`

**الإصلاح:**
```typescript
// middleware جديد للتأكد أن الطلب من parent فقط
export const parentOnlyMiddleware = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.type !== "parent") {
    return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Parent access only"));
  }
  next();
};

// تطبيق على endpoints الأهل:
app.post("/api/parent/create-task", authMiddleware, parentOnlyMiddleware, async ...);
app.post("/api/parent/gifts/send", authMiddleware, parentOnlyMiddleware, async ...);
```

---

## المرحلة 4: تحسينات — LOW + Production Hardening

### 4.1 🟢 رفع bcrypt rounds من 10 إلى 12

### 4.2 🟢 تقليل JSON body size limit من 10MB إلى 2MB

### 4.3 🟢 إضافة magic-byte validation لرفع الملفات

### 4.4 🟢 إضافة `pin`, `secret`, `refreshToken` لقائمة REDACT_KEYS

### 4.5 🟢 Deposit Approval — لف في transaction
```typescript
// admin.ts — PUT /api/admin/deposits/:id
const result = await db.transaction(async (tx) => {
  const [deposit] = await tx.select().from(deposits)
    .where(eq(deposits.id, id))
    .for("update");
  if (deposit.status === "completed") throw "ALREADY_COMPLETED";
  // update + credit inside tx
});
```

### 4.6 🟢 Admin Adjust-Points (Parent Path) — لف في transaction

### 4.7 🟢 Gift Sending — لف idempotency check في transaction

### 4.8 🟢 Nginx Rate Limiting
```nginx
# nginx.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

server {
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass ...;
    }
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass ...;
    }
}
```

---

## ترتيب التنفيذ المقترح

| الترتيب | المهمة | الوقت المقدّر | الأثر |
|---------|--------|--------------|-------|
| **1** | SQL Injection fix (1.1) | 5 دقائق | يمنع تدمير قاعدة البيانات |
| **2** | Race Conditions: water-tree + buy-task + referral (1.3, 1.4, 2.3) | 30 دقيقة | يمنع سرقة النقاط والأموال |
| **3** | Ad watch rate limit + server timing (1.2) | 20 دقيقة | يمنع نقاط لانهائية |
| **4** | JWT secret + Docker security (1.5, 1.6, 1.7, 2.5) | 15 دقيقة | يمنع اختراق السيرفر |
| **5** | pointsReward validation (2.4) | 5 دقائق | يمنع التلاعب بالمهام |
| **6** | Rate limiters على endpoints مالية (3.1) | 15 دقيقة | يحد من الاستغلال |
| **7** | JWT expiry + cookie-parser (2.1, 2.2) | 10 دقائق | يحسن أمان الجلسات |
| **8** | باقي المرحلة 3 + 4 | 30 دقيقة | تقوية شاملة |

**الوقت الإجمالي المقدّر: ~2.5 ساعة**

---

## ما لا يحتاج إصلاح (سليم ✅)

- ✅ Task submission — transaction + optimistic lock
- ✅ Store checkout — atomic WHERE + rate limiter
- ✅ Parent task creation wallet deduction — atomic
- ✅ `applyPointsDelta` — SELECT FOR UPDATE
- ✅ Deposit creation — dedup + amount validation
- ✅ Gift sending — ownership checks
- ✅ Dockerfile — hardened (non-root, alpine, health check)
- ✅ `.env` in `.gitignore`
- ✅ Helmet + trust proxy configured
- ✅ Password hashing (bcrypt)

---

## ملاحظات إضافية للنشر

### على السيرفر (VPS):
1. تأكد أن `.env` يحتوي على:
   - `JWT_SECRET=<random-64-char-string>`
   - `MINIO_ACCESS_KEY=<strong-key>`
   - `MINIO_SECRET_KEY=<strong-secret>`
   - `ADMIN_PASSWORD=<strong-password>`
   - `CORS_ORIGIN=https://classi-fy.com`
2. بعد النشر: `docker compose exec app npx drizzle-kit push`
3. اختبر: `curl -i https://classi-fy.com/api/health`

### اختبارات يدوية مطلوبة:
- [ ] تسجيل دخول عادي (OTP)
- [ ] تسجيل دخول بـ PIN
- [ ] إنشاء مهمة وحل المهمة
- [ ] شراء من المتجر
- [ ] مشاهدة إعلان (تأكد من الحد)
- [ ] سقي الشجرة
- [ ] إرسال هدية
- [ ] فحص الرصيد بعد كل عملية
