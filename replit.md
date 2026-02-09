# Classify - تطبيق الرقابة الأبوية

## نظرة عامة
Classify هو تطبيق عربي للرقابة الأبوية يساعد الآباء في إدارة علاقتهم مع أطفالهم من خلال المهام والألعاب والمكافآت.

## البنية التقنية
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL مع Drizzle ORM
- **Mobile**: Capacitor (iOS/Android)

## هيكل المشروع
```
├── client/                    # واجهة المستخدم (React)
│   ├── src/
│   │   ├── components/        # المكونات القابلة لإعادة الاستخدام
│   │   │   ├── dashboard/     # مكونات لوحة تحكم الوالدين
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   ├── ChildrenList.tsx
│   │   │   │   └── LinkChildCard.tsx
│   │   │   ├── child/         # مكونات واجهة الطفل
│   │   │   │   ├── PointsDisplay.tsx
│   │   │   │   ├── GameCard.tsx
│   │   │   │   └── TaskCard.tsx
│   │   │   └── ui/            # مكونات Shadcn UI
│   │   ├── pages/             # صفحات التطبيق
│   │   ├── hooks/
│   │   │   └── api/           # Hooks لجلب البيانات
│   │   │       ├── useParentData.ts
│   │   │       ├── useChildData.ts
│   │   │       └── useNotifications.ts
│   │   └── lib/               # مكتبات مساعدة
│   └── public/                # ملفات ثابتة
├── server/                    # الخادم (Express)
│   ├── src/modules/           # الوحدات المنظمة حسب المجال
│   │   └── shared/            # أدوات مشتركة
│   │       ├── validation.ts  # Zod schemas للتحقق
│   │       └── helpers.ts     # دوال مساعدة
│   ├── routes/                # مسارات API
│   ├── middleware/            # وسطاء Express
│   └── utils/                 # أدوات مساعدة
├── shared/                    # الكود المشترك بين Frontend و Backend
│   ├── schema.ts              # مخطط قاعدة البيانات (Drizzle)
│   ├── types.ts               # الأنواع المشتركة
│   └── constants.ts           # الثوابت والإعدادات
├── migrations/                # ملفات ترحيل قاعدة البيانات
├── android/                   # مشروع Android (Capacitor)
└── ios/                       # مشروع iOS (Capacitor)
```

## تشغيل المشروع
```bash
npm run dev    # تشغيل وضع التطوير (port 5000)
npm run build  # بناء للإنتاج
npm run start  # تشغيل وضع الإنتاج
```

