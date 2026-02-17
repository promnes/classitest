# 🎯 CLASSIFY - الخطة الشاملة للمشروع
**Version:** 2.0  
**Updated:** January 2025  
**Purpose:** Complete project knowledge base for simultaneous understanding of entire codebase architecture, features, and workflows.

---

## 📋 جدول المحتويات
1. [مقدمة عن المشروع](#1️⃣-مقدمة-عن-المشروع)
2. [البنية التحتية](#2️⃣-البنية-التحتية)
3. [هندسة قاعدة البيانات](#3️⃣-هندسة-قاعدة-البيانات)
4. [خريطة API الكاملة](#4️⃣-خريطة-api-الكاملة)
5. [معمارية الواجهة الأمامية](#5️⃣-معمارية-الواجهة-الأمامية)
6. [تدفقات المستخدم والعمليات](#6️⃣-تدفقات-المستخدم-والعمليات)
7. [الأمان والمصادقة](#7️⃣-الأمان-والمصادقة)
8. [الكود والملفات الحرجة](#8️⃣-الكود-والملفات-الحرجة)
9. [الدليل السريع للتطوير](#9️⃣-الدليل-السريع-للتطوير)

---

## 1️⃣ مقدمة عن المشروع

### 🎓 ماذا هو Classify؟
تطبيق عربي **متطور** للرقابة الأبوية يمكّن الآباء من:
- ✅ إدارة حسابات أطفالهم
- ✅ إنشاء ومشاركة مهام تعليمية
- ✅ نظام مكافآت قائم على النقاط
- ✅ متجر رقمي وفيزيائي
- ✅ معاملات دفع آمنة
- ✅ نظام إحالات وعمولات
- ✅ نظام هدايا متقدم

### 👥 أنواع المستخدمين
| الفئة | الوصف | الأدوار |
|------|-------|--------|
| **آباء** | مسؤولون الحساب الأساسيين | إنشاء مهام، إدارة أطفال، عمليات شراء |
| **أطفال** | المستخدمون الثانويون | حل المهام، جني النقاط، الشراء من المتجر |
| **مسؤولو النظام** | إداريون المنصة | إدارة المحتوى، المراقبة، الإعدادات العامة |
| **التجار (مكتبات)** | مزودو المحتوى | إنشاء منتجات، تتبع المبيعات |

### 🗂️ الهيكل التنظيمي
```
Classify
├── Frontend (React + Vite)
│   ├── Parent Dashboard
│   ├── Child App
│   └── Admin Panel
├── Backend (Express.js)
│   ├── Authentication Routes
│   ├── Family Management
│   ├── Tasks & Rewards
│   ├── Store & Payments
│   └── Admin Operations
├── Database (PostgreSQL)
│   └── 80+ Tables with 64 Optimized Indexes
├── Infrastructure
│   ├── Docker Compose (4 core + 7 monitoring containers)
│   ├── Traefik (Reverse proxy)
│   └── Redis (Cache)
└── External Services
    ├── Resend (Email)
    ├── Twilio (SMS)
    └── Stripe (Payments)
```

---

## 2️⃣ البنية التحتية

### 🐳 Docker Architecture

#### البيئة الإنتاجية (Hostinger VPS)
**الخادم:** `srv1118737.hstgr.cloud:5000`  
**المشروع:** `classitest`

#### الحاويات الأساسية (4)
```yaml
classiv3-app:
  Ports: 5000 (Express.js Backend)
  Role: Core API Server
  Restart: always

classiv3-db:
  Ports: 5433 (PostgreSQL, mapped from 5432)
  Role: Primary Data Store
  Provider: Neon PostgreSQL (cloud-hosted)
  Restart: always

classiv3-redis:
  Ports: 6379
  Role: Cache Layer
  Image: redis:7.2-alpine
  Restart: always

classiv3-traefik:
  Ports: 80:80, 443:443
  Role: Reverse Proxy & SSL Termination
  Manager: Docker Labels
  Healthcheck: ✅ FIXED (wget-based)
  Restart: always
```

#### أدوات المراقبة (7)
| أداة | المنفذ | الوظيفة |
|------|--------|--------|
| **Portainer** | 9000 | إدارة Docker |
| **pgAdmin** | 5050 | إدارة PostgreSQL |
| **Redis Commander** | 8081 | تصور بيانات Redis |
| **Prometheus** | 9090 | جمع المقاييس |
| **Grafana** | 3000 | لوحات المراقبة |
| **Loki** | 3100 | تجميع السجلات |
| **Mailhog** | 8025 | اختبار البريد الإلكتروني |

### 🔧 Traefik Healthcheck (تم الإصلاح)
```bash
# القديم (خاطئ):
traefik healthcheck --ping

# الجديد (صحيح):
wget --no-verbose --tries=1 --spider http://localhost/ping
```

### 🌐 توجيه الشبكة HTTPS
```
Traefik HTTPS Labels:
  traefik.enable: true
  traefik.http.routers.{service}.entrypoints: websecure
  traefik.http.routers.{service}.tls.certresolver: letsencrypt
  traefik.http.services.{service}.loadbalancer.server.port: {PORT}
```

---

## 3️⃣ هندسة قاعدة البيانات

### 📊 مخطط الجداول الرئيسية

#### 👨👩👧👦 إدارة المستخدمين (8 جداول)
```typescript
parents ─────┬─> children ─────┬─> childGrowthTrees
             │                  ├─> childGrowthEvents
             │                  ├─> childTrustedDevices
             │                  └─> childNotificationSettings
             │
             ├─> trustedDevices (Cookies/Tokens)
             ├─> trustedDevicesParent (Device Management)
             ├─> sessions
             └─> loginHistory

// الحقول الحرجة:
parents:
  - email: فريد، lowercase indexed
  - password: bcrypt hashed
  - twoFAEnabled: علم التحقق الثنائي
  - uniqueCode: كود ربط الأطفال
  - failedLoginAttempts: حماية من القوة الغاشمة

children:
  - totalPoints: رصيد النقاط التراكمي
  - avatarUrl: صورة الملف الشخصي
  - privacyAccepted: موافقة الوالدين
```

#### 📚 إدارة المهام والمحتوى (12 جدول)
```typescript
subjects (مواد دراسية):
  - name, nameAr
  - emoji, color
  - isActive

templateTasks (قوالب):
  - question, answers (JSON مع isCorrect)
  - pointsReward
  - createdByParent, isPublic

tasks (المهام المخصصة):
  parentId → childId
  subjectId (optional)
  status: pending | completed | failed

taskResults (النتائج):
  taskId → childId
  isCorrect: boolean
  pointsEarned: integer
```

#### 🎁 نظام المكافآت والهدايا (14 جدول)
```typescript
products (المنتجات):
  - pointsPrice: السعر بالنقاط
  - price + originalPrice (للعملات)
  - stock, rating, reviewCount
  - productType: digital | physical | subscription

childGifts (الهدايا المرسلة):
  parentId → childId → productId
  status: pending | delivered | acknowledged

gifts (التفويضات):
  pointsThreshold: نقاط الفتح
  status: SENT | UNLOCKED | ACTIVATED | REVOKED

childAssignedProducts (المنتجات المخصصة):
  progressPoints: النقاط الحالية المجمعة
  status: active | completed | shipment_requested | shipped

shippingRequests (طلبات الشحن):
  status: requested | approved | shipped | cancelled
```

#### 💳 نظام الدفع والعمليات (12 جدول)
```typescript
storeOrders (الطلبات):
  parentId
  status: PENDING | PAYMENT_INITIATED | PAID | FAILED | REFUNDED
  stripeSessionId: معرف جلسة Stripe

orderItems (عناصر الطلب):
  orderId → productId → priceTierId
  quantity, unitAmount

transactions (المعاملات):
  provider: stripe
  providerRef: payment_intent ID
  status: pending | completed | failed | refunded

wallets (المحافظ):
  parentId (فريد)
  balance: المبلغ الحالي
  currency: USD/SAR/etc

walletTransfers (سجل المحفظة):
  walletId
  type: DEPOSIT | REFUND | SPEND
  amount, reason

webhookEvents (أحداث Webhook):
  provider: stripe
  dedupeKey: معرف الحدث الفريد
  signatureVerified: تم التحقق من التوقيع
```

#### 🔐 مزودو المصادقة (4 جداول)
```typescript
admins (حسابات مسؤولي النظام):
  email (فريد)
  password: bcrypt hashed
  role: superadmin | moderator | support

socialLoginProviders (مزودو تسجيل الدخول):
  provider: google | facebook | apple | twitter
  clientId, clientSecret
  isActive: boolean

otpProviders (مزودو OTP):
  provider: email | sms
  settings: JSON (معرف القالب، الرقم المن صدر)
  codeLength: 6
  expiryMinutes: 5
  maxAttempts: 3

parentSocialIdentities (هويات وسائل التواصل):
  parentId → provider (google, facebook, etc.)
  providerId, accessToken, refreshToken
```

#### 🎯 نظام الإحالات والعمولات (8 جداول)
```typescript
referrals (الإحالات):
  referrerId → referredId
  referralCode, status: pending | active | rewarded
  pointsAwarded, activatedAt

parentReferralCodes (أكواد الإحالة):
  parentId (فريد)
  code, totalReferrals, activeReferrals
  totalPointsEarned

profitTransactions (عمليات الربح):
  sellerId → buyerId
  templateTaskId
  totalPoints, sellerEarnings, appCommission

libraries (المكتبات/التجار):
  username, password: bcrypt
  referralCode, commissionRatePct
  activityScore, totalProducts, totalSales

libraryProducts (منتجات المكتبة):
  libraryId → productId
  price, discount, stock

libraryDailySales (المبيعات اليومية):
  libraryId, saleDate
  totalSalesAmount, totalPointsSales
  commissionAmount, isPaid
```

#### 📢 الإشعارات والإعلانات (8 جداول)
```typescript
notifications (الإشعارات):
  parentId | childId
  type, title, message
  style: toast | modal | banner | fullscreen
  priority: normal | warning | urgent | blocking
  soundAlert, vibration
  isRead, readAt

childNotificationSettings (إعدادات الإشعارات):
  childId (فريد)
  mode: popup_strict | popup_soft | floating_bubble
  repeatDelayMinutes

childGifts (هدايا الأطفال):
  parentId → childId → productId
  status: pending | delivered | acknowledged

childEvents (أحداث الأطفال):
  childId
  eventType: GIFT_ASSIGNED | TASK_ASSIGNED
  isAcknowledged, acknowledgedAt

broadcastNotifications (الإشعارات الموجهة):
  adminId
  targetAudience: all | parents | children
  priority, recipientCount

childAds (إعلانات الأطفال):
  contentType: image | video | link | code
  pointsReward, watchDurationSeconds

parentAds (إعلانات الآباء):
  contentType: similar

adWatchHistory (سجل مشاهدة الإعلانات):
  childId | parentId → adId
  watchedDuration, isCompleted
```

#### ⚙️ الإعدادات والنظام (12 جدول)
```typescript
appSettings (إعدادات عامة):
  key: فريد، value

rewardsSettings (المكافآت):
  pointsPerTask, dailyLimit

tasksSettings (المهام):
  maxTasksPerDay, allowCustomTasks

storeSettings (المتجر):
  storeEnabled, minPointsToBuy

notificationSettings (الإشعارات):
  enablePush, enableEmail

paymentSettings (الدفع):
  paymentEnabled, gateway

seoSettings (SEO):
  siteTitle, siteDescription, keywords
  ogTitle, ogDescription, ogImage
  robotsIndex, robotsFollow
  googleAnalyticsId, facebookPixelId

supportSettings (الدعم):
  supportEmail, supportPhone
  whatsappNumber, telegramUsername
  workingHours, timezone
  emergencyMessage, maintenanceMode

themeSettings (الثيم):
  primaryColor, secondaryColor, accentColor

activityLog (سجل النشاط):
  adminId
  action: create | update | delete
  entity, entityId, meta
```

#### 📁 وسائط وملفات (4 جداول)
```typescript
media (الملفات):
  objectKey: path في التخزين
  url: رابط عام
  storageProvider: object_storage
  mimeType, size, checksum
  width, height, durationMs
  ownerType | ownerId: الملكية
  scanStatus: pending | clean | blocked

mediaReferences (مراجع الملفات):
  mediaId → entityType/entityId
  field: entity field name

mediaEvents (أحداث الملفات):
  mediaId, action: viewed | deleted | scanned
```

### 📊 الفهارس المحسّنة (64 فهرس)
- ✅ Unique indexes على: email, username, codes
- ✅ Composite indexes على: parentId+childId, status+createdAt
- ✅ Partial indexes على: pending OTPs, active sessions
- ✅ BRIN indexes على: timestamp fields (created_at, updated_at)
- ✅ GIN indexes على: JSON fields (metadata, settings, answers)

---

## 4️⃣ خريطة API الكاملة

### 🔐 المصادقة (Authentication Routes)

#### تسجيل الدخول / التسجيل الأساسي
```http
POST /api/auth/register
Body: {
  email: "parent@example.com",
  password: "secure123",
  name: "الأب محمد",
  phoneNumber: "+966501234567" (optional)
}
Response: {
  success: true,
  data: {
    id: "parent-uuid",
    email: "parent@example.com",
    token: "jwt-token",
    refreshToken: "refresh-token"
  }
}

POST /api/auth/login
Body: {
  email: "parent@example.com",
  password: "secure123",
  deviceId: "device-hash"
}
Response: {
  success: true,
  data: {
    token: "jwt-token",
    refreshToken: "refresh-token",
    parent: { id, email, name }
  }
}

POST /api/auth/logout
Response: { success: true }
```

#### التحقق الثنائي (2FA) و OTP
```http
POST /api/auth/send-otp
Body: {
  email: "parent@example.com",
  purpose: "login" | "password_reset" | "sms_verification",
  method: "email" | "sms"
}
Response: {
  success: true,
  message: "OTP sent successfully",
  expiresIn: 300 (seconds)
}

POST /api/auth/verify-otp
Body: {
  email: "parent@example.com",
  code: "123456",
  purpose: "login"
}
Response: {
  success: true,
  data: {
    token: "jwt-token",
    parent: { id, email, name }
  }
}

POST /api/auth/request-otp
Body: {
  email: "parent@example.com"
}
Response: { success: true }
```

#### التحكم في الأجهزة الموثوقة
```http
POST /api/auth/trust-device
Body: {
  deviceId: "device-hash",
  deviceLabel: "Chrome on Windows",
  expiresDays: 45
}
Response: {
  success: true,
  data: { trustedDeviceId: "uuid" }
}

GET /api/auth/trusted-devices
Response: {
  success: true,
  data: [
    {
      id: "uuid",
      deviceLabel: "Chrome on Windows",
      lastUsedAt: "2025-01-15T10:00:00Z",
      createdAt: "2025-01-01T10:00:00Z"
    }
  ]
}

DELETE /api/auth/trusted-devices/:id
Response: { success: true }
```

#### تسجيل الدخول الاجتماعي
```http
POST /api/auth/social-login
Body: {
  provider: "google" | "facebook" | "apple",
  token: "provider-token"
}
Response: {
  success: true,
  data: {
    id: "parent-uuid",
    token: "jwt-token",
    isNewUser: true | false
  }
}

POST /api/auth/link-social
Body: {
  provider: "google",
  token: "provider-token"
}
Response: {
  success: true,
  data: { linkedProvider: "google" }
}
```

### 👨👩👧👦 إدارة العائلة (Family Routes)

#### إدارة الأطفال
```http
GET /api/family/children
Response: {
  success: true,
  data: [
    {
      id: "child-uuid",
      name: "أحمد",
      totalPoints: 500,
      avatarUrl: "https://..."
    }
  ]
}

POST /api/family/children
Body: {
  name: "فاطمة",
  birthday: "2015-01-01",
  schoolName: "مدرسة النور",
  academicGrade: "Grade 5"
}
Response: {
  success: true,
  data: { id: "child-uuid", uniqueCode: "ABC123" }
}

PUT /api/family/children/:id
Body: {
  name: "فاطمة محمد",
  avatarUrl: "https://...",
  hobbies: "الرسم والقراءة"
}
Response: { success: true, data: { ...updatedChild } }

DELETE /api/family/children/:id
Response: { success: true }
```

#### ربط الآباء والأطفال
```http
POST /api/family/link
Body: {
  code: "ABC123" // Code from child's parent account
}
Response: {
  success: true,
  message: "Child linked successfully"
}

POST /api/family/generate-linking-code
Response: {
  success: true,
  data: {
    code: "XYZ789",
    qrCodeUrl: "https://...",
    expiresAt: "2025-01-20T00:00:00Z"
  }
}

GET /api/family/linked-parents
Response: {
  success: true,
  data: [
    {
      parentId: "uuid",
      name: "الأم سارة",
      syncStatus: "active"
    }
  ]
}
```

### 📚 المهام والمحتوى (Tasks Routes)

#### المهام
```http
GET /api/tasks?childId=<id>&status=pending,completed&limit=10
Response: {
  success: true,
  data: [
    {
      id: "task-uuid",
      question: "ما عاصمة السعودية؟",
      imageUrl: "https://...",
      answers: [
        { id: "1", text: "الرياض", isCorrect: true },
        { id: "2", text: "جدة", isCorrect: false }
      ],
      pointsReward: 10,
      status: "pending",
      createdAt: "2025-01-15T10:00:00Z"
    }
  ]
}

POST /api/tasks
Body: {
  childId: "child-uuid",
  question: "ما هو الحيوان الأليف؟",
  answers: [
    { id: "1", text: "الكلب", isCorrect: true },
    { id: "2", text: "الحجر", isCorrect: false }
  ],
  pointsReward: 15,
  imageUrl: "https://...",
  subjectId: "subject-uuid" (optional)
}
Response: { success: true, data: { id: "task-uuid", ...task } }

PUT /api/tasks/:id
Body: { question: "...", answers: [...], pointsReward: 20 }
Response: { success: true, data: { ...updatedTask } }

DELETE /api/tasks/:id
Response: { success: true }

// تقديم الإجابة
POST /api/tasks/:id/submit
Body: {
  childId: "child-uuid",
  selectedAnswerId: "1"
}
Response: {
  success: true,
  data: {
    isCorrect: true,
    pointsEarned: 10,
    newTotalPoints: 510
  }
}
```

#### قوالب المهام
```http
GET /api/template-tasks?subject=<id>&difficulty=easy&isPublic=true
Response: {
  success: true,
  data: [
    {
      id: "template-uuid",
      title: "عاصمات الدول العربية",
      difficulty: "easy",
      pointsReward: 10,
      usageCount: 150
    }
  ]
}

POST /api/template-tasks
Body: {
  subjectId: "subject-uuid",
  question: "السؤال؟",
  answers: [...],
  pointsReward: 10,
  difficulty: "medium",
  isPublic: false,
  pointsCost: 5 // للآباء الآخرين لشرائه
}
Response: { success: true, data: { ...template } }

GET /api/template-tasks/:id/use
Body: {
  childId: "child-uuid"
}
Response: {
  success: true,
  data: { taskId: "newly-created-task-id" }
}
```

### 🎁 نظام المكافآت والهدايا (Rewards & Gifts Routes)

#### الهدايا
```http
POST /api/gifts
Body: {
  childId: "child-uuid",
  productId: "product-uuid",
  pointsThreshold: 1000,
  message: "هدية عيد ميلاد سعيد"
}
Response: {
  success: true,
  data: {
    giftId: "gift-uuid",
    status: "SENT",
    createdAt: "2025-01-15T10:00:00Z"
  }
}

GET /api/gifts/:childId
Response: {
  success: true,
  data: [
    {
      id: "gift-uuid",
      product: { id, name, image },
      pointsThreshold: 1000,
      status: "UNLOCKED",
      unlockedAt: "2025-01-18T10:00:00Z"
    }
  ]
}

// تفعيل الهدية (طفل)
POST /api/gifts/:id/activate
Response: {
  success: true,
  message: "Gift activated! Your points have been deducted."
}
```

#### نقاط الأطفال
```http
GET /api/children/:id/points
Response: {
  success: true,
  data: {
    currentPoints: 500,
    dailyEarned: 50,
    totalAllTime: 1200,
    history: [
      {
        source: "task",
        points: 10,
        earnedAt: "2025-01-15T10:00:00Z"
      }
    ]
  }
}

POST /api/children/:id/adjust-points (Admin only)
Body: {
  delta: -50,
  reason: "Correction for cheating"
}
Response: { success: true, data: { newBalance: 450 } }
```

### 🛍️ المتجر والدفع (Store & Payment Routes)

#### المنتجات
```http
GET /api/products?category=<id>&sort=popular&limit=20
Response: {
  success: true,
  data: [
    {
      id: "product-uuid",
      name: "علبة الوسائط الذكية",
      description: "مجموعة متنوعة من الهدايا الرقمية",
      price: 99.99,
      pointsPrice: 500,
      image: "https://...",
      images: ["https://...", "https://..."],
      stock: 100,
      rating: 4.5,
      reviewCount: 250,
      isFeatured: true,
      productType: "digital" | "physical" | "subscription"
    }
  ]
}

GET /api/products/:id
Response: {
  success: true,
  data: { ...product, reviews: [...] }
}

// منتجات الوالد
POST /api/products (Parent role)
Body: {
  categoryId: "category-uuid",
  name: "دورة القراءة السريعة",
  pointsPrice: 200,
  price: 49.99,
  image: "https://...",
  productType: "digital"
}
Response: { success: true, data: { ...product } }
```

#### الطلبات
```http
POST /api/store/orders
Body: {
  items: [
    { productId: "uuid", quantity: 1 }
  ],
  shippingAddressId: "address-uuid" (if physical)
}
Response: {
  success: true,
  data: {
    orderId: "order-uuid",
    status: "PENDING",
    totalAmount: 299.97,
    paymentUrl: "https://checkout.stripe.com/..." (if payment needed)
  }
}

GET /api/store/orders
Response: {
  success: true,
  data: [
    {
      id: "order-uuid",
      status: "PAID",
      totalAmount: 299.97,
      items: [...],
      createdAt: "2025-01-15T10:00:00Z"
    }
  ]
}

GET /api/store/orders/:id
Response: { success: true, data: { ...order, items: [...] } }
```

#### عناوين الشحن
```http
POST /api/shipping-addresses
Body: {
  name: "محمد علي",
  line1: "شارع الملك فهد",
  city: "الرياض",
  state: "Region",
  postalCode: "11111",
  country: "SA",
  isDefault: true
}
Response: { success: true, data: { ...address } }

GET /api/shipping-addresses
Response: { success: true, data: [...addresses] }

PUT /api/shipping-addresses/:id
Body: { ...updates }
Response: { success: true, data: { ...updated } }

DELETE /api/shipping-addresses/:id
Response: { success: true }
```

#### الدفع (Stripe)
```http
// استدعاء الخادم بتفاصيل الطلب
POST /api/payments/create-checkout-session
Body: {
  orderId: "order-uuid",
  successUrl: "https://app.classify.app/payment/success",
  cancelUrl: "https://app.classify.app/payment/cancel"
}
Response: {
  success: true,
  data: {
    sessionId: "cs_...",
    url: "https://checkout.stripe.com/pay/cs_..."
  }
}

// يتم استدعاء Stripe Webhook تلقائياً
POST /api/webhooks/stripe
Headers: { "Stripe-Signature": "t=...,v1=..." }
Body: { ...stripeEvent }
Response: { received: true }
```

### 📢 الإشعارات (Notifications Routes)

```http
GET /api/notifications?status=unread&limit=20
Response: {
  success: true,
  data: [
    {
      id: "notif-uuid",
      type: "gift_unlocked",
      title: "🎁 تم فتح هدية!",
      message: "تهانينا! فتحت هدية الكتاب الجديد",
      priority: "normal",
      style: "toast",
      isRead: false,
      createdAt: "2025-01-15T10:00:00Z"
    }
  ]
}

PUT /api/notifications/:id
Body: { isRead: true }
Response: { success: true }

DELETE /api/notifications/:id
Response: { success: true }

POST /api/notifications/mark-all-read
Response: { success: true, markedCount: 5 }
```

### 🏪 نظام المكتبات (Libraries Routes)

```http
GET /api/libraries?active=true&limit=10
Response: {
  success: true,
  data: [
    {
      id: "library-uuid",
      name: "مكتبة النور التعليمية",
      description: "...",
      username: "alnoor_library",
      imageUrl: "https://...",
      rating: 4.8,
      totalProducts: 150,
      totalSales: 5000
    }
  ]
}

GET /api/libraries/:id/products
Response: {
  success: true,
  data: [
    {
      id: "product-uuid",
      libraryId: "library-uuid",
      title: "كتاب الرياضيات المتقدمة",
      price: 29.99,
      stock: 50,
      discount: 10,
      discountMinQuantity: 5
    }
  ]
}

// Library Login
POST /api/libraries/login
Body: {
  username: "alnoor_library",
  password: "secure123"
}
Response: {
  success: true,
  data: {
    libraryId: "library-uuid",
    token: "jwt-token",
    library: { ...library }
  }
}

// Library Dashboard
GET /api/libraries/dashboard
Response: {
  success: true,
  data: {
    totalSales: 50000,
    totalOrders: 1200,
    activeReferrals: 450,
    totalPointsEarned: 25000,
    commissionRate: 10
  }
}
```

### ⚙️ لوحة التحكم الإدارية (Admin Routes)

```http
// تسجيل دخول المسؤول
POST /api/admin/login
Body: {
  email: "admin@classify.app",
  password: "secure123"
}
Response: {
  success: true,
  data: {
    token: "jwt-token",
    admin: { id, email, role }
  }
}

// إدارة المستخدمين
GET /api/admin/parents?search=<query>&limit=50&page=1
Response: {
  success: true,
  data: [...parents],
  pagination: { total: 1000, page: 1, pages: 20 }
}

GET /api/admin/parents/:id
Response: {
  success: true,
  data: {
    id, email, name, children: [...],
    totalSpent, totalPurchases, referralStats
  }
}

POST /api/admin/parents/:id/suspend (Admin only)
Body: { reason: "Suspicious activity" }
Response: { success: true }

POST /api/admin/parents/:id/unsuspend
Response: { success: true }

// إدارة الأطفال
GET /api/admin/children?parentId=<id>&search=<query>
Response: { success: true, data: [...children] }

POST /api/admin/children/:id/adjust-points
Body: { delta: -100, reason: "Manual adjustment" }
Response: { success: true, data: { newBalance: 400 } }

// إدارة المنتجات
GET /api/admin/products?category=<id>&search=<query>
Response: { success: true, data: [...products], total: 500 }

POST /api/admin/products
Body: { ...productData }
Response: { success: true, data: { ...product } }

PUT /api/admin/products/:id
Body: { ...updates }
Response: { success: true, data: { ...updated } }

DELETE /api/admin/products/:id
Response: { success: true }

// إدارة الطلبات
GET /api/admin/orders?status=<status>&search=<query>
Response: { success: true, data: [...orders] }

PUT /api/admin/orders/:id
Body: { status: "SHIPPED" }
Response: { success: true, data: { ...order } }

// السجل والنشاط
GET /api/admin/activity-log?entity=<type>&limit=100
Response: {
  success: true,
  data: [
    {
      action: "CREATE",
      entity: "PRODUCT",
      entityId: "uuid",
      adminId: "admin-uuid",
      meta: {...},
      createdAt: "2025-01-15T10:00:00Z"
    }
  ]
}

// الإعدادات العامة
GET /api/admin/settings/<key>
Response: {
  success: true,
  data: { key: "points_per_task", value: "10" }
}

PUT /api/admin/settings/<key>
Body: { value: "15" }
Response: { success: true }

GET /api/admin/settings
Response: {
  success: true,
  data: {
    rewards: { pointsPerTask: 10, dailyLimit: 100 },
    tasks: { maxTasksPerDay: 10, allowCustomTasks: true },
    store: { storeEnabled: true, minPointsToBuy: 10 },
    ...
  }
}
```

### 🔍 صحة النظام (Health Routes)

```http
GET /api/health
Response: {
  status: "healthy",
  timestamp: "2025-01-15T10:00:00Z",
  uptime: 86400,
  database: "connected",
  redis: "connected",
  queues: "healthy"
}

GET /api/health/deep
Response: {
  status: "healthy",
  database: {
    connected: true,
    latency: 12 (ms),
    migrations: "current"
  },
  redis: {
    connected: true,
    memory: "50MB"
  },
  storage: {
    connected: true,
    available: "1TB"
  }
}
```

---

## 5️⃣ معمارية الواجهة الأمامية

### 📁 هيكل المشروع
```
client/
├── src/
│   ├── pages/
│   │   ├── ParentDashboard.tsx      # لوحة تحكم الأب
│   │   ├── ChildApp.tsx             # تطبيق الطفل
│   │   ├── AdminPanel.tsx           # لوحة التحكم
│   │   ├── AuthLogin.tsx            # تسجيل الدخول
│   │   ├── AuthRegister.tsx         # التسجيل
│   │   ├── AdminAuth.tsx            # دخول المسؤول
│   │   └── Store.tsx                # المتجر
│   │
│   ├── components/
│   │   ├── auth/                    # مكونات المصادقة
│   │   ├── tasks/                   # مكونات المهام
│   │   ├── rewards/                 # مكونات المكافآت
│   │   ├── store/                   # مكونات المتجر
│   │   ├── admin/                   # مكونات لوحة التحكم
│   │   └── shared/                  # مكونات مشتركة
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   ├── useAuth.ts               # إدارة المصادقة
│   │   ├── useChildren.ts           # إدارة الأطفال
│   │   ├── useTasks.ts              # إدارة المهام
│   │   └── ...
│   │
│   ├── services/
│   │   ├── api.ts                   # عميل HTTP (Axios)
│   │   ├── auth.ts                  # خدمات المصادقة
│   │   ├── tasks.ts                 # خدمات المهام
│   │   └── ...
│   │
│   ├── context/                     # React Context
│   │   ├── AuthContext.tsx
│   │   ├── AppContext.tsx
│   │   └── ...
│   │
│   ├── store/                       # TanStack Query
│   │   ├── queries/                 # React Query الاستعلامات
│   │   ├── mutations/               # React Query الطفرات
│   │   └── ...
│   │
│   ├── types/                       # TypeScript types
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── task.ts
│   │   └── ...
│   │
│   └── App.tsx                      # المكون الرئيسي
│
└── index.html
```

### 🎨 تكنولوجيا الواجهة الأمامية

| التقنية | الإصدار | الاستخدام |
|---------|---------|----------|
| **React** | 18+ | Framework الرئيسي |
| **TypeScript** | 5.x | نوع التحقق |
| **Vite** | 5.x | Build tool |
| **Tailwind CSS** | 3.4.x | Styling |
| **shadcn/ui** | Latest | مكونات UI |
| **Framer Motion** | 10.x | الرسوم المتحركة |
| **TanStack Query** | 5.x | إدارة البيانات |
| **React Router** | 6.x | التوجيه |
| **react-i18next** | 14.x | التدويل (RTL/LTR) |
| **zustand** | 4.x | إدارة الحالة (optional) |

### 🔄 تدفق البيانات
```
User Action
    ↓
Component (React)
    ↓
Custom Hook (useQuery/useMutation)
    ↓
API Service (axios)
    ↓
Backend API (Express)
    ↓
Database (PostgreSQL)
    ↓
Response (JSON)
    ↓
TanStack Query Cache
    ↓
Component Re-render
    ↓
UI Update
```

---

## 6️⃣ تدفقات المستخدم والعمليات

### 🔐 تدفق تسجيل الدخول المحسّن

```
1. User enters email/password
   ↓
2. POST /api/auth/login
   ├─ Validate credentials against hashed password
   ├─ Check if 2FA enabled
   └─ If enabled → Send OTP
   ↓
3. If 2FA enabled:
   ├─ User receives 6-digit OTP
   ├─ POST /api/auth/verify-otp
   └─ Receive JWT + refresh token
   ↓
4. If not 2FA:
   └─ Receive JWT + refresh token directly
   ↓
5. Store tokens:
   ├─ JWT → localStorage (short-lived, 7 days)
   ├─ Refresh Token → secure httpOnly cookie (45 days)
   └─ Device ID → localStorage
   ↓
6. Optional: Trust this device
   ├─ POST /api/auth/trust-device
   └─ Next login skips OTP for 45 days
   ↓
7. Redirect to dashboard
```

### 👨👩👧👦 تدفق إنشاء العائلة

```
Parent 1 (Creates Account)
├─ Register with email/password
├─ Create Children
│  ├─ Add Child (name, birthday, school, etc.)
│  └─ Generate linking code (e.g., "ABC123")
│
Parent 2 (Joins Family)
├─ Register with email/password
├─ Link Child via code
│  └─ POST /api/family/link
└─ Now has access to same children

Shared Access:
├─ Both parents see all children
├─ Both can create tasks for children
├─ Both can receive notifications
└─ Children see both as parents
```

### 📚 تدفق المهام

```
CREATION:
Parent
├─ POST /api/tasks
├─ Select child, subject, question, answers
└─ Set points reward
↓
ASSIGNMENT:
Task created with status="pending"
├─ Notification sent to child
└─ Child sees in Task List
↓
COMPLETION:
Child
├─ Views task details
├─ Selects answer
├─ POST /api/tasks/:id/submit
└─ System evaluates:
   ├─ If correct → +points
   ├─ If incorrect → No points
   └─ taskResult created
↓
TRACKING:
Parent sees:
├─ Completion status
├─ Points earned
├─ Attempts made
└─ Growth impact
```

### 🎁 تدفق نظام الهدايا

```
SENDING:
Parent
├─ Selects product (product ID from store)
├─ Sets points threshold (e.g., 1000)
├─ Optional message
└─ POST /api/gifts
├─ Gift status = "SENT"
└─ Notification sent to child
↓
UNLOCKING (Child earns enough points):
Child
├─ Earns tasks → accumulate points
├─ Reaches 1000 points
├─ Notification: "🎁 Gift unlocked!"
├─ Gift status → "UNLOCKED"
└─ Gift moves to "Ready to Open" section
↓
ACTIVATING:
Child
├─ Views unlocked gift
├─ Clicks "Open"
├─ POST /api/gifts/:id/activate
├─ Points deducted from child's balance
├─ Gift status → "ACTIVATED"
└─ Product redeemed/access granted
↓
DELIVERY:
For physical products:
├─ Shipping request created
├─ Parent receives request
├─ Parent confirms address
└─ Gift shipped
```

### 💳 تدفق عملية الشراء

```
DISCOVERY:
Child/Parent
├─ Browse /api/products
└─ See products with price (both currency + points options)
↓
ADDING TO CART:
├─ Select product
├─ Choose quantity
└─ Select payment method (points or currency)
↓
CHECKOUT:
POST /api/store/orders
├─ Pick shipping address (if physical)
├─ Create order with status="PENDING"
└─ Return order ID
↓
PAYMENT PROCESSING:
if (currency):
  ├─ POST /api/payments/create-checkout-session
  ├─ Redirect to Stripe checkout
  └─ Payment gateway handles transaction
else if (points):
  ├─ Deduct points from child
  ├─ Mark order as "PAID"
  └─ Skip payment gateway
↓
COMPLETION:
├─ Webhook confirmation (if Stripe)
├─ Update order status → "PAID"
├─ Create child_purchases record
├─ Send confirmation notification
└─ For digital: Access granted immediately
   For physical: Await shipping
```

---

## 7️⃣ الأمان والمصادقة

### 🔐 استراتيجية المصادقة متعددة الطبقات

```
Layer 1: Password Security
├─ bcrypt hashing (10 rounds)
├─ Minimum 12 characters required
└─ No plaintext storage

Layer 2: JWT Tokens
├─ 7-day expiration (short-lived)
├─ RS256 signing algorithm
├─ Payload: { userId, role, exp, iat }
└─ Refresh token: 45-day expiration

Layer 3: 2FA (Optional)
├─ OTP delivery: Email or SMS
├─ 6-digit code (0-999999 range)
├─ 5-minute expiration
├─ 3 maximum attempts
└─ Cooldown: 1 minute between resends

Layer 4: Rate Limiting
├─ OTP requests: 5 per hour per email
├─ Login attempts: 10 per 15 minutes
├─ Register: 3 per hour per IP
└─ After limits: Account locked for 30 minutes

Layer 5: Device Fingerprinting
├─ Device ID hash (localStorage)
├─ User agent stored
├─ IP address logged
└─ Suspicious pattern detection
```

### 🎟️ JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "parent-uuid",
    "role": "parent",
    "email": "parent@example.com",
    "iat": 1705315200,
    "exp": 1705920000
  },
  "signature": "..."
}
```

### 🔒 Authorization Rules

#### Parent Endpoints
```typescript
// Parent can only access their own data
GET /api/family/children
  ├─ Requires: JWT token with role=parent
  ├─ Validates: parentId matches token
  └─ Returns: Only their own children

// Parent can only modify their own children
PUT /api/family/children/:id
  ├─ Requires: JWT + Parent role
  ├─ Validates: parentId === token.userId
  ├─ Validates: childId belongs to this parent
  └─ Checks: No cross-parent child access
```

#### Child Endpoints
```typescript
// Child can only access own data
GET /api/tasks?childId=<id>
  ├─ Requires: JWT token with role=child
  ├─ Validates: childId === token.userId
  └─ Returns: Only their tasks

// Child cannot modify tasks (read-only)
POST /api/tasks/:id/submit
  ├─ Requires: JWT + Child role
  ├─ Validates: childId === token.userId
  ├─ Action: Submit answer (no edit)
  └─ No full CRUD for children
```

#### Admin Endpoints
```typescript
// Admin can access all data
GET /api/admin/parents
  ├─ Requires: JWT with role=superadmin
  ├─ Returns: All parents + full details
  └─ Includes: Financial data, activity logs

// Admin audit trail
POST /api/admin/parents/:id/suspend
  ├─ Requires: superadmin role
  ├─ Action: Logged to activity_log
  ├─ Meta: Reason, timestamp, admin ID
  └─ Immutable record kept forever
```

### 🛡️ حماية من الهجمات الشائعة

| الهجوم | الحماية |
|------|--------|
| **SQL Injection** | Parameterized queries (Drizzle ORM) |
| **XSS** | Content Security Policy headers, DOMPurify |
| **CSRF** | SameSite cookies, CSRF tokens |
| **Brute Force** | Rate limiting + account lockout |
| **Session Hijacking** | HttpOnly cookies, Device fingerprinting |
| **Man-in-the-Middle** | HTTPS only, HSTS headers |
| **Weak Passwords** | Minimum length, complexity check |
| **Token Theft** | Short JWT expiry, refresh tokens |

### 📡 Middleware Stack
```
Request
  ↓
CORS Check (Access-Control-Allow-Origin)
  ↓
Helmet (Security Headers)
  ├─ Content-Security-Policy
  ├─ X-Frame-Options: DENY
  ├─ X-Content-Type-Options: nosniff
  └─ Strict-Transport-Security (HTTPS)
  ↓
Rate Limiter (express-rate-limit)
  ├─ Per IP: 100 requests/15 min
  ├─ Per auth endpoint: Lower limits
  └─ Per user: 50 requests/minute
  ↓
Body Parser & Validator
  ├─ JSON size limit: 10MB
  ├─ Zod validation on all inputs
  └─ Type coercion
  ↓
JWT Verification (if authenticated)
  ├─ Check signature
  ├─ Verify expiration
  └─ Extract user ID
  ↓
Authorization Middleware
  ├─ Check role
  ├─ Verify resource ownership
  └─ Audit log
  ↓
Route Handler
  ↓
Response (200/400/401/403/500)
```

---

## 8️⃣ الكود والملفات الحرجة

### 📂 الملفات الأساسية في المشروع

#### Server Entry Point
**File:** `server/index.ts`
```typescript
// Purpose: Main server initialization
// Key: Express initialization, middleware setup, routes mounting
// Critical: Database connection, environment variables, port binding
// Usage: npm run dev | node dist/index.js
```

#### Database Schema Definition
**File:** `shared/schema.ts` (1471 lines)
```typescript
// Purpose: Drizzle ORM schema - source of truth for database structure
// Contains: 80+ table definitions with 64 optimized indexes
// Key Tables:
//   - parents, children, tasks, products, orders
//   - admins, notifications, deposits, wallets
//   - socialLoginProviders, otpProviders, libraries
// Usage: Referenced by all server routes for queries
// Critical: Any schema changes require: npm run db:push
```

#### Authentication Routes
**File:** `server/routes/auth.ts` (2533 lines)
```typescript
// Purpose: All authentication endpoints
// Key Endpoints:
//   - POST /api/auth/register - Parent registration
//   - POST /api/auth/login - Email/password login
//   - POST /api/auth/send-otp - OTP delivery
//   - POST /api/auth/verify-otp - 2FA verification
//   - POST /api/auth/login-social - Social OAuth
//   - POST /api/auth/trust-device - Device trust
// Critical Logic:
//   - JWT token generation and signing
//   - OTP code generation (random 6-digit)
//   - Rate limiting on OTP (3/10min per user)
//   - Password hashing with bcrypt
// Dependencies: auth middleware, JWT_SECRET, Resend API
// Usage: All authentication flows pass through this file
```

#### Admin Routes
**File:** `server/routes/admin.ts` (3824 lines)
```typescript
// Purpose: All admin panel endpoints
// Key Sections:
//   - Login: POST /api/admin/login (lines 63-97)
//   - Register: POST /api/admin/register (requires ADMIN_CREATION_SECRET)
//   - Users: Parent/child management, suspension
//   - Products: CRUD operations for store
//   - Orders: Order management and fulfillment
//   - Settings: Global application configuration
//   - Activity Logs: Admin action tracking
// Critical: adminMiddleware validates all requests
// Usage: Only accessible with admin JWT token
```

#### Family Management Routes
**File:** `server/routes/family.ts`
```typescript
// Purpose: Parent-child relationship management
// Key Endpoints:
//   - POST /api/family/children - Add child
//   - GET /api/family/children - List children
//   - PUT /api/family/children/:id - Update child
//   - POST /api/family/link - Link child to second parent
// Validation: Parent-child ownership checked on all operations
```

#### Task Routes
**File:** `server/routes/tasks.ts`
```typescript
// Purpose: Task creation, management, and submission
// Key Endpoints:
//   - POST /api/tasks - Create task
//   - GET /api/tasks - List tasks (filtered by child)
//   - POST /api/tasks/:id/submit - Submit answer
//   - PUT /api/tasks/:id - Update task
// Critical: Points calculation, answer validation
```

#### Store Routes
**File:** `server/routes/store.ts`
```typescript
// Purpose: Store, products, orders, and payments
// Key Sections:
//   - Products: Listing, filtering, searching
//   - Orders: Creation, checkout, payment status
//   - Shipping: Address management, request handling
//   - Inventory: Stock tracking
// Integration: Stripe payment gateway, webhooks
```

#### Notifications Routes
**File:** `server/routes/notifications.ts`
```typescript
// Purpose: Notification management and delivery
// Key: Mark as read, batch operations, filtering
```

#### Admin Credentials Management Script
**File:** `scripts/manage-admin.js`
```javascript
// Purpose: Sync ADMIN_EMAIL and ADMIN_PASSWORD from .env to database
// Usage: npm run admin:setup
// Function:
//   1. Read ADMIN_EMAIL and ADMIN_PASSWORD from .env
//   2. Connect to PostgreSQL via DATABASE_URL
//   3. Hash password with bcrypt
//   4. Create or update admin entry in admins table
//   5. Report success/failure
// Critical: Must run after .env changes to database to sync credentials
```

#### Authentication Middleware
**File:** `server/routes/middleware.ts`
```typescript
// Purpose: JWT verification and authorization checks
// Key Middleware:
//   - JWT verification: Checks token signature and expiry
//   - Role-based access: Validates user role
//   - Ownership validation: Ensures resource access rights
// Used by: All protected routes (marked with middleware)
```

#### Mailer Service
**File:** `server/services/mailer.ts`
```typescript
// Purpose: Email delivery (Resend API)
// Key Functions:
//   - sendOTP: Send 6-digit OTP code
//   - sendWelcome: Welcome email for new registration
//   - sendNotification: General notifications
//   - sendPasswordReset: Password recovery
// Requirements: RESEND_API_KEY in .env
```

#### Database Configuration
**File:** `drizzle.config.ts`
```typescript
// Purpose: Drizzle ORM configuration
// Connection: PostgreSQL via DATABASE_URL
// Migrations: Versioned SQL files in /migrations
```

---

## 9️⃣ الدليل السريع للتطوير

### 🚀 البدء السريع

#### التثبيت
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Push database schema
npm run db:push

# Start development server
npm run dev

# The app will be available at:
# Frontend: http://localhost:3000 (Vite dev server)
# Backend: http://localhost:5000 (Express)
```

#### أوامر مهمة
```bash
# Development
npm run dev                 # Start dev server with hot reload

# Building
npm run build              # Build for production

# Database
npm run db:push            # Apply schema changes to database
npm run db:migrations      # View migration status

# Admin Management
npm run admin:setup        # Sync admin credentials from .env to database

# Testing
npm run test               # Run test suite

# Deployment
npm run build && npm run start  # Production build and start
```

### 📝 Creating New Features

#### Adding a New API Endpoint
```typescript
// 1. Add route handler in server/routes/*.ts
export async function handleNewFeature(req, res) {
  try {
    // Validate input
    const { childId } = req.body;
    if (!childId) {
      return res.json({ success: false, error: "BAD_REQUEST", message: "childId required" });
    }

    // Check authorization
    const ownership = await db.query.parentChild.findFirst({
      where: and(
        eq(parentChild.parentId, req.user.id),
        eq(parentChild.childId, childId)
      )
    });
    if (!ownership) {
      return res.json({ success: false, error: "UNAUTHORIZED" });
    }

    // Execute business logic
    const result = await db.insert(someTable).values({...});

    // Return response
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[NewFeature]", error);
    return res.json({ success: false, error: "INTERNAL_SERVER_ERROR" });
  }
}

// 2. Register route in server/index.ts
app.post("/api/feature/new", adminMiddleware, handleNewFeature);

// 3. Add React Query hook in client/src/hooks/
export function useNewFeature() {
  return useMutation({
    mutationFn: (data) => api.post("/api/feature/new", data),
    onSuccess: (data) => { ... }
  });
}

// 4. Use in component
export function ComponentUsingFeature() {
  const mutation = useNewFeature();
  
  const handleClick = () => {
    mutation.mutate({ childId: "..." });
  };

  return (
    <button onClick={handleClick} disabled={mutation.isPending}>
      {mutation.isPending ? "Loading..." : "Use Feature"}
    </button>
  );
}
```

### 🐛 Debugging

#### Check Server Logs
```bash
# If running with npm run dev
# Logs appear in terminal

# In Docker:
docker-compose logs -f classiv3-app

# View specific errors:
docker-compose logs --tail 50 classiv3-app
```

#### Database Queries
```bash
# Connect to database via pgAdmin:
# http://localhost:5050

# Or via psql:
psql postgresql://$USER:$PASSWORD@$HOST:5433/$DATABASE
```

#### Check Redis Cache
```bash
# Via Redis Commander:
# http://localhost:8081

# Or via CLI:
docker-compose exec classiv3-redis redis-cli
> keys *
> get <key>
```

### 💾 Database Migrations

#### Creating New Migration
```bash
# Drizzle will auto-gen from schema changes
# No manual SQL needed

# After schema.ts change:
npm run db:push

# View migrations:
npm run db:migrations
```

#### Rolling Back Changes
```bash
# Using Drizzle (limited rollback support)
# Manual approach: Restore from backup or write migration down script
```

---

## 📊 الإحصائيات الرئيسية

| المقياس | القيمة |
|--------|--------|
| جداول قاعدة البيانات | 80+ |
| الفهارس المحسّنة | 64 |
| دول العالم المدعومة | 195+ |
| اللغات | العربية + الإنجليزية |
| النطاقات | LTR + RTL |
| مزودو الدفع | Stripe + محافظ محلية |
| خدمات البريد | Resend + SMTP محلي |
| خدمات SMS | Twilio + محلية |
| مزودو OAuth | Google, Facebook, Apple, Twitter, GitHub, Microsoft |
| أدوات المراقبة | 7 |
| Endpoints في API | 150+ |
| مستخدمون متزامنون معتمدون | 10,000+ |

---

## 🎯 الخطوات التالية

### أولويات التطوير المستقبلي

1. **Mobile Apps** - React Native لـ iOS/Android
2. **AI Integration** - تحليل تعلم الأطفال
3. **Advanced Analytics** - لوحات تحليل شاملة
4. **Video Content** - دعم الفيديو التفاعلي
5. **Gamification** - نقاط + تحديات + لوحات الصدارة
6. **Offline Support** - عمل بدون إنترنت
7. **Multi-Parent Support** - دعم عائلات موسعة
8. **School Integration** - ربط مع أنظمة المدارس

---

**آخر تحديث:** January 2025  
**الإصدار:** 2.0  
**الحالة:** ✅ جاهز للإنتاج

للمزيد من التفاصيل، راجع الملفات الفردية في المستودع أو اتصل بفريق التطوير.
