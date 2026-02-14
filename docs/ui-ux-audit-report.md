# تقرير تحليل UI/UX الشامل — Classify Platform
# Comprehensive UI/UX Audit Report

**التاريخ:** 2026-02-14
**النطاق:** جميع صفحات ومكونات الواجهة الأمامية
**اللغات المحللة:** عربي (ar) | إنجليزي (en) | برتغالي (pt)

---

## الملخص التنفيذي

| المجال | المشاكل الحرجة 🔴 | مشاكل عالية 🟠 | مشاكل متوسطة 🟡 | مشاكل منخفضة 🟢 |
|--------|:---------:|:-----:|:-------:|:-----:|
| الترجمة (i18n) | 4 | 3 | 2 | 1 |
| RTL/LTR | 3 | 3 | 3 | 1 |
| التجاوب (Responsive) | 2 | 3 | 2 | 1 |
| سهولة الوصول (a11y) | 3 | 4 | 3 | 1 |
| تجربة المستخدم (UX) | 4 | 4 | 5 | 4 |
| **المجموع** | **16** | **17** | **15** | **8** |

---

## القسم 1: الترجمة والتعريب (i18n)

### 🔴 حرجة

#### 1.1 — 360+ نص غير مترجم (Hardcoded) في 28 ملف
**~360 نص** مكتوب مباشرة في الكود بدون استخدام نظام الترجمة `t()`.

**الملفات الأسوأ:**

| الملف | عدد النصوص | اللغة |
|-------|:----------:|:-----:|
| [GamesTab.tsx](client/src/components/admin/GamesTab.tsx) | ~40 | عربي |
| [TasksTab.tsx](client/src/components/admin/TasksTab.tsx) | ~50 | `isRTL ? عربي : إنجليزي` |
| [ParentInventory.tsx](client/src/pages/ParentInventory.tsx) | ~25 | عربي |
| [ChildNotifications.tsx](client/src/pages/ChildNotifications.tsx) | ~18 | عربي |
| [OTPVerification.tsx](client/src/pages/OTPVerification.tsx) | ~10 | عربي |
| [LibraryLogin.tsx](client/src/pages/LibraryLogin.tsx) | ~15 | عربي |
| [Terms.tsx](client/src/pages/Terms.tsx) | صفحة كاملة | إنجليزي فقط |
| [Privacy.tsx](client/src/pages/Privacy.tsx) | صفحة كاملة | إنجليزي فقط |
| [AdminPurchasesTab.tsx](client/src/pages/AdminPurchasesTab.tsx) | ~5 | إنجليزي فقط |
| [ParentStoreMulti.tsx](client/src/pages/ParentStoreMulti.tsx) | ~8 | إنجليزي فقط |

**المشكلة:** المستخدم البرتغالي أو الإنجليزي يرى نصوص عربية. المستخدم العربي يرى نصوص إنجليزية في تيرمز وبرايفسي.

#### 1.2 — نمط `isRTL ? "عربي" : "English"` يتجاهل البرتغالية بالكامل
**~80+ موضع** يستخدم `isRTL ? "نص عربي" : "English text"` بدلاً من `t()`.

هذا يعني أن المستخدم البرتغالي يرى دائماً الإنجليزية — لا يوجد أي دعم للبرتغالية في هذه الأماكن.

**أسوأ الملفات:**
- [TasksTab.tsx](client/src/components/admin/TasksTab.tsx) — ~50 ترنري
- [ChildGamesControl.tsx](client/src/components/parent/ChildGamesControl.tsx) — ~10 ترنري
- [AssignTask.tsx](client/src/pages/AssignTask.tsx) — مخلوط

#### 1.3 — 9 مفاتيح ترجمة موجودة بالعربية فقط
مفاتيح `parentTasks.sendDirectlyToChild` و8 مفاتيح أخرى في namespace الـ `parentTasks` موجودة في `ar.json` لكن **مفقودة** من `en.json` و `pt.json`.

