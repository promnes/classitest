# 📊 تحليل مشروع Classify الشامل

> **تاريخ التحليل:** 31 يناير 2026  
> **المحلل:** Claude Opus 4.5  
> **إصدار التحليل:** 1.0

---

## 📌 نظرة عامة

**Classify** هو تطبيق تعليمي للأطفال مع نظام رقابة أبوية متكامل. يهدف لتحفيز الأطفال على التعلم من خلال نظام المهام والمكافآت والنقاط.

### التقنيات المستخدمة

| المكون | التقنية |
|--------|---------|
| **Backend** | Express.js (Node 18+) |
| **Frontend** | React + Vite + TypeScript |
| **Database** | PostgreSQL 14+ |
| **ORM** | Drizzle ORM |
| **State Management** | TanStack Query (React Query) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Authentication** | JWT + bcrypt + OTP |
| **Payments** | Stripe |
| **Deployment** | Docker + Nginx |

---

## 🗃️ هيكل قاعدة البيانات (50+ جدول)

### 👥 المستخدمون الأساسيون

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   parents   │────▶│ parentChild │◀────│  children   │
│             │     │   (many)    │     │             │
│ - id        │     │ - parentId  │     │ - id        │
│ - email     │     │ - childId   │     │ - name      │
│ - password  │     │ - linkedAt  │     │ - totalPoints│
│ - name      │     └─────────────┘     │ - avatarUrl │
│ - uniqueCode│                         └─────────────┘
│ - twoFAEnabled│
└─────────────┘
       │
       ▼
┌─────────────┐
│   admins    │
│ - email     │
│ - password  │
│ - role      │
└─────────────┘
```

### 📋 نظام المهام

```
parents ──┐
          ├──▶ tasks ──▶ taskResults ──▶ children
children ─┘       │
                  ▼
              subjects
              (رياضيات، لغة، علوم...)
