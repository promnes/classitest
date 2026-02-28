# 🌳 شجرة التنقل التفصيلية الكاملة - Classify App

> **تاريخ التحليل:** 25 يونيو 2025  
> **الإصدار:** 2.0 (التفصيلي)  
> **ملاحظة:** كل زر، كل مودال، كل حقل إدخال، كل تبويب

---

## 📊 إحصائيات سريعة

| العنصر | العدد |
|--------|-------|
| الصفحات الرئيسية | 32+ |
| الأزرار التفاعلية | 200+ |
| النوافذ المنبثقة (Modals) | 35+ |
| التبويبات (Tabs) | 50+ |
| حقول الإدخال (Forms) | 80+ |

---

## 🏠 الصفحة الرئيسية (Home.tsx)

```
/  [الصفحة الرئيسية]
│
├── 📌 HEADER (الهيدر)
│   ├── [Logo] - شعار Classify مع علامة ✓
│   ├── [LanguageSelector] - تغيير اللغة (عربي/English)
│   ├── [PWAInstallButton] - تحميل التطبيق 📲
│   │   └── عند الضغط → يظهر prompt تثبيت PWA
│   └── [ThemeToggle] - تبديل الوضع (☀️/🌙)
│       └── عند الضغط → تغيير isDark state
│
├── 📌 HERO SECTION
│   ├── [Logo Image] - شعار متحرك (animate-bounce)
│   ├── [Welcome Text] - "مرحباً بكم في Classify"
│   └── [Subtitle] - "منصة الرقابة الأبوية الذكية"
│
├── 📌 ACCOUNT SELECTION (اختيار نوع الحساب)
│   │
│   ├── 👨‍💼 [Parent Card] - بطاقة الوالد (حمراء)
│   │   ├── أيقونة: 👨‍💼
│   │   ├── النص: "حساب الوالد"
│   │   ├── الوصف: "إدارة مهام الأطفال"
│   │   └── 🔗 onClick → navigate("/parent-auth")
│   │
│   └── 👧 [Child Card] - بطاقة الطفل (خضراء)
│       ├── أيقونة: 👧
│       ├── النص: "حساب الطفل"
│       ├── الوصف: "الألعاب والمهام"
│       └── 🔗 onClick → navigate("/child-link")
│
└── 📌 FOOTER (الفوتر)
    ├── [Privacy Button] - 🔒 Privacy
    │   └── 🔗 onClick → navigate("/privacy")
    ├── [Terms Button] - 📋 Terms
    │   └── 🔗 onClick → navigate("/terms")
    └── [Copyright] - "© 2024 Classify by proomnes"
```

---

## 🔐 صفحة تسجيل الوالد (ParentAuth.tsx)

```
/parent-auth
│
├── 📌 HEADER
│   ├── [Back Button] - "← رجوع"
│   │   └── 🔗 onClick → navigate("/")
│   └── [PWAInstallButton]
│
├── 📌 AUTH FORM
│   │
│   ├── [Tab: Login] - تسجيل الدخول ✅ (default)
│   │   │
│   │   ├── [Toggle: Email/Phone]
│   │   │   ├── [Email Mode] → حقل البريد الإلكتروني
│   │   │   └── [Phone Mode] → حقل رقم الهاتف
│   │   │
│   │   ├── 📝 FORM FIELDS (وضع البريد)
│   │   │   ├── [Input: Email]
│   │   │   │   └── placeholder: "البريد الإلكتروني"
│   │   │   └── [Input: Password]
│   │   │       └── type: password
│   │   │
│   │   ├── 📝 FORM FIELDS (وضع الهاتف)
│   │   │   ├── [Input: Phone]
│   │   │   │   └── placeholder: "01xxxxxxxxx"
│   │   │   └── [Input: Password]
│   │   │
│   │   ├── [Submit Button] - "تسجيل الدخول"
│   │   │   ├── عند النجاح مع OTP → navigate("/otp")
│   │   │   ├── عند النجاح بدون OTP → navigate("/parent-dashboard")
│   │   │   └── عند الخطأ → إظهار رسالة الخطأ
│   │   │
│   │   ├── [Social Login Buttons]
│   │   │   ├── [Google Login] 🔴
│   │   │   ├── [Facebook Login] 🔵
│   │   │   └── [Apple Login] ⚫
│   │   │
│   │   └── [Forgot Password Link]
│   │       └── 🔗 onClick → navigate("/forgot-password")
│   │
│   └── [Tab: Register] - تسجيل جديد
│       │
│       ├── 📝 FORM FIELDS
│       │   ├── [Input: Name]
│       │   │   └── placeholder: "الاسم الكامل"
│       │   ├── [Input: Email]
│       │   │   └── placeholder: "البريد الإلكتروني"
│       │   ├── [Input: Phone] (اختياري)
│       │   │   └── placeholder: "رقم الهاتف"
│       │   ├── [Input: Password]
│       │   │   └── type: password
│       │   └── [Input: Confirm Password]
│       │
│       └── [Submit Button] - "إنشاء حساب"
│           └── عند النجاح → navigate("/otp")
│
└── 📌 SMS VERIFICATION MODAL (عند توفر SMS)
    ├── [OTPMethodSelector]
    │   ├── [Email Option] - "عبر البريد"
    │   └── [SMS Option] - "عبر الرسائل النصية"
    ├── [Phone Input] - إدخال رقم الهاتف
    ├── [OTP Input] - إدخال كود التحقق (6 أرقام)
    ├── [Verify Button] - "تحقق"
    └── [Cancel Button] - "إلغاء" → navigate("/otp")
```

---

## 📱 صفحة OTP (OTP.tsx)

```
/otp
│
├── 📌 OTP FORM
│   ├── [OTP Input] - 6 خانات للكود
│   │   └── autoFocus: true
│   ├── [Verify Button] - "تحقق من الكود"
│   │   └── عند النجاح → navigate("/parent-dashboard")
│   ├── [Resend Button] - "إعادة إرسال الكود"
│   │   └── disabled لمدة 60 ثانية
│   └── [Timer] - العد التنازلي للإعادة
│
└── 📌 ERROR STATE
    └── [Error Message] - رسالة الخطأ
```

---

## 👧 صفحة ربط الطفل (ChildLink.tsx)