| المفتاح | القيمة العربية |
|---------|---------------|
| `parentTasks.sendDirectlyToChild` | إرسال مباشر للطفل |
| `parentTasks.selectChildOrLeaveEmpty` | اختر طفلاً لإرسال المهمة مباشرة... |
| `parentTasks.selectChildPlaceholder` | اختر طفلاً... |
| `parentTasks.noChildTemplateOnly` | بدون طفل (حفظ كقالب فقط) |
| `parentTasks.saveAsTemplate` | حفظ كقالب للاستخدام لاحقاً |
| `parentTasks.saveAsTemplateDesc` | سيتم حفظ المهمة في قسم 'مهامي'... |
| `parentTasks.createAndSend` | إنشاء وإرسال |
| `parentTasks.taskCreatedAndSent` | تم إنشاء وإرسال المهمة للطفل |
| `parentTasks.templateSaved` | تم حفظ المهمة كقالب أيضاً |

#### 1.4 — خطأ في صيغة الـ Interpolation (يسبب باغ في وقت التشغيل)
3 مفاتيح تستخدم `{var}` في العربية لكن `{{var}}` في الإنجليزية/البرتغالية:

| المفتاح | العربي | الإنجليزي/البرتغالي |
|---------|--------|-------|
| `parentTasks.pointsWillDeduct` | `{points}` | `{{points}}` |
| `parentTasks.childPoints` | `{name}`, `{points}` | `{{name}}`, `{{points}}` |
| `parentTasks.pointsDeductWarning` | `{points}` | `{{points}}` |

**النتيجة:** النصوص العربية تعرض المتغير بشكل صحيح، لكن الإنجليزية والبرتغالية قد تعرض `{{points}}` كنص حرفي.

### 🟠 عالية

#### 1.5 — `PageLoader` غير مترجم
[App.tsx](client/src/App.tsx) سطر 65 — نص `"جاري التحميل..."` مكتوب مباشرة بالعربية. هذا هو أول شيء يراه المستخدم عند تحميل أي صفحة. المستخدم الإنجليزي/البرتغالي يرى عربي.

#### 1.6 — صفحات كاملة بدون نظام ترجمة
| الصفحة | اللغة المكتوبة | الحالة |
|--------|:----------:|:-----:|
| [Terms.tsx](client/src/pages/Terms.tsx) | إنجليزي فقط | لا يوجد `useTranslation` |
| [Privacy.tsx](client/src/pages/Privacy.tsx) | إنجليزي فقط | لا يوجد `useTranslation` |
| [ParentInventory.tsx](client/src/pages/ParentInventory.tsx) | عربي فقط | لا يوجد `useTranslation` |
| [OTPVerification.tsx](client/src/pages/OTPVerification.tsx) | عربي فقط | لا يوجد `useTranslation` |
| [LibraryLogin.tsx](client/src/pages/LibraryLogin.tsx) | عربي فقط | لا يوجد `useTranslation` |
| [ParentStoreMulti.tsx](client/src/pages/ParentStoreMulti.tsx) | إنجليزي فقط | لا يوجد `useTranslation` |
| [AdminPurchasesTab.tsx](client/src/pages/AdminPurchasesTab.tsx) | إنجليزي فقط | لا يوجد `useTranslation` |

#### 1.7 — 15+ مكون أدمن بدون ترجمة أبداً
كل مكونات لوحة الأدمن (GamesTab, DashboardTab, ActivityLogTab, WalletsTab, WalletAnalytics, UsersTab, OrdersTab, ChildGameManager) مكتوبة hardcoded — بعضها عربي وبعضها إنجليزي.

### 🟡 متوسطة

#### 1.8 — `index.html` يحتوي على `lang="en"` ثابت
الملف [index.html](client/index.html) يضع `lang="en"` على `<html>` بينما اللغة الافتراضية هي العربية. يتم تصحيحها بعد تحميل JavaScript لكن هناك لحظة FOUC.

#### 1.9 — مفاتيح غير مترجمة (نفس القيمة في كل اللغات)
| المفتاح | كل اللغات |
|---------|----------|
| `childProfile.hobbies` | "Hobbies" (يجب أن تكون "هوايات" بالعربية و"Passatempos" بالبرتغالية) |
| `admin.seoSocial` | "Social" (نفس القيمة في كل اللغات) |

---

## القسم 2: دعم RTL/LTR

### 🔴 حرجة

#### 2.1 — 35 عنصر يحتوي على `dir="rtl"` ثابت في 20 ملف
هذه العناصر تفرض الاتجاه العربي **حتى عند استخدام الإنجليزية أو البرتغالية**.