## الميزات المنجزة
- ✅ تسجيل/دخول الآباء (بريد إلكتروني + هاتف)
- ✅ مصادقة OTP (6 أرقام، 5 دقائق) - Resend Integration
- ✅ تشفير كلمات المرور (bcrypt)
- ✅ جلسات JWT
- ✅ حفظ الجهاز الموثوق (Remember Device) - تجاوز OTP للأجهزة المحفوظة
- ✅ سياسة الخصوصية
- ✅ حذف الحساب
- ✅ PWA + Service Worker
- ✅ Dark/Light Mode
- ✅ نظام ربط الأطفال (QR + كود فريد)
- ✅ المتجر الاحترافي (Souq.com-inspired) مع الفئات والبحث والفلاتر
- ✅ نظام الشراء والسلة وتعيين المنتجات للأطفال
- ✅ نظام الإشعارات الشامل (10+ أنواع مع styling)
- ✅ الألعاب التعليمية مع نظام النقاط
- ✅ نظام المهام مع إعلانات مستمرة (sponsored-ad-like)
- ✅ نظام الإحالات والمكافآت (100 نقطة لكل إحالة نشطة)
- ✅ لوحة تقدم الطفل (مستويات السرعة + رسائل تحفيزية)
- ✅ تقارير الحالة الخلفية للوحة الوالدين (كل 5 دقائق)
- ✅ إدارة الألعاب للمسؤول (CRUD)
- ✅ نظام المواد الدراسية (subjects) مع API و UI للمسؤول والوالدين
- ✅ قوالب المهام الجاهزة (template tasks) حسب المادة
- ✅ واجهة الأطفال الديناميكية مع رسوم متحركة (framer-motion)
- ✅ نظام الإعلانات (ads) مع استهداف الجمهور (parents/children/all)
- ✅ تتبع المشاهدات والنقرات للإعلانات
- ✅ إدارة الإحالات في لوحة الأدمن مع الإحصائيات
- ✅ صفحة مهام المواد الدراسية (/subject-tasks)
- ✅ صفحة قسم المهام الثلاثي (/parent-tasks): مهام كلاسيفاي + مهامي + مهام عامة
- ✅ نظام المهام العامة مع نقاط وعمولة 10%
- ✅ إعدادات الإحالة في لوحة الأدمن
- ✅ عرض المهام المرتبطة عند تعديل المادة (تبويبات في المودال)
- ✅ Dockerfile و docker-compose.yml للنشر
- ✅ سكربتات التشغيل (setup.sh, start.sh)
- ✅ نظام الأرباح والعمولات (profitTransactions) - تتبع 90% للبائع و10% للتطبيق
- ✅ لوحة إدارة الآباء في الأدمن (عرض التفاصيل، إرسال إشعارات مع صور)
- ✅ لوحة نظام الأرباح (عمولة التطبيق، أفضل البائعين، سجل المعاملات)
- ✅ جدولة المهام للآباء (scheduledTasks) - إرسال مؤجل مع إلغاء
- ✅ نظام المكتبات التجارية (libraries) - إدارة المكتبات كتجار
- ✅ تسجيل دخول المكتبات منفصل (JWT) مع لوحة تحكم خاصة
- ✅ إدارة منتجات المكتبات مع نظام الخصومات والمخزون
- ✅ نظام الإحالات للمكتبات مع تتبع النقرات والتسجيلات والمشتريات
- ✅ نظام النشاط والترتيب (activityScore) للمكتبات
- ✅ متجر المكتبات (/library-store) للوالدين
- ✅ تبويب المكتبات في لوحة الأدمن مع CRUD كامل
- ✅ التحقق من JWT_SECRET عند بدء التشغيل (يفشل التطبيق إذا لم يُعد)
- ✅ تحديثات نقاط النشاط الذرية باستخدام Drizzle ORM
- ✅ Pagination والتحقق من المدخلات في APIs العامة للمكتبات
- ✅ تعديل المهام المخصصة للوالدين مع Zod validation
- ✅ نظام تسجيل دخول الأطفال بـ PIN (4-6 أرقام)
- ✅ نظام الأجهزة الموثوقة للأطفال (childTrustedDevices)
- ✅ API تعديل معلومات الوالدين والأطفال للمسؤول
- ✅ API تعديل النقاط/الرصيد للمسؤول مع إشعارات
- ✅ نظام تبديل اللغة (عربي/إنجليزي) مع حفظ التفضيل
- ✅ دعم RTL/LTR التلقائي حسب اللغة المختارة
- ✅ نظام الترجمة المحسّن (i18n):
  - 200+ مفتاح ترجمة في ar.json و en.json
  - أقسام منظمة: forgotPassword, errors, validation, parentTasks, parentStore, settingsPro, childNotifications, libraryDashboard, parentDashboard, childStore, childProfile
  - استخدام t() function في الصفحات الرئيسية (ForgotPassword, ChildLink, SettingsPro, ParentTasks, LibraryDashboard, ChildNotifications, ParentDashboard, ChildStore, ChildProfile)
- ✅ صفحة الملف الشخصي للطفل (ChildProfile):
  - تعديل الاسم، تاريخ الميلاد، اسم المدرسة، الصف الدراسي
  - حقل الهوايات مع حد 500 حرف
  - عرض الصورة الشخصية مع Avatar
  - تصميم متجاوب للجوال (mobile-first)
- ✅ نظام شجرة النمو (Growth Tree) - 8 مراحل من البذرة إلى الشجرة العظيمة
- ✅ تهيئة شجرة النمو عند إنشاء حساب الطفل
- ✅ تتبع أحداث النمو (المهام، الألعاب، المكافآت)
- ✅ مكون واجهة شجرة النمو مع رسوم متحركة
- ✅ التقرير السنوي للأطفال (خسار سنوي) - رسم بياني شهري
- ✅ عرض التقرير السنوي للوالدين في لوحة التحكم
- ✅ نظام SEO شامل (Meta Tags، Open Graph، Twitter Cards، Schema.org)
- ✅ التحكم في زواحف الذكاء الاصطناعي (GPTBot، Claude، Google AI)
- ✅ توليد robots.txt ديناميكي من لوحة التحكم
- ✅ تكامل التحليلات (Google Analytics، GTM، Facebook Pixel)
- ✅ إدارة إعدادات الدعم (البريد، الهاتف، واتساب، تيليجرام)
- ✅ صفحات الخطأ الاحترافية مع معلومات التواصل
- ✅ وضع الصيانة مع رسائل مخصصة
- ✅ ساعات العمل والمنطقة الزمنية
- ✅ Rate Limiting للمصادقة (5 محاولات/دقيقة)
- ✅ ErrorBoundary متقدم مع تحميل إعدادات الدعم