```
/child-link
│
├── 📌 HEADER
│   ├── [Back Button] - "← رجوع"
│   │   └── 🔗 onClick → navigate("/")
│   ├── [LanguageSelector]
│   └── [PWAInstallButton]
│
├── 📌 SAVED CHILDREN (الأطفال المحفوظين)
│   │ (يظهر إذا كان هناك جلسات محفوظة)
│   │
│   └── لكل طفل محفوظ:
│       ├── [Child Avatar] - دائرة ملونة
│       ├── [Child Name]
│       ├── [Quick Login Button] - "دخول سريع"
│       │   └── 🔗 quickLoginMutation → navigate("/child-games")
│       └── [Remove Button] - حذف من المحفوظين
│
├── 📌 STEP: WELCOME (الترحيب)
│   ├── [Welcome Animation] - رسوم متحركة
│   ├── [Start Button] - "هيا نبدأ!"
│   │   └── 🔗 onClick → setStep("name_entry")
│   └── [Add New Child] - "إضافة طفل جديد"
│
├── 📌 STEP: NAME_ENTRY (إدخال الاسم)
│   │
│   ├── [Method Toggle]
│   │   ├── [Code Method] - "بالكود" (default)
│   │   └── [QR Method] - "بالـ QR"
│   │
│   ├── 📝 CODE METHOD
│   │   ├── [Input: Child Name]
│   │   │   └── placeholder: "اسم الطفل"
│   │   ├── [Input: Link Code]
│   │   │   └── placeholder: "كود الربط من الوالد"
│   │   ├── [Checkbox: Remember Device]
│   │   │   └── default: true
│   │   └── [Submit Button] - "ربط الحساب"
│   │       ├── عند النجاح → navigate("/child-games")
│   │       └── عند الخطأ → إظهار رسالة
│   │
│   └── 📝 QR METHOD
│       ├── [Scan QR Button] - "مسح QR بالكاميرا"
│       │   └── 🔗 onClick → فتح الكاميرا
│       ├── [Upload QR Button] - "رفع صورة QR"
│       │   └── 🔗 onClick → فتح file picker
│       ├── [Camera View] - عرض الكاميرا
│       │   ├── [video element] - بث الكاميرا
│       │   ├── [canvas element] - تحليل QR
│       │   └── [Close Camera] - "✕" إغلاق الكاميرا
│       └── [File Input] - input type="file"
│
├── 📌 STEP: WAITING_APPROVAL (انتظار الموافقة)
│   │ (عند طلب الدخول بالاسم فقط)
│   │
│   ├── [Waiting Animation] - ⏳ دائرة تحميل
│   ├── [Status Text] - "في انتظار موافقة الوالد..."
│   ├── [Polling] - تحقق كل 3 ثواني من حالة الطلب
│   │   ├── status === "approved" → navigate("/child-games")
│   │   ├── status === "rejected" → إظهار رفض
│   │   └── status === "expired" → إظهار انتهاء
│   └── [Cancel Button] - "إلغاء الطلب"
│       └── 🔗 onClick → setStep("name_entry")
│
└── 📌 STEP: NEW_LINK (ربط جديد)
    └── [Back to Welcome] → setStep("welcome")
```

---

## 👨‍💼 لوحة تحكم الوالد (ParentDashboard.tsx)