**أسوأ الملفات:**
| الملف | عدد `dir="rtl"` الثابت |
|-------|:---:|
| [ParentStore.tsx](client/src/pages/ParentStore.tsx) | 4 |
| [ChildStore.tsx](client/src/pages/ChildStore.tsx) | 4 |
| [ParentInventory.tsx](client/src/pages/ParentInventory.tsx) | 3 |
| [ParentDashboard.tsx](client/src/pages/ParentDashboard.tsx) | 2 |
| [ParentTasks.tsx](client/src/pages/ParentTasks.tsx) | 2 |
| [LibraryDashboard.tsx](client/src/pages/LibraryDashboard.tsx) | 2 |
| [OTPVerification.tsx](client/src/pages/OTPVerification.tsx) | 2 |

#### 2.2 — 158+ استخدام `ml-`/`mr-` بدلاً من `ms-`/`me-` (خصائص منطقية)
الخصائص الفيزيائية (`margin-left`, `margin-right`) لا تنعكس تلقائياً مع RTL. يجب استخدام `ms-` (margin-start) و `me-` (margin-end).

| الملف | عدد الاستخدامات |
|-------|:---:|
| [ParentTasks.tsx](client/src/pages/ParentTasks.tsx) | 19 |
| [SubjectsTab.tsx](client/src/components/admin/SubjectsTab.tsx) | 8 |
| [SubjectTasks.tsx](client/src/pages/SubjectTasks.tsx) | 7 |
| [ChildStore.tsx](client/src/pages/ChildStore.tsx) | 6 |
| [ParentDashboard.tsx](client/src/pages/ParentDashboard.tsx) | 5 |

#### 2.3 — 484 استخدام `rounded-l`/`rounded-r` بدلاً من `rounded-s`/`rounded-e`
معظمها في مكونات UI الأساسية (shadcn). Border radius يظهر على الجانب الخاطئ.

### 🟠 عالية

#### 2.4 — 86 استخدام `left-`/`right-` في التمركز المطلق
العناصر المتمركزة (absolute/fixed) تظهر في المكان الخاطئ عند تبديل الاتجاه.

#### 2.5 — 30+ استخدام `text-left`/`text-right` ثابت
محاذاة النصوص لا تنعكس. يجب أن تكون `text-start`/`text-end`.

مكونات UI الأساسية المتأثرة:
- [dialog.tsx](client/src/components/ui/dialog.tsx) — `text-left`
- [sheet.tsx](client/src/components/ui/sheet.tsx) — `text-left`
- [table.tsx](client/src/components/ui/table.tsx) — `text-left`

#### 2.6 — لا يوجد إضافة Tailwind RTL
لا يوجد `tailwindcss-rtl` plugin ولا `rtl:`/`ltr:` variants مُعدة في [tailwind.config.ts](tailwind.config.ts).

### 🟡 متوسطة

#### 2.7 — 10 استخدامات `space-x-` بدون عكس لـ RTL
#### 2.8 — 11 استخدام `border-l`/`border-r` بدلاً من `border-s`/`border-e`
#### 2.9 — `index.html` بدون خاصية `dir` — فلاش اتجاه خاطئ

---

## القسم 3: التصميم المتجاوب (Responsive Design)

### 🔴 حرجة

#### 3.1 — صفحات أساسية بدون أي breakpoints تجاوبية

| الصفحة | الأهمية |
|--------|:------:|
| [ParentAuth.tsx](client/src/pages/ParentAuth.tsx) | **عالية جداً** — صفحة تسجيل الدخول الرئيسية |
| [ChildTasks.tsx](client/src/pages/ChildTasks.tsx) | **عالية** — ميزة أساسية للأطفال |
| [ChildRewards.tsx](client/src/pages/ChildRewards.tsx) | **عالية** — مكافآت الأطفال |
| [Wallet.tsx](client/src/pages/Wallet.tsx) | **عالية** — ميزة مالية |
| [ChildProfile.tsx](client/src/pages/ChildProfile.tsx) | متوسطة |
| [ChildSettings.tsx](client/src/pages/ChildSettings.tsx) | متوسطة |
| [ForgotPassword.tsx](client/src/pages/ForgotPassword.tsx) | متوسطة |