```

**الحقول المهمة في `tasks`:**
- `question`: نص السؤال
- `answers`: JSON array مع `{id, text, isCorrect}`
- `pointsReward`: النقاط المكتسبة
- `status`: pending | completed
- `subjectId`: الربط بالمادة

### ✅ منطق اكتمال مهام الطفل (الحالي والمستهدف)

**الحالي (تشغيليًا):**
- واجهات الطفل تعتمد على `/api/child/submit-task` و`/api/child/answer-task` لتسجيل نتيجة الإجابة.
- المهام تظهر من `/api/child/tasks` و`/api/child/pending-tasks` بالاعتماد على `tasks.status`.
- إشعارات المهام تُسحب دوريًا من `/api/child/task-notifications`.

**المشكلة التي تظهر للمستخدم:**
- إذا لم تُحدَّث حالة المهمة إلى `completed` عند الإجابة الصحيحة، تبقى المهمة في `pending` وتُعاد للطفل بعد حلّها، ويستمر ظهور رسالة التهنئة/الإشعار بشكل متكرر.
- إذا كانت الإجابات تُخزن بدون ضبط واضح لـ `isCorrect` أو بدون تطبيع موحد، قد تبدو كل الإجابات صحيحة أو يتم قبول إجابة غير صحيحة.

**المنطق الصحيح المقترح:**
- عند إجابة صحيحة: تحديث `tasks.status` إلى `completed` بشكل ذري، ثم إنشاء `taskResults` مرة واحدة، ثم منح النقاط مرة واحدة.
- عند تكرار الإجابة لنفس المهمة: إعادة نفس نتيجة النجاح بدون تكرار النقاط.
- منع قبول إجابة غير موجودة ضمن `answers`، ومنع قبول أكثر من إجابة صحيحة في تعريف المهمة.
- تطبيع `answers` عند إنشاء المهمة لضمان وجود `id` واحد صحيح فقط.
- منع إعادة ظهور المهمة بعد الإجابة الصحيحة عبر الاعتماد على `tasks.status` وتسجيل النتيجة كمرجع نهائي.
- إضافة النقاط إلى رصيد الطفل فور النجاح وتحديث الإحصاءات المرتبطة.
- تسجيل نتيجة المهمة في سجل الطفل وعرضها في واجهة الطفل.
- إشعار ولي الأمر بنجاح الطفل مع عدد الإخفاقات، وتسجيل ذلك في سجل الطفل ضمن حساب الأب.

**الحل المطلوب:**
- تحديث مسار تسليم إجابة الطفل ليُغلق المهمة (`completed`) فور الإجابة الصحيحة، ويمنع المكافأة المتكررة.
- فرض شرط أن يكون هناك إجابة صحيحة واحدة فقط عند إنشاء المهام.
- تطبيع `answers` قبل التحقق في كل مسار خاص بإكمال المهام والإشعارات.
- تخزين سجل محاولات الطفل (نجاح/إخفاق وعدد المحاولات) وربطه بحساب الأب لعرضه في لوحة المتابعة.
- إرسال إشعار ولي الأمر عند اكتمال المهمة مع ملخص الأداء (النجاح وعدد الإخفاقات).

### 🧭 خطة الإصلاح (تسلسل إجابة الطفل والنقاط)

#### 1) مدخلات ومسارات الدخول
- نقطة الدخول: `/api/child/submit-task` و`/api/child/answer-task` و`/api/child/task-notifications/complete`.
- تحقق من أن `taskId` و`selectedAnswerId`/`answerId` موجودان.
- تحقق من ملكية الطفل للمهمة (task.childId).

#### 2) إيقاف التكرار (Idempotency)
- تحقق من وجود نتيجة صحيحة مسبقًا في `task_results` لنفس `taskId` و`childId`.
- إذا وُجدت: أعد نفس نجاح الإجابة مع `pointsEarned` بدون أي تحديث إضافي.

#### 3) التحقق من الإجابة
- طبّع `answers` قبل المقارنة.
- إذا لم تُوجد الإجابة المختارة: ارفض الطلب بـ `BAD_REQUEST`.
- إذا كانت الإجابة غير صحيحة: سجّل محاولة فاشلة في `task_results` بدون نقاط ثم أعد نجاحًا بـ `isCorrect=false` و`pointsEarned=0`.

#### 4) إغلاق المهمة (صحيحة فقط)
- حدّث `tasks.status` إلى `completed` بشرط أن تكون `pending`.
- إذا لم يتم التحديث (حالة سباق): أعد تعارض (conflict) بدون نقاط إضافية.

#### 5) منح النقاط وتحديث الرصيد
- أضف `pointsReward` إلى `children.totalPoints` مرة واحدة فقط.
- نفّذ فحص فتح الهدايا باستخدام الرصيد الجديد.

#### 6) تسجيل السجل والإشعارات
- أضف سجل في `child_events` بنوع `TASK_COMPLETED` مع تفاصيل عدد الإخفاقات وإجمالي المحاولات.
- أرسل إشعارًا لولي الأمر يتضمن عدد الإخفاقات والنقاط المكتسبة.
- حدّث إشعارات الطفل المتعلقة بالمهمة إلى `resolved`.

#### 7) عرض النتائج للواجهات
- الطفل: تعود الاستجابة بـ `isCorrect` و`pointsEarned`.
- ولي الأمر: سجل المهام يعرض `totalAttempts` و`failedAttempts` و`lastAttemptAt`.

### 🛡️ CTO Paranoid Mode (Production Hardening)

#### ترقيات إلزامية
- التحقق من `task.status !== completed` و`task.dueDate` (إن وُجدت) قبل التنفيذ.
- Rate limit على endpoints الطفل لمنع brute force للإجابات.
- التحقق من الملكية داخل نفس الـ transaction.
- إضافة Unique partial index لمنع تكرار النجاح تحت السباقات.
- منع المقارنة النصية للإجابة: المطابقة تكون بـ `answer.id` فقط.
- تسجيل `attemptNumber` أو حسابه من `task_results` داخل المعاملة.
- تحديث النقاط عبر Ledger وليس تعديل مباشر للرصيد.
- تنفيذ Outbox pattern للإشعارات بعد commit.
- مراقبة: معدلات الفشل، الـ conflict، إضافة النقاط بالدقيقة، وتكرار requestId.

#### Partial Unique Index (DB)
```sql
CREATE UNIQUE INDEX IF NOT EXISTS ux_task_result_correct
ON task_results (task_id, child_id)
WHERE is_correct = true;
```

#### Transaction Pseudo-code (Atomic)
```sql
BEGIN;