```
/parent-dashboard  [1104 سطر]
│
├── 📌 HEADER
│   │
│   ├── [Logo Section]
│   │   └── النص: "Classify" + "by proomnes"
│   │
│   ├── [Notifications Button] 🔔
│   │   ├── عند الضغط → فتح dropdown الإشعارات
│   │   ├── [Badge] - عدد الإشعارات غير المقروءة
│   │   └── [Notifications Dropdown]
│   │       ├── [Header] - "الإشعارات"
│   │       ├── [Notification Items]
│   │       │   ├── [Notification Icon]
│   │       │   ├── [Notification Text]
│   │       │   ├── [Notification Time]
│   │       │   └── [Mark Read Button]
│   │       └── [View All] → navigate("/parent/notifications")
│   │
│   ├── [Theme Toggle] 🌙/☀️
│   │   └── onClick → toggleTheme()
│   │
│   ├── [Language Selector] 🌍
│   │   ├── [Arabic] - العربية
│   │   └── [English]
│   │
│   ├── [Settings Button] ⚙️
│   │   └── 🔗 onClick → navigate("/settings")
│   │
│   └── [Logout Button] 🚪
│       └── onClick → logout() + navigate("/")
│
├── 📌 MAIN TABS (6 تبويبات رئيسية)
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Overview] 📊 "نظرة عامة" (default)
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Stats Cards]
│   │   │   ├── [Total Children Card]
│   │   │   │   └── عدد الأطفال المسجلين
│   │   │   ├── [Active Tasks Card]
│   │   │   │   └── المهام النشطة
│   │   │   ├── [Total Points Card]
│   │   │   │   └── إجمالي النقاط
│   │   │   └── [Wallet Balance Card]
│   │   │       └── رصيد المحفظة
│   │   │
│   │   ├── [Quick Actions Grid]
│   │   │   ├── [Create Task Button] ➕
│   │   │   │   └── 🔗 onClick → navigate("/parent/tasks")
│   │   │   ├── [Go to Store Button] 🛒
│   │   │   │   └── 🔗 onClick → navigate("/parent/store")
│   │   │   ├── [Wallet Button] 💰
│   │   │   │   └── 🔗 onClick → navigate("/wallet")
│   │   │   └── [Subjects Button] 📚
│   │   │       └── 🔗 onClick → navigate("/subjects")
│   │   │
│   │   ├── [Children Overview]
│   │   │   └── لكل طفل:
│   │   │       ├── [Avatar]
│   │   │       ├── [Name]
│   │   │       ├── [Points]
│   │   │       ├── [Tasks Progress]
│   │   │       └── [View Details] → setTab("children")
│   │   │
│   │   └── [Recent Activity]
│   │       └── آخر 5 أنشطة
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Children] 👨‍👩‍👧‍👦 "الأطفال"
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Add Child Button] ➕ "إضافة طفل"
│   │   │   └── onClick → setShowAddChildModal(true)
│   │   │
│   │   ├── [Children List]
│   │   │   └── لكل طفل (ChildCard):
│   │   │       │
│   │   │       ├── [Avatar/Image]
│   │   │       ├── [Name]
│   │   │       ├── [Age]
│   │   │       ├── [Points Balance] ⭐
│   │   │       ├── [Online Status] 🟢/🔴
│   │   │       │
│   │   │       ├── [Action Buttons]
│   │   │       │   ├── [Edit Button] ✏️
│   │   │       │   │   └── onClick → setShowEditChildModal(true)
│   │   │       │   ├── [View Tasks Button] 📝
│   │   │       │   │   └── onClick → navigate to tasks tab
│   │   │       │   ├── [Send Gift Button] 🎁
│   │   │       │   │   └── onClick → navigate("/parent/store")
│   │   │       │   ├── [Show QR Button] 📱
│   │   │       │   │   └── onClick → setShowQRModal(true)
│   │   │       │   └── [Delete Button] 🗑️
│   │   │       │       └── onClick → confirmDelete()
│   │   │       │
│   │   │       └── [Quick Stats]
│   │   │           ├── المهام المكتملة
│   │   │           ├── الوقت على التطبيق
│   │   │           └── آخر نشاط
│   │   │
│   │   └── 📌 ADD CHILD MODAL
│   │       │
│   │       ├── [Modal Header] - "إضافة طفل جديد"
│   │       ├── [Close Button] ✕
│   │       │
│   │       ├── 📝 FORM FIELDS
│   │       │   ├── [Input: Name] *
│   │       │   │   └── placeholder: "اسم الطفل"
│   │       │   ├── [Input: Age]
│   │       │   │   └── type: number, min: 3, max: 18
│   │       │   ├── [Select: Gender]
│   │       │   │   ├── [Option: Male] - ذكر
│   │       │   │   └── [Option: Female] - أنثى
│   │       │   ├── [Image Upload] - صورة الطفل
│   │       │   │   └── onClick → file picker
│   │       │   └── [Initial Points]
│   │       │       └── default: 0
│   │       │
│   │       ├── [Submit Button] - "إضافة"
│   │       │   └── onClick → addChildMutation.mutate()
│   │       └── [Cancel Button] - "إلغاء"
│   │           └── onClick → setShowAddChildModal(false)
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Tasks] 📝 "المهام"
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Go to Tasks Page Button]
│   │   │   └── 🔗 onClick → navigate("/parent/tasks")
│   │   │
│   │   ├── [Filter: By Child]
│   │   │   └── Select dropdown للأطفال
│   │   │
│   │   ├── [Filter: By Status]
│   │   │   ├── [All]
│   │   │   ├── [Pending]
│   │   │   └── [Completed]
│   │   │
│   │   └── [Tasks List]
│   │       └── لكل مهمة:
│   │           ├── [Subject Emoji]
│   │           ├── [Task Title]
│   │           ├── [Child Name]
│   │           ├── [Status Badge]
│   │           ├── [Points Reward]
│   │           └── [Created Date]
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Store] 🛒 "المتجر"
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Quick Buttons]
│   │   │   ├── [Shop Now Button] 🛍️
│   │   │   │   └── 🔗 onClick → navigate("/parent/store")
│   │   │   ├── [My Inventory Button] 📦
│   │   │   │   └── 🔗 onClick → navigate("/parent/inventory")
│   │   │   ├── [Cart Button] 🛒
│   │   │   │   └── 🔗 onClick → navigate("/parent/store") + open cart
│   │   │   └── [Orders Button] 📋
│   │   │       └── 🔗 onClick → navigate("/parent/orders")
│   │   │
│   │   └── [Recent Orders]
│   │       └── آخر 3 طلبات
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Referral] 🤝 "الإحالات"
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Referral Code Display]
│   │   │   ├── [Code Text] - الكود الخاص بك
│   │   │   └── [Copy Button] 📋
│   │   │       └── onClick → navigator.clipboard.write()
│   │   │
│   │   ├── [Share Buttons]
│   │   │   ├── [Share WhatsApp] 💬
│   │   │   ├── [Share Facebook] 📘
│   │   │   └── [Share Twitter] 🐦
│   │   │
│   │   ├── [Referral Stats]
│   │   │   ├── عدد الإحالات الناجحة
│   │   │   └── الأرباح من الإحالات
│   │   │
│   │   └── [Referral History]
│   │       └── قائمة المُحالين
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   └── [TAB: Reports] 📊 "التقارير"
│       ═══════════════════════════════════════════════════════════════════
│       │
│       ├── [Filter: Select Child]
│       │
│       └── [ChildReportCard] - لكل طفل
│           ├── [Performance Graph]
│           ├── [Tasks Completion Rate]
│           ├── [Points History]
│           ├── [Time Spent]
│           └── [Subjects Progress]
│
└── 📌 QR CODE MODAL (نافذة كود QR)
    │
    ├── [Modal Header] - "كود QR للطفل: {childName}"
    ├── [QR Image] - صورة QR
    ├── [Link Code] - الكود النصي
    ├── [Copy Code Button]
    ├── [Download QR Button]
    └── [Close Button]
```

---

## 📝 صفحة المهام للوالد (ParentTasks.tsx)