#### 3.2 — خطأ `text-[10px]` أقل من الحد الأدنى للقراءة
6 مواضع في صفحات المستخدم تستخدم خط 10px (أقل من 12px المُوصى به):

| الملف | السياق |
|-------|--------|
| [ChildStore.tsx](client/src/pages/ChildStore.tsx) | شارة العداد |
| [ParentStore.tsx](client/src/pages/ParentStore.tsx) | شارة السلة + عداد الطلبات |
| [RandomAdPopup.tsx](client/src/components/RandomAdPopup.tsx) | نص الإعلان |

### 🟠 عالية

#### 3.3 — أهداف اللمس أقل من 44x44px
| الملف | العنصر | الحجم الفعلي |
|-------|--------|:---:|
| [ParentStore.tsx](client/src/pages/ParentStore.tsx) | أزرار +/- الكمية | ~28px |
| [ParentStore.tsx](client/src/pages/ParentStore.tsx) | أزرار Grid/List | ~28px |
| [ChildStore.tsx](client/src/pages/ChildStore.tsx) | أزرار Grid/List | 32x32px |

#### 3.4 — `useIsMobile` hook مستخدم في ملف واحد فقط
الـ hook معرّف لكنه مستخدم فقط في [sidebar.tsx](client/src/components/ui/sidebar.tsx). الصفحات المعقدة (ParentDashboard, ParentStore, Wallet) لا تستخدمه.

#### 3.5 — `overflow-hidden` بدون scroll في Modals
| الملف | المشكلة |
|-------|---------|
| [ChildGameManager.tsx](client/src/components/admin/ChildGameManager.tsx) | `max-h-[85vh] overflow-hidden` — المحتوى يُقطع |
| [ChildGames.tsx](client/src/pages/ChildGames.tsx) | `max-h-[90vh] overflow-hidden` — اللعبة تُقطع |

### 🟡 متوسطة

#### 3.6 — `vh` بدلاً من `dvh` في 18 modal
يسبب مشاكل على iOS بسبب شريط العنوان المتحرك.

#### 3.7 — `viewport-fit=cover` مفقود في `index.html`
أجهزة iPhone مع notch لا تعرض المحتوى بشكل صحيح في safe area.

---

## القسم 4: سهولة الوصول (Accessibility)

### 🔴 حرجة (WCAG Level A)

#### 4.1 — لا يوجد رابط "تخطي إلى المحتوى" (Skip Navigation)
**انتهاك WCAG 2.1 معيار 2.4.1.** لا يوجد `skip-to-content` link في أي ملف.

#### 4.2 — 7 عناصر تفاعلية بـ `onClick` بدون دعم لوحة المفاتيح
عناصر `<div onClick>` بدون `role`, `tabIndex`, أو `onKeyDown`:

| الملف | العنصر |
|-------|--------|
| [ChildGamesControl.tsx](client/src/components/parent/ChildGamesControl.tsx) | تبديل اللعبة |
| [SlidingAdsCarousel.tsx](client/src/components/SlidingAdsCarousel.tsx) | بطاقة الإعلان |
| [RandomAdPopup.tsx](client/src/components/RandomAdPopup.tsx) | محتوى الإعلان |
| [ChildGames.tsx](client/src/pages/ChildGames.tsx) | أفاتار الملف الشخصي |
| [ParentDashboard.tsx](client/src/pages/ParentDashboard.tsx) | خلفية Modal |
| [PhoneInput.tsx](client/src/components/PhoneInput.tsx) | اختيار رمز الدولة |

#### 4.3 — ~50+ حقل إدخال بدون ربط برمجي مع Label
معظم النماذج تضع `<label>` بجوار `<input>` لكن بدون `htmlFor`/`id` pairing:

| الملف | عدد الحقول |
|-------|:---:|
| [GamesTab.tsx](client/src/components/admin/GamesTab.tsx) | 9 |
| [ParentAuth.tsx](client/src/pages/ParentAuth.tsx) | 4 |
| [Settings.tsx](client/src/pages/Settings.tsx) | 9 |
| [ForgotPassword.tsx](client/src/pages/ForgotPassword.tsx) | 3 |
| [ChildLink.tsx](client/src/pages/ChildLink.tsx) | 4 (بدون labels أصلاً) |
| [Wallet.tsx](client/src/pages/Wallet.tsx) | 3 |