-- 1) Lock task row + ownership + status check
SELECT id, child_id, status, points_reward, due_date
FROM tasks
WHERE id = :taskId AND child_id = :childId
FOR UPDATE;

IF status = 'completed' THEN
  ROLLBACK; RETURN ALREADY_COMPLETED;
END IF;

IF due_date IS NOT NULL AND now() > due_date THEN
  ROLLBACK; RETURN TASK_EXPIRED;
END IF;

-- 2) Validate answer by ID only
-- (answers already normalized in DB; selectedAnswerId must exist)

-- 3) Record attempt (wrong/correct)
INSERT INTO task_results(task_id, child_id, selected_answer_id, is_correct, points_earned)
VALUES (:taskId, :childId, :answerId, :isCorrect, CASE WHEN :isCorrect THEN :pointsReward ELSE 0 END);

IF :isCorrect = false THEN
  COMMIT; RETURN INCORRECT;
END IF;

-- 4) Close task atomically
UPDATE tasks
SET status = 'completed'
WHERE id = :taskId AND status = 'pending';

IF ROW_COUNT() = 0 THEN
  ROLLBACK; RETURN CONFLICT;
END IF;

-- 5) Points ledger
INSERT INTO points_ledger(child_id, task_id, points_delta, reason)
VALUES (:childId, :taskId, :pointsReward, 'TASK_COMPLETED');

-- 6) Update balance from ledger
UPDATE children
SET total_points = total_points + :pointsReward
WHERE id = :childId;

-- 7) Child event log
INSERT INTO child_events(child_id, event_type, related_id, meta)
VALUES (:childId, 'TASK_COMPLETED', :taskId, :meta);

-- 8) Resolve child notifications for this task
UPDATE notifications
SET status = 'resolved', is_read = true, resolved_at = now()
WHERE related_id = :taskId AND child_id = :childId;

-- 9) Outbox (parent notification)
INSERT INTO outbox_events(type, payload_json, status)
VALUES ('PARENT_TASK_COMPLETED', :payload, 'pending');

COMMIT;
```

#### SQL Design (Production Tables)

```sql
-- 1) Points Ledger
CREATE TABLE IF NOT EXISTS points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  points_delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason varchar(50) NOT NULL, -- TASK_COMPLETED | ADJUSTMENT | REWARD | REFUND
  request_id varchar(100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_child_time
ON points_ledger(child_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_points_ledger_request
ON points_ledger(child_id, request_id)
WHERE request_id IS NOT NULL;

-- 2) Outbox Events
CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(50) NOT NULL, -- PARENT_TASK_COMPLETED | CHILD_NOTIFICATION | EMAIL
  payload_json jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending', -- pending | sent | failed
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_time
ON outbox_events(status, available_at, created_at);

-- 3) Task Attempts Snapshot (optional, for fast analytics)
CREATE TABLE IF NOT EXISTS task_attempts_summary (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  total_attempts integer NOT NULL DEFAULT 0,
  failed_attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  PRIMARY KEY (task_id, child_id)
);

-- 4) Monitoring Counters (lightweight)
CREATE TABLE IF NOT EXISTS task_monitoring_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  metric varchar(50) NOT NULL, -- FAILED_ATTEMPT | CONFLICT | POINTS_AWARDED
  value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_monitoring_metric_time
ON task_monitoring_counters(metric, created_at DESC);
```

### 🎁 نظام الهدايا والمكافآت

```
parents ──▶ gifts ──▶ children
              │
              ▼
          products