```
/parent/tasks  [867 سطر]
│
├── 📌 HEADER
│   ├── [Back Button] ←
│   │   └── 🔗 onClick → navigate("/parent")
│   └── [Page Title] - "قسم المهام"
│
├── 📌 FILTER BAR
│   │
│   ├── [Select Subject] 📚
│   │   ├── [All Subjects]
│   │   └── [Subject Options] - من API
│   │
│   ├── [Scheduled Tasks Button] ⏰
│   │   └── onClick → setShowScheduledTasks(true)
│   │
│   └── [Create Task Button] ➕ "إنشاء مهمة جديدة"
│       └── onClick → setShowCreateDialog(true)
│
├── 📌 TASK TABS (3 تبويبات)
│   │
│   ├── [TAB: Classy Tasks] 📚 "مهام كلاسيفاي"
│   │   │ (مهام جاهزة من المنصة)
│   │   │
│   │   ├── [Subject Required Message]
│   │   │   └── "اختر مادة لعرض المهام"
│   │   │
│   │   └── [Task Cards]
│   │       └── لكل مهمة (TaskCard):
│   │           ├── [Title]
│   │           ├── [Question Preview]
│   │           ├── [Points Badge] ⭐
│   │           └── [Send Button] 📤
│   │               └── onClick → openSendDialog(task)
│   │
│   ├── [TAB: My Tasks] ⭐ "مهامي"
│   │   │ (مهام أنشأها الوالد)
│   │   │
│   │   ├── [Empty State]
│   │   │   └── [Create Task Button]
│   │   │
│   │   └── [Task Cards]
│   │       └── لكل مهمة (TaskCard):
│   │           ├── [Title]
│   │           ├── [Question Preview]
│   │           ├── [Points Badge]
│   │           ├── [Edit Button] ✏️
│   │           │   └── onClick → openEditDialog(task)
│   │           └── [Send Button] 📤
│   │
│   └── [TAB: Public Tasks] 👥 "مهام عامة"
│       │ (مهام من والدين آخرين)
│       │
│       ├── [Info Notice]
│       │   └── "استخدام المهام العامة يكلف نقاط"
│       │
│       └── [Task Cards]
│           └── لكل مهمة:
│               ├── [Title]
│               ├── [Question]
│               ├── [Points Reward]
│               ├── [Points Cost Badge] 🟠
│               ├── [Creator Name]
│               └── [Send Button]
│
├── 📌 CREATE TASK DIALOG (نافذة إنشاء مهمة)
│   │
│   ├── [Header] - "إنشاء مهمة جديدة"
│   ├── [Close Button] ✕
│   │
│   ├── 📝 FORM FIELDS
│   │   ├── [Select: Subject] *
│   │   │   └── اختيار المادة
│   │   ├── [Input: Points Reward]
│   │   │   └── default: 10
│   │   ├── [Input: Task Title] *
│   │   │   └── placeholder: "عنوان المهمة"
│   │   ├── [Textarea: Question] *
│   │   │   └── placeholder: "اكتب السؤال"
│   │   ├── [Answers Section]
│   │   │   ├── [Input: Answer 1] (الإجابة الصحيحة) ✅
│   │   │   ├── [Input: Answer 2]
│   │   │   ├── [Input: Answer 3]
│   │   │   └── [Input: Answer 4]
│   │   ├── [Switch: Public Share]
│   │   │   └── "شارك المهمة مع الآخرين"
│   │   └── [Input: Usage Cost] (إذا عامة)
│   │       └── default: 5
│   │
│   └── [Create Button] - "إنشاء المهمة"
│       └── onClick → createTaskMutation.mutate()
│
├── 📌 SEND TASK DIALOG (نافذة إرسال مهمة)
│   │
│   ├── [Header] - "إرسال للطفل"
│   ├── [Task Preview Card]
│   │
│   ├── [Select: Child] *
│   │   └── قائمة الأطفال
│   │
│   ├── [Switch: Schedule Mode]
│   │   └── "جدولة لوقت لاحق"
│   │
│   ├── [Schedule Fields] (إذا مفعل)
│   │   ├── [Input: Date]
│   │   │   └── type: date
│   │   └── [Input: Time]
│   │       └── type: time
│   │
│   └── [Send/Schedule Button]
│       ├── [Send Now] - "إرسال" 📤
│       └── [Schedule] - "جدولة" ⏰
│
├── 📌 SCHEDULED TASKS DIALOG (المهام المجدولة)
│   │
│   ├── [Header] - "المهام المجدولة"
│   ├── [Empty State] - "لا توجد مهام مجدولة"
│   │
│   └── [Scheduled Task Cards]
│       └── لكل مهمة مجدولة:
│           ├── [Task Title]
│           ├── [Child Name]
│           ├── [Scheduled Time]
│           ├── [Status Badge]
│           │   ├── pending - "معلق"
│           │   ├── sent - "تم الإرسال"
│           │   └── cancelled - "ملغى"
│           └── [Cancel Button] ✕ (إذا pending)
│
└── 📌 EDIT TASK DIALOG (تعديل مهمة)
    │
    ├── [Header] - "تعديل المهمة"
    ├── [Same fields as Create]
    └── [Save Button] - "حفظ التغييرات"
```

---

## 💰 صفحة المحفظة (Wallet.tsx)

```
/wallet  [315 سطر]
│
├── 📌 HEADER
│   ├── [Title] - "💰 المحفظة"
│   ├── [Subtitle] - "إدارة الأموال ووسائل الدفع"
│   ├── [Theme Toggle]
│   └── [Back Button] - "← رجوع"
│       └── 🔗 onClick → navigate("/parent-dashboard")
│
├── 📌 WALLET BALANCE CARD
│   │
│   ├── [Current Balance] - "$ {balance}"
│   ├── [Deposit Button] 💳 "إيداع أموال"
│   │   └── onClick → setShowDeposit(true)
│   │   └── disabled إذا لم يتم اختيار وسيلة دفع
│   │
│   └── [Stats]
│       ├── إجمالي الإيداع
│       └── إجمالي المصروف
│
├── 📌 PAYMENT METHODS SECTION
│   │
│   ├── [Section Header] - "💳 وسائل الدفع"
│   ├── [Add Method Button] - "+ إضافة وسيلة"
│   │   └── onClick → setShowAddPayment(true)
│   │
│   └── [Payment Methods Grid]
│       └── لكل وسيلة:
│           ├── [Type Icon + Name]
│           ├── [Account/Phone Number]
│           ├── [Default Badge] (إذا افتراضية)
│           ├── [Select Button] - للاختيار
│           └── [Delete Button] - "حذف"
│
├── 📌 ADD PAYMENT MODAL
│   │
│   ├── [Header] - "إضافة وسيلة دفع"
│   │
│   ├── [Select: Payment Type]
│   │   ├── 🏦 تحويل بنكي
│   │   ├── 📱 فودافون كاش
│   │   ├── 🟠 أورنج موني
│   │   ├── 🟣 اتصالات موني
│   │   ├── 💳 ويبت
│   │   ├── ⚡ إنستاباي
│   │   └── 🎫 فوري
│   │
│   ├── 📝 BANK TRANSFER FIELDS (إذا بنكي)
│   │   ├── [Input: Bank Name]
│   │   ├── [Input: Account Number]
│   │   └── [Input: Account Name]
│   │
│   ├── 📝 MOBILE WALLET FIELDS (غير ذلك)
│   │   └── [Input: Phone/Account Number]
│   │
│   ├── [Checkbox: Set as Default]
│   │
│   ├── [Add Button] - "إضافة"
│   └── [Cancel Button] - "إلغاء"
│
└── 📌 DEPOSIT MODAL
    │
    ├── [Header] - "إيداع أموال"
    ├── [Input: Amount]
    │   └── placeholder: "أدخل المبلغ"
    ├── [Selected Payment Info]
    ├── [Deposit Button] - "إيداع"
    └── [Cancel Button] - "إلغاء"
```

---

## ⚙️ صفحة الإعدادات (Settings.tsx)