### 🟠 عالية (WCAG Level AA)

#### 4.4 — 40+ حقل بـ `focus:outline-none` بدون بديل مرئي
حقول الإدخال تزيل outline التركيز بدون إضافة `focus-visible:ring`:

| الملف | العدد |
|-------|:---:|
| [SettingsPro.tsx](client/src/pages/SettingsPro.tsx) | 12 |
| [GamesTab.tsx](client/src/components/admin/GamesTab.tsx) | 10 |
| [Settings.tsx](client/src/pages/Settings.tsx) | 9 |
| [ParentAuth.tsx](client/src/pages/ParentAuth.tsx) | 4 |

#### 4.5 — 4 Modals مخصصة بدون ARIA roles
| الملف | المشكلة |
|-------|---------|
| [RandomAdPopup.tsx](client/src/components/RandomAdPopup.tsx) | لا `role="dialog"` ولا `aria-modal` |
| [ChildGameManager.tsx](client/src/components/admin/ChildGameManager.tsx) | لا `role="dialog"` |
| [ChildGamesControl.tsx](client/src/components/parent/ChildGamesControl.tsx) | لا `role="dialog"` |
| [ParentDashboard.tsx](client/src/pages/ParentDashboard.tsx) | QR overlay بدون ARIA |

#### 4.6 — ~15 زر أيقونة بدون `aria-label`
أزرار تحتوي فقط على أيقونات بدون نص بديل:

- أزرار إغلاق (X)
- أزرار السهم في الكاروسيل
- أزرار +/- الكمية في المتجر
- أزرار تبديل العرض Grid/List

#### 4.7 — 7 صور بـ `alt=""` على صور ذات معنى
صور المنتجات والألعاب تحتوي على `alt=""` بدلاً من وصف المحتوى.

### 🟡 متوسطة

#### 4.8 — 3 صفحات بتسلسل عناوين مكسور
- [ParentDashboard.tsx](client/src/pages/ParentDashboard.tsx): h1 → h3 (يتخطى h2)
- [ParentStore.tsx](client/src/pages/ParentStore.tsx): h2 → h4 + لا يوجد h1
- [ChildGames.tsx](client/src/pages/ChildGames.tsx), [Wallet.tsx](client/src/pages/Wallet.tsx): لا يوجد h1

#### 4.9 — 3 صفحات بعلامات تبويب مخصصة بدون ARIA Tab roles
[SubjectTasks.tsx](client/src/pages/SubjectTasks.tsx), [SettingsPro.tsx](client/src/pages/SettingsPro.tsx), [Settings.tsx](client/src/pages/Settings.tsx) — أزرار تبويب بدون `role="tablist"`, `role="tab"`, `aria-selected`.