- ✅ فهارس قاعدة البيانات المحسّنة (64 فهرس) للأداء العالي

## فهارس قاعدة البيانات (Database Indexes)
الفهارس التالية مُضافة لتحسين الأداء مع 5000+ مستخدم متزامن:

### المصادقة والجلسات:
- `idx_parents_email`, `idx_parents_unique_code` - البحث السريع عن الوالدين
- `idx_sessions_parent_id`, `idx_sessions_expires_at` - إدارة الجلسات
- `idx_otp_codes_parent_id`, `idx_otp_codes_expires_at` - التحقق من OTP
- `idx_trusted_devices_*`, `idx_child_trusted_devices_*` - الأجهزة الموثوقة

### المهام والإشعارات:
- `idx_tasks_child_id`, `idx_tasks_child_status` - مهام الأطفال
- `idx_task_results_*` - نتائج المهام
- `idx_scheduled_tasks_*` - المهام المجدولة

### الطلبات والمتجر:
- `idx_store_orders_*` - طلبات المتجر
- `idx_order_items_*` - عناصر الطلبات
- `idx_products_category_id` - فلترة المنتجات
- `idx_parent_purchases_*`, `idx_child_purchases_*` - سجل المشتريات

### المكتبات والإعلانات:
- `idx_libraries_*`, `idx_library_products_*` - المكتبات التجارية
- `idx_ads_*`, `idx_ad_watch_history_*` - الإعلانات

### السجلات:
- `idx_activity_log_*`, `idx_login_history_*` - تتبع النشاط

## الميزات المعلقة
- [ ] إشعارات SMS (يحتاج مزود SMS)
- [ ] تحميل الصور/GIF للمهام (يحتاج خدمة تخزين)

## النشر على Production (Hostinger VPS)

### ملفات Docker
- `docker-compose.yml` - إعداد كامل مع SSL/HTTPS
- `docker-compose.http.yml` - إعداد HTTP فقط (للبداية السريعة)
- `Dockerfile` - بناء متعدد المراحل مع أمان محسّن

### الخطوات السريعة للنشر
```bash
# 1. استنساخ المشروع
git clone <repo> && cd classify

# 2. إنشاء ملف البيئة
cp .env.production.example .env

# 3. توليد المفاتيح الآمنة
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 64  # SESSION_SECRET
openssl rand -base64 32  # POSTGRES_PASSWORD

# 4. تشغيل التطبيق (HTTP فقط)
docker compose -f docker-compose.http.yml up -d

# 5. التحقق من الصحة
curl http://localhost/health
```

### المتغيرات المطلوبة للـ Production
| المتغير | الوصف |
|---------|-------|
| `POSTGRES_USER` | اسم مستخدم قاعدة البيانات |
| `POSTGRES_PASSWORD` | كلمة مرور قاعدة البيانات (32+ حرف) |
| `JWT_SECRET` | مفتاح JWT (64+ حرف) |
| `SESSION_SECRET` | مفتاح الجلسة (64+ حرف) |
| `ADMIN_EMAIL` | بريد المسؤول |
| `ADMIN_PASSWORD` | كلمة مرور المسؤول (16+ حرف) |

راجع `DEPLOYMENT.md` للتعليمات الكاملة.

## المتغيرات البيئية المطلوبة (Development)
- `DATABASE_URL` - اتصال PostgreSQL
- `JWT_SECRET` - مفتاح توقيع JWT
- `RESEND_API_KEY` - مفتاح Resend للبريد الإلكتروني

## ملاحظات
- البريد الإلكتروني مُعد عبر Resend Integration
- SMS OTP غير مُعد (يحتاج Twilio أو مزود آخر)
- حسابات المسؤول: marco0000110@gmail.com / admin123
- نظام قاعدة البيانات مُحسّن لـ 5000+ مستخدم متزامن

## هيكل وسائل الدفع
- **وسائل الدفع للمتجر**: يتم إنشاؤها بواسطة المسؤول (isDefault=true, isActive=true)
- **وسائل الدفع للوالدين**: يتم إنشاؤها بواسطة الوالدين لاستقبال الإيداعات
- **/api/store/payment-methods**: يعرض وسائل الدفع الآمنة للمتجر (id, type, accountName, bankName فقط)
- **المصادقة**: queryClient يدعم tokens للوالدين والأطفال والمسؤولين