```
/settings  [532 سطر]
│
├── 📌 HEADER
│   ├── [Title] - "⚙️ الإعدادات"
│   ├── [Theme Toggle]
│   ├── [Language Selector]
│   └── [Back Button]
│       └── 🔗 onClick → navigate("/parent-dashboard")
│
├── 📌 TABS (4 تبويبات)
│   │
│   ├── [TAB: Profile] 👤 "الملف الشخصي"
│   │   │
│   │   ├── [Error/Success Messages]
│   │   │
│   │   ├── 📝 FORM FIELDS
│   │   │   ├── [Input: Name]
│   │   │   │   └── value: profileData.name
│   │   │   ├── [Input: Email]
│   │   │   │   └── value: profileData.email
│   │   │   └── [Input: Phone]
│   │   │       └── placeholder: "01xxxxxxxxx"
│   │   │
│   │   └── [Save Button] 💾 "حفظ التغييرات"
│   │       └── onClick → updateProfileMutation.mutate()
│   │
│   ├── [TAB: Security] 🔐 "الأمان"
│   │   │
│   │   ├── [Change Password Section]
│   │   │   ├── [Input: Current Password]
│   │   │   ├── [Input: New Password]
│   │   │   ├── [Input: Confirm Password]
│   │   │   └── [Change Password Button] 🔐
│   │   │       └── onClick → changePasswordMutation.mutate()
│   │   │
│   │   └── [Delete Account Section] ⚠️
│   │       ├── [Warning Title] - "حذف الحساب"
│   │       ├── [Warning Description]
│   │       ├── [Input: Password to Confirm]
│   │       └── [Delete Account Button] 🗑️
│   │           └── onClick → deleteAccountMutation.mutate()
│   │
│   ├── [TAB: Appearance] 🎨 "المظهر"
│   │   │
│   │   └── [Theme Toggle Row]
│   │       ├── [Current Theme Icon] ☀️/🌙
│   │       ├── [Theme Name]
│   │       └── [Toggle Button]
│   │           └── onClick → toggleTheme()
│   │
│   └── [TAB: Contact] 📞 "تواصل معنا"
│       │
│       ├── [Privacy Policy Button]
│       │   └── 🔗 onClick → navigate("/privacy-policy")
│       │
│       └── [Contact Grid]
│           ├── [Phone Link] 📱
│           │   └── href: tel:{phone}
│           ├── [Email Link] 📧
│           │   └── href: mailto:{email}
│           ├── [WhatsApp Link] 💬
│           │   └── href: https://wa.me/{number}
│           ├── [Facebook Link] 📘
│           │   └── target: _blank
│           ├── [Instagram Link] 📸
│           │   └── target: _blank
│           ├── [Twitter Link] 🐦
│           │   └── target: _blank
│           └── [Address] 📍
```

---

## 🎮 صفحة ألعاب الطفل (ChildGames.tsx)

```
/child-games  [383 سطر]
│
├── 📌 HEADER
│   │
│   ├── [Language Selector] 🌍
│   │
│   ├── [PWA Install Button] 📲
│   │   └── يظهر إذا التطبيق غير مثبت
│   │
│   ├── [Notifications Button] 🔔
│   │   ├── [Badge] - عدد الإشعارات
│   │   └── 🔗 onClick → navigate("/child-notifications")
│   │
│   ├── [Gifts Button] 🎁
│   │   └── 🔗 onClick → navigate("/child-gifts")
│   │
│   ├── [Store Button] 🛒
│   │   └── 🔗 onClick → navigate("/child-store")
│   │
│   ├── [Settings Button] ⚙️
│   │   └── 🔗 onClick → navigate("/child-settings")
│   │
│   └── [Logout Button] 🚪
│       └── onClick → logout + navigate("/")
│
├── 📌 POINTS DISPLAY
│   ├── [Star Icon] ⭐
│   └── [Points Count] - "{totalPoints}"
│
├── 📌 GROWTH TREE SECTION
│   │
│   └── [GrowthTree Component]
│       ├── [Tree Animation]
│       ├── [Level Indicator]
│       └── [Progress Bar]
│
├── 📌 TASKS PREVIEW
│   │
│   ├── [Pending Tasks Card]
│   │   ├── [Task Count]
│   │   └── [Go to Tasks Button]
│   │       └── 🔗 onClick → navigate("/child-tasks")
│   │
│   └── [Quick Task Preview]
│       └── آخر مهمة معلقة
│
├── 📌 GAMES SECTION
│   │
│   ├── [Section Title] - "الألعاب"
│   │
│   └── [Games Grid]
│       └── لكل لعبة (Game Card):
│           ├── [Game Image]
│           ├── [Game Name]
│           ├── [Points Per Play]
│           ├── [Play Button] 🎮
│           │   └── onClick → setSelectedGame(game)
│           └── [Locked Badge] (إذا مقفلة)
│
├── 📌 GAME MODAL (عند اختيار لعبة)
│   │
│   ├── [Modal Overlay]
│   ├── [Game Content Area]
│   │
│   ├── [Close Button] ✕
│   │   └── onClick → setSelectedGame(null)
│   │
│   └── [Complete Button] ✓ "انتهيت"
│       └── onClick → completeGameMutation.mutate()
│
└── 📌 REWARD ANIMATION (AnimatePresence)
    │ (يظهر عند اكتمال لعبة/مهمة)
    │
    ├── [Confetti Animation]
    ├── [Points Earned] ⭐ "+{points}"
    └── [Auto Hide] - بعد 2.5 ثانية
```

---

## 🛒 متجر الطفل (ChildStore.tsx)