#### 4.10 — مشاكل تباين الألوان
- `text-gray-400` (#9CA3AF) على خلفية بيضاء = نسبة 3.5:1 (يفشل في WCAG AA 4.5:1)
- `text-gray-300` على `bg-gray-800` = ~3.7:1 (حدّي)
- `text-white/80` على صور متغيرة — غير مضمون

---

## القسم 5: تجربة المستخدم (UX)

### 🔴 حرجة

#### 5.1 — حذف الحساب بدون تأكيد
[Settings.tsx](client/src/pages/Settings.tsx) — زر "حذف الحساب" يُنفذ الحذف **مباشرة** بدون أي حوار تأكيد. هذا إجراء لا رجعة فيه.

#### 5.2 — تسجيل خروج الوالد بدون تأكيد
[ParentDashboard.tsx](client/src/pages/ParentDashboard.tsx) — `handleLogout` يمسح التوكن ويوجه المستخدم فوراً. بينما تسجيل خروج الطفل يعرض حوار تأكيد.

#### 5.3 — 9 صفحات تستخدم `alert()` بدلاً من Toast
`alert()` يكسر تجربة المستخدم ويوقف الـ thread:

| الملف | السياق |
|-------|--------|
| [Wallet.tsx](client/src/pages/Wallet.tsx) | نجاح/فشل الإيداع |
| [ChildGifts.tsx](client/src/pages/ChildGifts.tsx) | خطأ الاستبدال |
| [Subjects.tsx](client/src/pages/Subjects.tsx) | نجاح الإرسال |
| [SubjectTasks.tsx](client/src/pages/SubjectTasks.tsx) | نجاح الإرسال |
| [ParentStoreMulti.tsx](client/src/pages/ParentStoreMulti.tsx) | نجاح الشراء |
| [AdminAuth.tsx](client/src/pages/AdminAuth.tsx) | خطأ |
| [ChildRewards.tsx](client/src/pages/ChildRewards.tsx) | placeholder |
| [SettingsPro.tsx](client/src/pages/SettingsPro.tsx) | نجاح الحفظ |

#### 5.4 — حذف المنتج بـ `confirm()` الأصلي
[LibraryDashboard.tsx](client/src/pages/LibraryDashboard.tsx) — يستخدم `confirm()` الأصلي بدلاً من حوار تأكيد مخصص.

### 🟠 عالية

#### 5.5 — 26+ route بدون ErrorBoundary
فقط 5 routes ملفوفة بـ `<ErrorBoundary>`:
- `/parent-auth`, `/parent-dashboard`, `/otp`, `/forgot-password`, `/parent-tasks`

الباقي (Parent Store, Wallet, Settings, جميع صفحات الأطفال الـ 9...) يعرض **شاشة بيضاء** عند أي خطأ.

#### 5.6 — لا يوجد استعادة موضع التمرير (Scroll Restoration)
صفر نتائج لـ `scrollTo`, `scrollRestoration`. التنقل بين الصفحات لا يستعيد الموضع.

#### 5.7 — 6+ mutations تبتلع الأخطاء بصمت
| الملف | الـ Mutation |
|-------|------------|
| [ChildTasks.tsx](client/src/pages/ChildTasks.tsx) | إرسال الإجابة |
| [ChildNotifications.tsx](client/src/pages/ChildNotifications.tsx) | تعليم كمقروء |
| [ChildGames.tsx](client/src/pages/ChildGames.tsx) | إكمال اللعبة |
| [ParentInventory.tsx](client/src/pages/ParentInventory.tsx) | تعيين للطفل |

#### 5.8 — لا يوجد Deep Linking لحالة التطبيق
علامات التبويب النشطة في ParentDashboard, Settings, Admin لا تنعكس في URL. تحديث الصفحة يفقد الموضع.

### 🟡 متوسطة

#### 5.9 — حالات تحميل غير متسقة
| النمط | الصفحات |
|-------|---------|
| Spinner + نص | ChildProfile, ChildSettings, ParentDashboard |
| نص فقط | AdminPurchasesTab, ParentStoreMulti, ChildRewards |
| سبينر مخصص | ParentInventory |
| **لا شيء** | Notifications, ChildNotifications, Wallet |
| **Skeleton screens** | **لا يوجد في أي مكان** |

#### 5.10 — لا يوجد Validation في الوقت الفعلي للنماذج
لا يوجد استخدام لـ `react-hook-form` أو `zod` أو رسائل خطأ inline لكل حقل. النماذج تعتمد على `required` HTML و أخطاء مستوى الـ mutation.

#### 5.11 — أزرار رجوع غير متسقة
- صفحات الأطفال: أسهم RTL-aware (جيد)
- صفحات الوالدين: مختلط — بعضها نص `"← رجوع"`، بعضها أيقونات ثابتة
- لا يوجد شريط تنقل سفلي للأطفال

#### 5.12 — حالات فارغة غير متسقة التصميم
معظم الصفحات لديها حالة فارغة، لكن التصميم مختلف بين الصفحات. [ChildTasks.tsx](client/src/pages/ChildTasks.tsx) و [ChildGames.tsx](client/src/pages/ChildGames.tsx) ليس لديهما رسالة فارغة واضحة.

#### 5.13 — آلية إعادة المحاولة شبه معدومة
فقط مكانان يقدمان زر "حاول مرة أخرى" للمستخدم. باقي الصفحات تحتاج تحديث يدوي.

---

## القسم 6: ملخص الإصلاحات المُوصى بها (مرتبة حسب الأولوية)

### المرحلة 1 — إصلاحات حرجة (يجب قبل أي إطلاق)

| # | الإصلاح | التأثير |
|---|---------|---------|
| 1 | إضافة حوار تأكيد لحذف الحساب | أمان المستخدم |
| 2 | إضافة حوار تأكيد لتسجيل خروج الوالد | اتساق UX |
| 3 | استبدال كل `alert()` و `confirm()` بـ Toast/Dialog | UX محترف |
| 4 | إصلاح الـ 9 مفاتيح المفقودة في en.json/pt.json | i18n |
| 5 | إصلاح صيغة interpolation `{var}` → `{{var}}` | باغ في وقت التشغيل |
| 6 | إزالة كل `dir="rtl"` الثابت — استخدام الاتجاه التلقائي | RTL/LTR |
| 7 | إضافة ErrorBoundary لجميع الـ routes | استقرار |

### المرحلة 2 — إصلاحات عالية

| # | الإصلاح | التأثير |
|---|---------|---------|
| 8 | ترجمة الـ PageLoader | i18n |
| 9 | تحويل الصفحات الكاملة غير المترجمة لاستخدام `t()` | i18n |
| 10 | استبدال `isRTL ? "ar" : "en"` بـ `t()` في كل الأماكن | البرتغالية |
| 11 | تثبيت `tailwindcss-rtl` plugin | بنية تحتية |
| 12 | تحويل `ml-`/`mr-` → `ms-`/`me-` (158+ موضع) | RTL |
| 13 | تحويل `text-left`/`text-right` → `text-start`/`text-end` | RTL |
| 14 | إضافة breakpoints تجاوبية للصفحات الرئيسية | موبايل |
| 15 | إصلاح أهداف اللمس < 44px | سهولة الاستخدام |
| 16 | ربط Labels برمجياً مع Inputs (`htmlFor`/`id`) | a11y |
| 17 | إضافة `aria-label` لأزرار الأيقونات | a11y |

### المرحلة 3 — تحسينات متوسطة

| # | الإصلاح | التأثير |
|---|---------|---------|
| 18 | إضافة Skip Navigation link | WCAG |
| 19 | إصلاح تسلسل العناوين | SEO + a11y |
| 20 | إضافة ARIA roles للـ Modals المخصصة | a11y |
| 21 | إضافة `focus-visible:ring` بدلاً من `outline-none` | a11y |
| 22 | إضافة Skeleton loading screens | UX |
| 23 | إضافة scroll restoration | UX |
| 24 | إضافة deep linking لعلامات التبويب | UX |
| 25 | توحيد تصميم حالات التحميل والأخطاء والفراغ | UX |
| 26 | إضافة `role="button"` و `onKeyDown` للعناصر التفاعلية | a11y |
| 27 | تحويل `vh` → `dvh` في الـ modals | iOS |
| 28 | إضافة `viewport-fit=cover` في index.html | iPhone notch |

### المرحلة 4 — تحسينات منخفضة

| # | الإصلاح | التأثير |
|---|---------|---------|
| 29 | تحويل `rounded-l`/`rounded-r` → `rounded-s`/`rounded-e` | RTL perfection |
| 30 | تحويل `border-l`/`border-r` → `border-s`/`border-e` | RTL |
| 31 | إضافة real-time form validation | UX polish |
| 32 | توحيد نمط زر الرجوع | Visual consistency |
| 33 | إضافة شريط تنقل سفلي لواجهة الأطفال | Child UX |

---

## إحصائيات التحليل

| المقياس | القيمة |
|---------|:------:|
| إجمالي الملفات المحللة | **65+** |
| إجمالي مفاتيح الترجمة (ar.json) | **1,012** |
| إجمالي مفاتيح الترجمة (en.json) | **1,003** |
| إجمالي مفاتيح الترجمة (pt.json) | **1,003** |
| إجمالي النصوص غير المترجمة | **360+** |
| إجمالي مشاكل RTL | **800+** |
| إجمالي مشاكل سهولة الوصول | **120+** |
| إجمالي مشاكل UX | **56** |

---

**تم إعداد هذا التقرير بتحليل كل ملف في `client/src/` على حدة.**
**يُنصح بالبدء بالمرحلة 1 فوراً.**