الحالات:
- SENT: تم الإرسال
- UNLOCKED: فُتحت (وصل الطفل للنقاط المطلوبة)
- ACTIVATED: تم استلامها
- REVOKED: ملغاة
```

### 🛒 نظام المتجر

```
products ◀──┐
    │       │
    ▼       │
productCategories
            │
parentPurchases ──▶ parentPurchaseItems
       │
       ▼
parentOwnedProducts ──▶ childAssignedProducts ──▶ shippingRequests
```

**أنواع المنتجات:**
- `digital`: رقمي
- `physical`: مادي (يحتاج شحن)
- `subscription`: اشتراك
- `wallet_topup`: شحن المحفظة

### 💰 نظام المحفظة والدفع

```
wallets ◀──── parents
   │
   ▼
walletTransfers (DEPOSIT | REFUND | SPEND)
   │
   ▼
storeOrders ──▶ orderItems ──▶ transactions
                                    │
                                    ▼
                                refunds
```

### 🔐 نظام المصادقة

```
parents ──▶ otpCodes ──▶ OTP verification
   │
   ├──▶ trustedDevices
   │
   ├──▶ sessions
   │
   └──▶ loginHistory
```

---

## 🛤️ API Endpoints الرئيسية

### 🔑 Authentication (`/api/auth/*`)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/api/auth/register` | تسجيل ولي أمر جديد |
| POST | `/api/auth/login` | تسجيل الدخول (يرسل OTP) |
| POST | `/api/auth/verify-otp` | التحقق من OTP |
| POST | `/api/auth/forgot-password` | استعادة كلمة المرور |

**ملاحظة مهمة (OTP Reset):** التحقق من كود الاستعادة يقوم بالتحقق فقط، ويتم استهلاك OTP فعليا عند تنفيذ `/api/auth/reset-password`.

**ملاحظة مهمة (OTP Change Password):** إرسال OTP يتم عبر `/api/auth/send-otp` مع `purpose=change_password`، والتحقق عبر `/api/auth/verify-otp` (purpose-aware) لا يستهلك الكود، ويتم الاستهلاك عند تنفيذ `/api/parent/profile/change-password` مع `otpCode` و `otpId` (و `otpMethod` اختياري: `email` أو `sms`).

### 👨‍👩‍👧 Parent Routes (`/api/parent/*`)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/api/parent/info` | معلومات الوالد |
| GET | `/api/parent/children` | قائمة الأطفال |
| GET | `/api/parent/children/status` | حالة الأطفال (للـ polling) |
| POST | `/api/parent/create-custom-task` | إنشاء مهمة مخصصة |
| POST | `/api/parent/send-gift` | إرسال هدية للطفل |
| GET | `/api/parent/wallet` | رصيد المحفظة |

### 👶 Child Routes (`/api/child/*`)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/api/child/link` | ربط الطفل بالوالد عبر الكود |
| GET | `/api/child/info` | معلومات الطفل |
| GET | `/api/child/tasks` | مهام الطفل |
| POST | `/api/child/submit-task` | إرسال إجابة مهمة |
| GET | `/api/child/gifts` | هدايا الطفل |
| GET | `/api/child/progress` | تقدم الطفل |

### 🏪 Store Routes (`/api/store/*`)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/api/store/products` | قائمة المنتجات |
| GET | `/api/store/categories` | الفئات |
| POST | `/api/store/checkout` | إتمام الشراء |

### 👨‍💼 Admin Routes (`/api/admin/*`)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/api/admin/login` | تسجيل دخول المدير |
| GET | `/api/admin/stats` | إحصائيات النظام |
| GET/POST/PUT/DELETE | `/api/admin/products` | إدارة المنتجات |
| GET | `/api/admin/parents` | قائمة الآباء |
| GET | `/api/admin/children` | قائمة الأطفال |

---

## 📱 صفحات Frontend الرئيسية

### للوالدين

| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `ParentAuth.tsx` | `/parent-auth` | تسجيل/دخول |
| `ParentDashboard.tsx` | `/parent` | لوحة التحكم الرئيسية |
| `ParentTasks.tsx` | `/parent-tasks` | إدارة المهام |
| `ParentStore.tsx` | `/parent-store` | المتجر |
| `ParentInventory.tsx` | `/parent-inventory` | المنتجات المملوكة |
| `Settings.tsx` | `/settings` | الإعدادات |
| `Wallet.tsx` | `/wallet` | المحفظة |

### للأطفال

| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `ChildLink.tsx` | `/child-link` | ربط بالوالد |
| `ChildGames.tsx` | `/child-games` | الصفحة الرئيسية |
| `ChildTasks.tsx` | `/child-tasks` | المهام المطلوبة |
| `ChildStore.tsx` | `/child-store` | متجر الطفل |
| `ChildGifts.tsx` | `/child-gifts` | الهدايا |
| `ChildProgress.tsx` | `/child-progress` | التقدم |
| `ChildProfile.tsx` | `/child-profile` | الملف الشخصي |

### للمدير

| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `AdminAuth.tsx` | `/admin-auth` | تسجيل الدخول |
| `AdminDashboard.tsx` | `/admin` | لوحة التحكم |

---

## 🔐 نظام الصلاحيات

### ثلاثة أنواع من المستخدمين:

```
┌─────────────────────────────────────────────────────┐
│                    ADMIN                            │
│  - إدارة كاملة للنظام                                │
│  - إدارة المنتجات والإعدادات                          │
│  - رؤية كل الإحصائيات                                │
├─────────────────────────────────────────────────────┤
│                    PARENT                           │
│  - إدارة أطفاله فقط                                  │
│  - إنشاء مهام وإرسال هدايا                           │
│  - شراء منتجات                                      │
├─────────────────────────────────────────────────────┤
│                    CHILD                            │
│  - قراءة فقط (Read-only)                            │
│  - حل المهام                                        │
│  - استلام الهدايا                                    │
│  - طلب شراء (يحتاج موافقة الوالد)                     │
└─────────────────────────────────────────────────────┘
```

### التحقق من الملكية (Critical!)

```typescript
// Pattern: قبل أي عملية على طفل
const parentChild = await db.query.parentChild.findFirst({
  where: and(
    eq(parentChild.parentId, req.user.id),
    eq(parentChild.childId, childId)
  )
});
if (!parentChild) throw new UnauthorizedError("Not authorized");
```

---

## 🚀 تدفق العمل الأساسي

### 1. تسجيل الوالد

```
Parent → Register → Get uniqueCode → Share with Child
```

### 2. ربط الطفل

```
Child → Enter Parent Code → Create Child Account → Link to Parent
```

### 3. إنشاء مهمة

```
Parent → Select Subject → Write Question → Add Answers → Set Points → Send to Child
```

### 4. حل المهمة

```
Child → View Task → Select Answer → Submit → 
  ├── Correct → +Points → Check Gift Unlock
  └── Wrong → 0 Points
```

### 5. نظام الهدايا

```
Parent → Buy Product → Set Points Threshold → Send as Gift →
Child → Reach Points → Gift Unlocked → Parent Approves Shipping
```

---

## 🌳 شجرة النمو (Growth Tree)

نظام تحفيزي للأطفال يتتبع التقدم:

```
childGrowthTrees:
- currentStage: 1-8 (من بذرة إلى شجرة عملاقة)
- totalGrowthPoints: النقاط التراكمية
- tasksCompleted: عدد المهام المكتملة
- gamesPlayed: عدد الألعاب
- rewardsEarned: المكافآت المكتسبة
```

---

## 📦 نظام المكتبات (Libraries)

نظام للتجار/المكتبات للبيع:

```
libraries ──▶ libraryProducts ──▶ (تظهر في المتجر)
    │
    ├──▶ libraryReferrals (نظام الإحالة)
    │
    └──▶ libraryDailySales (تتبع المبيعات والعمولات)
```

---

## ⚙️ الإعدادات المهمة

### App Settings Tables

| الجدول | الوظيفة |
|--------|---------|
| `appSettings` | إعدادات عامة (key-value) |
| `rewardsSettings` | نقاط المهمة، الحد اليومي |
| `tasksSettings` | الحد الأقصى للمهام يومياً |
| `storeSettings` | تفعيل المتجر، الحد الأدنى للنقاط |
| `notificationSettings` | Push/Email |
| `paymentSettings` | بوابة الدفع |
| `themeSettings` | ألوان التطبيق |
| `seoSettings` | SEO metadata |
| `supportSettings` | معلومات الدعم الفني |

---

## 🔄 تدفق البيانات

```
                    ┌──────────────┐
                    │   Frontend   │
                    │  (React/Vite)│
                    └──────┬───────┘
                           │ HTTP/JSON
                           ▼
┌─────────────────────────────────────────────────┐
│                    Express.js                    │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Routes  │─▶│Middleware│─▶│ Controllers   │  │
│  │         │  │(Auth,Rate│  │               │  │
│  │ auth.ts │  │ Limit)   │  │               │  │
│  │parent.ts│  └──────────┘  └───────┬───────┘  │
│  │child.ts │                        │          │
│  │admin.ts │                        ▼          │
│  │store.ts │              ┌─────────────────┐  │
│  └─────────┘              │   Drizzle ORM   │  │
│                           └────────┬────────┘  │
└────────────────────────────────────┼───────────┘
                                     │
                                     ▼
                           ┌─────────────────┐
                           │   PostgreSQL    │
                           │   (50+ tables)  │
                           └─────────────────┘
```

---

## 🐳 Docker Deployment

```yaml
services:
  app:
    build: .
    ports: ["5000:5000"]
    depends_on: [db, redis]
    
  db:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]
    
  redis:
    image: redis:alpine
    
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
```

**Production Commands:**
```bash
# Build & Run
docker compose up -d --build

# View Logs
docker compose logs -f app

# Database Access
docker compose exec db psql -U classify_user -d classify_db
```

---

## ⚠️ قواعد حرجة (لا تلمسها!)

### 1. شكل الـ API Response
```json
// Success
{ "success": true, "data": {...}, "message": "..." }

// Error
{ "success": false, "error": "ERROR_CODE", "message": "..." }
```

### 2. التحقق من الملكية
**دائماً** تحقق من أن الوالد يملك الطفل قبل أي عملية.

### 3. Rate Limiting
- Login: 5 محاولات/دقيقة
- OTP: 3 محاولات/10 دقائق

### 4. Password Hashing
- bcrypt مع salt rounds = 10

---

## 📁 هيكل المجلدات

```
classiv3/
├── client/                 # Frontend (React)
│   └── src/
│       ├── pages/          # صفحات التطبيق
│       ├── components/     # مكونات UI
│       ├── contexts/       # React Contexts
│       ├── hooks/          # Custom Hooks
│       ├── lib/            # Utilities
│       └── i18n/           # الترجمات
│
├── server/                 # Backend (Express)
│   ├── routes/             # API Routes
│   ├── services/           # Business Logic
│   ├── providers/          # External Services (OTP, etc.)
│   └── utils/              # Helpers
│
├── shared/                 # Shared Code
│   └── schema.ts           # Database Schema
│
├── migrations/             # DB Migrations
├── nginx/                  # Nginx Config
├── scripts/                # Deployment Scripts
└── docs/                   # Documentation
```

---

## 🔧 أوامر مفيدة

```bash
# Development
npm run dev                 # تشغيل محلي

# Build
npm run build              # Build للإنتاج

# Database
npm run db:push            # تطبيق التغييرات على DB

# Production
npm run start              # تشغيل الإنتاج
NODE_ENV=production node dist/index.js
```

---

## 📞 للتواصل

- **Admin Email:** info@classi-fy.com
- **Support:** (محدد في supportSettings)

---

> **ملاحظة:** هذا التحليل يُحدث تلقائياً عند إجراء تغييرات جوهرية على المشروع.