```
/child-store  [910 سطر]
│
├── 📌 HEADER
│   │
│   ├── [Back Button] ←
│   │   └── 🔗 onClick → navigate("/child-games")
│   │
│   ├── [Logo] - "كلاسيفاي ستور" ✨
│   │
│   ├── [Search Input] 🔍
│   │   └── placeholder: "ابحث..."
│   │
│   ├── [Points Display] (على الشاشات الكبيرة)
│   │   └── ⭐ {totalPoints}
│   │
│   ├── [Notifications Button] 🔔
│   │   └── 🔗 onClick → navigate("/child-notifications")
│   │
│   └── [Cart Button] 🛒
│       ├── [Badge] - عدد العناصر
│       └── onClick → setShowCart(true)
│
├── 📌 CATEGORY BAR
│   │
│   ├── [All Button] - "الكل"
│   │   └── onClick → setSelectedCategory(null)
│   │
│   ├── [Library Button] 📖 - "المكتبات"
│   │   └── onClick → setShowLibraryOnly(true)
│   │
│   └── [Category Buttons]
│       └── لكل فئة:
│           ├── [Category Icon]
│           ├── [Category Name]
│           └── onClick → setSelectedCategory(id)
│
├── 📌 FILTER BAR
│   │
│   ├── [Feature Icons] (شاشات كبيرة)
│   │   ├── 🚚 توصيل سريع
│   │   ├── 🛡️ ضمان الجودة
│   │   └── ⏰ دعم 24/7
│   │
│   ├── [Sort Select]
│   │   ├── الأكثر مبيعاً
│   │   ├── النقاط: الأقل
│   │   ├── النقاط: الأعلى
│   │   ├── الأحدث
│   │   └── التقييم
│   │
│   └── [View Mode Toggle]
│       ├── [Grid View] 🔲
│       └── [List View] 📋
│
├── 📌 FEATURED PRODUCTS SECTION
│   │ (يظهر إذا لا يوجد فلتر)
│   │
│   ├── [Section Title] - "المنتجات المميزة" ✨
│   │
│   └── [Products Grid]
│       └── لكل منتج:
│           ├── [Product Image]
│           ├── [Available Badge] ✓ (إذا يكفي الرصيد)
│           ├── [Discount Badge] -X%
│           ├── [Library Badge] (إذا من مكتبة)
│           ├── [Brand Name]
│           ├── [Product Name]
│           ├── [Stars Rating] ⭐⭐⭐⭐⭐
│           ├── [Points Price]
│           ├── [Original Price] (مشطوب)
│           └── [Add to Cart Button] ➕
│
├── 📌 ALL PRODUCTS SECTION
│   │
│   ├── [Section Title] - "{categoryName}" أو "جميع المنتجات"
│   ├── [Product Count] - "{count} منتج"
│   │
│   ├── [Loading State]
│   │   └── Skeleton cards
│   │
│   ├── [Empty State]
│   │   ├── [Package Icon] 📦
│   │   └── "لا توجد منتجات"
│   │
│   └── [Products Grid/List]
│       └── نفس تفاصيل المنتج المميز
│
├── 📌 CART MODAL
│   │
│   ├── [Header] - "🛒 سلة التسوق"
│   ├── [Close Button] ✕
│   │
│   ├── [Cart Items]
│   │   └── لكل عنصر:
│   │       ├── [Product Image]
│   │       ├── [Product Name]
│   │       ├── [Quantity Controls]
│   │       │   ├── [Decrease Button] ➖
│   │       │   ├── [Quantity Display]
│   │       │   └── [Increase Button] ➕
│   │       ├── [Item Total]
│   │       └── [Remove Button] ✕
│   │
│   ├── [Cart Total]
│   │   ├── "المجموع: {total} نقطة"
│   │   └── [Afford Status] - ✓ أو ✕
│   │
│   ├── [Checkout Button] - "طلب الشراء"
│   │   └── onClick → setShowCheckout(true)
│   │   └── disabled إذا لا يكفي الرصيد
│   │
│   └── [Continue Shopping Button]
│
├── 📌 CHECKOUT MODAL
│   │
│   ├── [Header] - "تأكيد الطلب"
│   ├── [Order Summary]
│   ├── [Total Points]
│   ├── [Confirm Button] - "تأكيد الطلب"
│   │   └── onClick → checkoutMutation.mutate()
│   └── [Cancel Button]
│
└── 📌 PRODUCT DETAIL MODAL
    │ (عند الضغط على منتج)
    │
    ├── [Product Image Large]
    ├── [Product Name]
    ├── [Description]
    ├── [Rating]
    ├── [Price]
    ├── [Stock Status]
    ├── [Add to Cart Button]
    └── [Close Button]
```

---

## 📱 إعدادات الطفل (ChildSettings.tsx)

```
/child-settings  [355 سطر]
│
├── 📌 HEADER
│   ├── [Back Button] ←
│   │   └── 🔗 onClick → navigate("/child-games")
│   ├── [Settings Icon] ⚙️
│   └── [Title] - "الإعدادات"
│
├── 📌 LANGUAGE & APPEARANCE CARD 🌐
│   │
│   ├── [Title] - "اللغة والمظهر"
│   ├── [Description]
│   │
│   ├── [Language Row]
│   │   ├── [Globe Icon] 🌐
│   │   ├── [Label] - "اللغة"
│   │   └── [Select: Language]
│   │       ├── العربية
│   │       └── English
│   │
│   └── [Theme Row]
│       ├── [Theme Icon] ☀️/🌙
│       ├── [Label] - "المظهر"
│       └── [Select: Theme]
│           ├── فاتح
│           └── داكن
│
├── 📌 NOTIFICATIONS CARD 🔔
│   │
│   ├── [Title] - "الإشعارات"
│   ├── [Description]
│   │
│   ├── [Notifications Row]
│   │   ├── [Bell Icon]
│   │   ├── [Label] - "الإشعارات"
│   │   └── [Switch]
│   │
│   └── [Sounds Row]
│       ├── [Volume Icon]
│       ├── [Label] - "الأصوات"
│       └── [Switch]
│
├── 📌 PRIVACY CARD 🛡️
│   │
│   ├── [Title] - "الخصوصية"
│   ├── [Description]
│   │
│   ├── [Online Status Row]
│   │   ├── [Eye Icon]
│   │   ├── [Label] - "إظهار حالة الاتصال"
│   │   └── [Switch]
│   │
│   └── [Show Progress Row]
│       ├── [Check Icon]
│       ├── [Label] - "إظهار تقدمي للوالدين"
│       └── [Switch]
│
├── 📌 TRUSTED DEVICES CARD 📱
│   │
│   ├── [Title] - "الأجهزة الموثوقة"
│   ├── [Description]
│   │
│   └── [Devices List]
│       └── لكل جهاز:
│           ├── [Device Icon]
│           ├── [Device Name]
│           ├── [Last Used Date]
│           ├── [Current Device Badge] (إذا الجهاز الحالي)
│           └── [Remove Button] 🗑️ (إذا ليس الحالي)
│
└── 📌 FOOTER
    └── [Welcome Message] - "مرحباً {childName}"
```

---

## 🔔 إشعارات الطفل (ChildNotifications.tsx)

```
/child-notifications  [353 سطر]
│
├── 📌 HEADER
│   ├── [Notifications Icon] 🔔
│   ├── [Title] - "الإشعارات"
│   ├── [Unread Badge] - "{count} جديد"
│   ├── [Points Display] ⭐
│   └── [Back Button] - "رجوع"
│       └── 🔗 onClick → navigate("/child-games")
│
├── 📌 MANDATORY TASK MODAL
│   │ (يظهر إذا هناك مهمة إجبارية)
│   │
│   └── [MandatoryTaskModal Component]
│
├── 📌 LOADING STATE
│   └── [Spinner]
│
├── 📌 EMPTY STATE
│   └── "لا توجد إشعارات"
│
└── 📌 NOTIFICATIONS LIST
    └── لكل إشعار:
        │
        ├── [Notification Card]
        │   │
        │   ├── [Icon] (حسب النوع)
        │   │   ├── points_earned → ⭐
        │   │   ├── reward_unlocked → 🏆
        │   │   ├── product_assigned → 🎁
        │   │   ├── task_reminder → ⏰
        │   │   ├── achievement → 🏆
        │   │   ├── daily_challenge → 🎯
        │   │   ├── goal_progress → 🎯
        │   │   └── gift_assigned → 🎁
        │   │
        │   ├── [Title]
        │   ├── [Message]
        │   ├── [Time Ago]
        │   ├── [Unread Indicator] (إذا غير مقروء)
        │   │
        │   └── [Action Button] (حسب النوع)
        │       ├── gift_assigned → navigate("/child-gifts")
        │       ├── task_reminder → navigate("/child-tasks")
        │       └── daily_challenge → navigate("/child-games")
        │
        └── [Resolve Button] (للإشعارات التي تتطلب إجراء)
```

---

## 📝 مهام الطفل (ChildTasks.tsx)

```
/child-tasks  [304 سطر]
│
├── 📌 HEADER
│   ├── [Back Button] ←
│   │   └── 🔗 onClick → navigate("/child-games")
│   └── [Points Display] ⭐ {points}
│
├── 📌 PAGE TITLE
│   └── [Title] - "📖 مهامي"
│
├── 📌 EMPTY STATE
│   │ (إذا لا توجد مهام)
│   │
│   ├── [Trophy Icon] 🏆
│   ├── "لا توجد مهام حالياً"
│   └── "عندما يرسل لك والدك مهمة ستظهر هنا"
│
├── 📌 PENDING TASKS SECTION
│   │
│   ├── [Section Title] ⏰ "مهام معلقة ({count})"
│   │
│   └── [Tasks Grid]
│       └── لكل مهمة:
│           │
│           ├── [Task Card] (animated)
│           │   ├── [Subject Emoji]
│           │   ├── [Subject Name]
│           │   ├── [Question Text]
│           │   ├── [Points Reward Badge] ⭐ +{points}
│           │   └── onClick → setSelectedTask(task)
│
├── 📌 COMPLETED TASKS SECTION
│   │
│   ├── [Section Title] ✓ "مهام مكتملة ({count})"
│   │
│   └── [Tasks List]
│       └── لكل مهمة:
│           ├── [Checkmark] ✓
│           └── [Question Text]
│
├── 📌 TASK MODAL (عند اختيار مهمة)
│   │
│   ├── [Modal Overlay]
│   │   └── onClick → setSelectedTask(null)
│   │
│   ├── [Modal Content]
│   │   ├── [Subject + Title]
│   │   ├── [Question]
│   │   │
│   │   ├── [Answers Grid]
│   │   │   └── لكل إجابة:
│   │   │       ├── [Answer Button]
│   │   │       │   └── onClick → setSelectedAnswer(index)
│   │   │       └── [Selected State] (border color change)
│   │   │
│   │   └── [Submit Button] - "تأكيد الإجابة"
│   │       └── onClick → submitAnswerMutation.mutate()
│   │       └── disabled إذا لم يتم اختيار إجابة
│   │
│   └── [Close Button] ✕
│
└── 📌 RESULT MODAL (بعد الإجابة)
    │
    ├── [Correct State] ✓
    │   ├── [Success Animation]
    │   ├── "إجابة صحيحة!"
    │   └── "⭐ +{points}"
    │
    └── [Wrong State] ✕
        ├── [Failure Animation]
        └── "إجابة خاطئة"
```

---

## 🎁 هدايا الطفل (ChildGifts.tsx)

```
/child-gifts  [274 سطر]
│
├── 📌 HEADER
│   ├── [Title] - "🎁 هداياي"
│   ├── [Subtitle] - "اجمع النقاط واحصل على الهدايا"
│   │
│   ├── [Points Display] ⭐ {currentPoints}
│   │
│   ├── [Notifications Button] 🔔
│   │   └── 🔗 onClick → navigate("/child-notifications")
│   │
│   └── [Back Button]
│       └── 🔗 onClick → navigate("/child-games")
│
├── 📌 PROGRESS INFO CARD
│   ├── [Balance Title] - "🎯 رصيدك الحالي"
│   ├── [Description] - "العب واكسب المزيد"
│   │
│   └── [Action Buttons]
│       ├── [Play Button] 🎮 "العب"
│       │   └── 🔗 onClick → navigate("/child-games")
│       └── [Tasks Button] 📝 "المهام"
│           └── 🔗 onClick → navigate("/child-tasks")
│
├── 📌 LOADING STATE
│   └── [Spinner]
│
├── 📌 EMPTY STATE
│   ├── [Gift Icon] 🎁
│   ├── "لا توجد هدايا متاحة"
│   └── "انتظر هدايا من والديك"
│
└── 📌 GIFTS GRID
    └── لكل هدية:
        │
        ├── [Gift Card]
        │   │
        │   ├── [Gift Image]
        │   │   └── fallback: 🎁
        │   │
        │   ├── [Available Badge] ✓ (إذا يكفي الرصيد)
        │   │
        │   ├── [Gift Name]
        │   ├── [Description]
        │   │
        │   ├── [Progress Section]
        │   │   ├── [Points Price] ⭐ {pointsPrice}
        │   │   ├── [Needed Points] (إذا لا يكفي)
        │   │   └── [Progress Bar]
        │   │
        │   └── [Redeem Button]
        │       ├── enabled → "استبدال" 🎁
        │       └── disabled → "تحتاج المزيد من النقاط"
        │
        └── [Redeem Modal] (عند الضغط)
            ├── [Gift Image]
            ├── [Gift Name]
            ├── [Confirm Text]
            ├── [Confirm Button] - "تأكيد الاستبدال"
            │   └── onClick → redeemMutation.mutate()
            └── [Cancel Button]
```

---

## 👨‍💼 لوحة تحكم الأدمن (AdminDashboard.tsx)

```
/admin-dashboard  [150 سطر + 23 tab component]
│
├── 📌 SIDEBAR
│   │
│   ├── [Toggle Button] ☰/✕
│   │   └── onClick → setSidebarOpen(!sidebarOpen)
│   │
│   ├── [Logo] (إذا مفتوح) - "لوحة التحكم"
│   │
│   ├── [Navigation Tabs] (23 تبويب)
│   │   │
│   │   ├── 📊 [Dashboard] - "لوحة القيادة"
│   │   ├── 💹 [Profits] - "نظام الأرباح"
│   │   ├── 👨‍👩‍👧‍👦 [Parents] - "إدارة الأولياء"
│   │   ├── 📚 [Subjects] - "المواد الدراسية"
│   │   ├── 📁 [Categories] - "فئات المتجر"
│   │   ├── ⭐ [Symbols] - "مكتبة الرموز"
│   │   ├── 🛍️ [Products] - "المنتجات"
│   │   ├── 👥 [Users] - "الأطفال"
│   │   ├── 💰 [Wallets] - "المحافظ"
│   │   ├── 📦 [Orders] - "الطلبات"
│   │   ├── 💳 [Deposits] - "الإيداعات"
│   │   ├── 💳 [Payment Methods] - "طرق الدفع"
│   │   ├── 📈 [Analytics] - "تحليلات المحفظة"
│   │   ├── 📋 [Activity] - "سجل النشاط"
│   │   ├── 🔔 [Notifications] - "الإشعارات"
│   │   ├── 🤝 [Referrals] - "الإحالات"
│   │   ├── 📢 [Ads] - "الإعلانات"
│   │   ├── 📖 [Libraries] - "المكتبات"
│   │   ├── 🔐 [Social Login] - "تسجيل اجتماعي"
│   │   ├── 📱 [OTP Providers] - "مزودي OTP"
│   │   ├── 🔍 [SEO] - "إعدادات SEO"
│   │   ├── 📞 [Support] - "إعدادات الدعم"
│   │   └── ⚙️ [Settings] - "الإعدادات"
│   │
│   └── [Logout Button] 🚪
│       └── onClick → handleLogout()
│
├── 📌 HEADER
│   ├── [Language Selector]
│   └── [Theme Toggle] ☀️/🌙
│
└── 📌 MAIN CONTENT
    │
    └── يعرض المكون المناسب حسب activeTab:
        │
        ├── dashboard → <AdminDashboardTab />
        ├── profits → <ProfitSystemTab />
        ├── parents → <ParentsTab />
        ├── subjects → <SubjectsTab />
        ├── categories → <CategoriesTab />
        ├── symbols → <SymbolsTab />
        ├── products → <ProductsTab />
        ├── users → <UsersTab />
        ├── wallets → <WalletsTab />
        ├── orders → <OrdersTab />
        ├── deposits → <DepositsTab />
        ├── payment-methods → <PaymentMethodsTab />
        ├── analytics → <WalletAnalytics />
        ├── activity → <ActivityLogTab />
        ├── notifications → <NotificationsTab />
        ├── referrals → <ReferralsTab />
        ├── ads → <AdsTab />
        ├── libraries → <LibrariesTab />
        ├── social-login → <SocialLoginTab />
        ├── otp-providers → <OTPProvidersTab />
        ├── seo → <SeoSettingsTab />
        ├── support → <SupportSettingsTab />
        └── settings → <SettingsTab />
```

---

## 📍 خريطة المسارات الكاملة (App.tsx)

```
/ ─────────────────────────── Home
├── /parent-auth ────────────── ParentAuth (تسجيل/دخول الوالد)
├── /otp ────────────────────── OTP (التحقق من الكود)
├── /forgot-password ────────── ForgotPassword (نسيت كلمة المرور)
├── /reset-password ─────────── ResetPassword (إعادة تعيين)
│
├── /parent-dashboard ───────── ParentDashboard (لوحة الوالد)
├── /parent ─────────────────── ParentDashboard (اختصار)
├── /parent/tasks ───────────── ParentTasks (إدارة المهام)
├── /parent/store ───────────── ParentStore (المتجر)
├── /parent/orders ──────────── ParentOrders (الطلبات)
├── /parent/inventory ───────── ParentInventory (المخزون)
├── /parent/notifications ───── ParentNotifications
│
├── /wallet ─────────────────── Wallet (المحفظة)
├── /settings ───────────────── Settings (الإعدادات)
├── /subjects ───────────────── SubjectsPage (المواد)
│
├── /child-link ─────────────── ChildLink (ربط الطفل)
├── /child-games ────────────── ChildGames (الألعاب) *ملفوف بـ ChildAppWrapper
├── /child-tasks ────────────── ChildTasks (المهام) *
├── /child-gifts ────────────── ChildGifts (الهدايا) *
├── /child-store ────────────── ChildStore (المتجر) *
├── /child-settings ─────────── ChildSettings (الإعدادات) *
├── /child-notifications ────── ChildNotifications (الإشعارات) *
│
├── /admin ──────────────────── AdminLogin (دخول الأدمن)
├── /admin-dashboard ────────── AdminDashboard (لوحة الأدمن)
│
├── /privacy ────────────────── PrivacyPolicy
├── /terms ──────────────────── TermsOfService
├── /privacy-policy ─────────── PrivacyPolicy
└── /* ──────────────────────── NotFound (404)
```

---

## 📊 ملخص العناصر التفاعلية

| الصفحة | الأزرار | النوافذ | الحقول | التبويبات |
|--------|---------|---------|--------|-----------|
| Home | 6 | 0 | 0 | 0 |
| ParentAuth | 12 | 1 | 8 | 2 |
| ParentDashboard | 35+ | 3 | 15+ | 6 |
| ParentTasks | 25+ | 4 | 12+ | 3 |
| Wallet | 15 | 2 | 8 | 0 |
| Settings | 12 | 0 | 6 | 4 |
| ChildLink | 10 | 0 | 4 | 0 |
| ChildGames | 12 | 2 | 0 | 0 |
| ChildStore | 30+ | 3 | 2 | 0 |
| ChildSettings | 8 | 0 | 0 | 0 |
| ChildTasks | 8 | 2 | 0 | 0 |
| ChildGifts | 6 | 1 | 0 | 0 |
| AdminDashboard | 25 | varies | varies | 23 |

---

## 🔗 العلاقات بين الصفحات

```
                    ┌─────────────────────────────────────┐
                    │              🏠 HOME                 │
                    └─────────────────┬───────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
    │ Parent Auth  │          │  Child Link  │          │    Admin     │
    └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
           │                          │                          │
           ▼                          ▼                          ▼
    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
    │     OTP      │          │ Child Games  │──────────│    Admin     │
    └──────┬───────┘          └──────┬───────┘          │  Dashboard   │
           │                          │                  └──────────────┘
           ▼                          │
    ┌──────────────┐          ┌───────┼───────┐
    │   Parent     │          │       │       │
    │  Dashboard   │◄─────────┤  ┌────┴────┐  │
    └──────┬───────┘          │  │ Tasks   │  │
           │                  │  │ Store   │  │
    ┌──────┼──────┐           │  │ Gifts   │  │
    │      │      │           │  │Settings │  │
    ▼      ▼      ▼           │  │Notifs   │  │
  Tasks  Store  Wallet        │  └─────────┘  │
  Settings                    └───────────────┘
```

---

**تم التحليل بواسطة:** GitHub Copilot  
**تاريخ:** 25 يونيو 2025
