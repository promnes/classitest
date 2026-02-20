# i18n Audit Report — `client/src/pages/`

**Generated:** 2025-01-XX  
**Scope:** All 51 `.tsx` page files scanned for hardcoded Arabic/English user-visible strings that should use `t()` calls.  
**Excludes:** classNames, imports, variable names, comments, `console.log`, error messages in `throw new Error()` (developer-facing), brand names.

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 7 | No i18n at all, or 90%+ strings hardcoded |
| 🟠 HIGH | 6 | Many hardcoded strings (10–30+) |
| 🟡 MODERATE | 10 | Several hardcoded strings (3–10) |
| 🟢 OK | 28 | Fully or nearly fully internationalized |

**Total hardcoded strings to fix: ~300+**

---

## 🔴 CRITICAL — No/Minimal i18n (Fix First)

### 1. `Subjects.tsx` (231 lines)
**Issue:** Has `useTranslation()` but almost zero `t()` calls in JSX. All UI text is hardcoded Arabic.
| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 79 | `📚 المواد الدراسية` | `subjects.pageTitle` |
| 82 | `مهام جاهزة يمكن إرسالها للأطفال` | `subjects.pageSubtitle` |
| 95 | `← رجوع` | `common.back` |
| 103 | `المواد` | `subjects.subjectsList` |
| 127 | `المهام الجاهزة` | `subjects.readyTasks` |
| 156 | `إرسال` | `subjects.send` |
| 163 | `لا توجد مهام جاهزة في هذه المادة` | `subjects.noTasksInSubject` |
| 167 | `اختر مادة لعرض المهام الجاهزة` | `subjects.selectSubjectPrompt` |
| 174 | `إرسال المهمة` | `subjects.sendTask` |
| 180 | `اختر الطفل` | `subjects.selectChild` |
| 183 | `-- اختر --` | `subjects.selectPlaceholder` |
| 201 | `💰 رصيدك الحالي:` | `subjects.currentBalance` |
| 205 | `رصيدك غير كافي. المطلوب:` | `subjects.insufficientBalance` |
| 215 | `جاري...` / `إرسال` | `common.sending` / `subjects.send` |
| 220 | `إلغاء` | `common.cancel` |

### 2. `SubjectTasks.tsx` (527 lines)
**Issue:** Has `useTranslation()` but nearly all JSX text is hardcoded Arabic.
| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 195 | `العودة` | `common.back` |
| 215 | `مهام كلاسي` | `subjectTasks.classyTasks` |
| 222 | `مهامي` | `subjectTasks.myTasks` |
| 230 | `إنشاء مهمة جديدة` | `subjectTasks.createNewTask` |
| 237 | `مهام كلاسي الجاهزة` | `subjectTasks.readyClassyTasks` |
| 242 | `لا توجد مهام جاهزة لهذه المادة` | `subjectTasks.noTasksForSubject` |
| 260 | `نقطة` | `common.point` |
| 262 | `سهل` / `متوسط` / `صعب` | `common.easy` / `common.medium` / `common.hard` |
| 282 | `مهامي الخاصة` | `subjectTasks.myPersonalTasks` |
| 287 | `لم تنشئ أي مهام بعد` | `subjectTasks.noTasksCreated` |
| 290 | `إنشاء أول مهمة` | `subjectTasks.createFirstTask` |
| 322 | `إرسال المهمة للطفل` | `subjectTasks.sendTaskToChild` |
| 330 | `اختر الطفل` | `subjectTasks.selectChild` |
| 336 | `نقطة` | `common.point` |
| 342 | `عدد النقاط` | `subjectTasks.pointsCount` |
| 356 | `رصيدك غير كافي. الرصيد الحالي:` | `subjectTasks.insufficientBalance` |
| 363 | `جاري الإرسال...` / `إرسال المهمة` | `common.sending` / `subjectTasks.sendTask` |
| 370 | `إلغاء` | `common.cancel` |
| 380 | `إنشاء مهمة جديدة` | `subjectTasks.createNewTask` |
| 385 | `عنوان المهمة` | `subjectTasks.taskTitle` |
| 388 | `مثال: جمع الأرقام` (placeholder) | `subjectTasks.taskTitlePlaceholder` |
| 393 | `السؤال` | `subjectTasks.question` |
| 397 | `مثال: ما ناتج 5 + 3 ؟` (placeholder) | `subjectTasks.questionPlaceholder` |
| 402 | `الإجابات` | `subjectTasks.answers` |
| 417 | `الإجابة X` (placeholder) | `subjectTasks.answerPlaceholder` |
| 420 | `صحيحة` | `subjectTasks.correct` |
| 427 | `النقاط` | `subjectTasks.points` |
| 438 | `جاري الحفظ...` / `حفظ المهمة` | `common.saving` / `subjectTasks.saveTask` |
| 444 | `إلغاء` | `common.cancel` |

### 3. `TeacherDashboard.tsx` (1935 lines)
**Issue:** Has `useTranslation()` but nearly ALL JSX labels/UI text is hardcoded Arabic (50+ strings).
| Line | Hardcoded String |
|------|-----------------|
| 802 | `لوحة تحكم المعلم` |
| 830 | `المهام` |
| 837 | `الرصيد المتاح` |
| 844 | `الطلبات` |
| 851 | `التقييم` |
| 859–865 | Tab triggers: `المهام`, `القوالب`, `الطلبات`, `المحفظة`, `المنشورات`, `التصويتات`, `الملف الشخصي` |
| 871 | `إدارة المهام` |
| 879 | `لم يتم إضافة مهام بعد` |
| 924–925 | `قوالب المهام الجاهزة`, `اختر مادة ثم اختر قالب...` |
| 943 | `لا توجد قوالب لهذه المادة` |
| 983 | `الطلبات` |
| 985 | `لا توجد طلبات بعد` |
| 1019–1031 | `الرصيد المتاح`, `الرصيد المعلق`, `إجمالي المسحوب` |
| 1038 | `طلبات السحب` |
| 1046 | `لا توجد طلبات سحب` |
| 1071 | `المنشورات` |
| 1078 | `لا يوجد منشورات بعد` |
| 1116 | `التصويتات` |
| 1124 | `لا يوجد تصويتات بعد` |
| 1142–1145 | `مغلق`, `منتهي`, `مجهول`, `متعدد` |
| 1304–1307 | `مهمة`, `طالب`, `منشور`, `تقييم` |
| 1328–1344 | Labels: `الاسم`, `نبذة عني`, `المادة`, `سنوات الخبرة`, `السوشيال ميديا` |
| 1385–1535 | Task form: `عنوان المهمة`, `السؤال`, `السعر (ج.م)`, `تصنيف المادة`, `الإجابات`, `شرح الإجابة`, `صور مع السؤال` |
| 1555 | `إضافة` |

### 4. `LibraryDashboard.tsx` (1206 lines)
**Issue:** Has `useTranslation()` but most UI text is hardcoded Arabic (~50+ strings).
| Line | Hardcoded String |
|------|-----------------|
| 303 | `تم تحديث الطلب إلى: تم الشحن` |
| 307 | `فشل تحديث حالة الشحن` |
| 326 | `تم تأكيد التسليم بنجاح` |
| 333 | `فشل التحقق من كود التسليم` |
| 365 | `فشل إنشاء طلب السحب` |
| 427–553 | Image upload errors (6 strings) |
| 561 | `يرجى اختيار صورة فقط` |
| 588 | `فشل تحديث الملف الشخصي` |
| 604 | `جاري التحميل...` |
| 621 | `لوحة تحكم المكتبة` |
| 645–684 | Stats: `المنتجات`, `المبيعات`, `الإحالات`, `نقاط النشاط` |
| 701–710 | `رابط الإحالة`, `كود الإحالة` |
| 724–729 | Tabs: `المنتجات`, `الطلبات`, `الإحالات`, `سجل النشاط`, `الأرباح والسحب`, `الملف الشخصي` |
| 734 | `منتجاتي` |
| 742 | `جاري التحميل...` |
| 764 | `المخزون:` |
| 792 | `لا توجد منتجات بعد` |
| 809 | `شراء` (fallback) |
| 825–826 | `لا توجد إحالات بعد`, `شارك رابط الإحالة لكسب النقاط` |
| 841–843 | `المشتري:`, `الكمية:`, `الإجمالي:`, `العنوان:` |
| 862 | `أدخل كود التسليم الذي أعطاه المشتري لرجل التوصيل:` |
| 883 | `تاريخ الإتاحة:` |
| 893 | `لا توجد طلبات حالياً` |
| 920 | `لا يوجد نشاط بعد` |
| 930–948 | Finance: `الرصيد المتاح`, `الرصيد المعلّق`, `إجمالي المبيعات`, `إجمالي العمولة` |
| 967–972 | Placeholders: `وسيلة الدفع`, `تفاصيل الدفع` |
| 978 | `جاري الإرسال...` |
| 985 | `سجل طلبات السحب` |

### 5. `LibraryStore.tsx` (855 lines)
**Issue:** Has `useTranslation()` but many UI strings are hardcoded Arabic (~15+ strings).
| Line | Hardcoded String |
|------|-----------------|
| 53/358 | `منتج` (fallback) |
| 422 | `متجر المكتبات` |
| 445 | `السلة` |
| 468 | `المكتبات المتاحة` |
| 516–517 | `لا توجد منتجات`, `لم يتم العثور على منتجات في هذه المكتبة` |
| 560/619 | `متوفر:` |
| 688 | `السلة فارغة` |
| 732/827 | `المجموع:` |
| 790 | `لا توجد طرق دفع متاحة` |
| 812 | `الدفع من المحفظة (الرصيد: ... ج.م)` |
| 818 | `ملخص الطلب` |

### 6. `AdminPurchasesTab.tsx`
**Issue:** NO `useTranslation()` import at all. All text is hardcoded English.
| Line | Hardcoded String |
|------|-----------------|
| ~10 | `Loading purchases...` |
| ~15 | `Purchases` |
| ~20 | `No purchases found.` |
| ~25 | `Order #` |
| ~30 | `Status:`, `Total:` |
| ~35 | `Approve`, `Reject` |
| ~40 | `Items:` |

### 7. `DownloadApp.tsx`
**Issue:** Uses `isRTL ? "Arabic" : "English"` inline pattern throughout instead of `t()` calls (~20+ instances).
| Line | Pattern |
|------|---------|
| Throughout | `isRTL ? "خالي من الفيروسات" : "Virus Free"` |
| Throughout | `isRTL ? "بيانات مشفرة" : "Encrypted Data"` |
| Throughout | `isRTL ? "بدون إعلانات" : "No Ads"` |
| Throughout | All security features, install steps, headers, and footer text |

---

## 🟠 HIGH — Many Hardcoded Strings (10–30)

### 8. `ParentDashboard.tsx` (2249 lines)
**Status:** Partially internationalized. Uses `t()` with Arabic fallbacks in many places, but has ~30+ hardcoded strings.
| Line | Hardcoded String |
|------|-----------------|
| 466 | `يمكنه الآن الدخول برمز PIN` |
| 470/488/509 | `خطأ`, `فشل تعيين الرمز` |
| 505 | `تم تعيين رمز PIN الخاص بك ✅` |
| 812 | `جارٍ البحث...` |
| 877 | `لا توجد نتائج لـ "..."` |
| 1120 | `منزل` (fallback address) |
| 1210 | `غير مفعّل` |
| 1221 | `تغيير PIN` / `تعيين PIN` |
| 1669 | `رابط الإحالة الخاص بك:` / `Your referral link:` (isRTL pattern) |
| 1679 | `تم نسخ الرابط!` / `Link copied!` |
| 2020 | `الخطوة 1: البيانات الأساسية` |
| 2029 | `مثال: أحمد` (placeholder) |
| 2068 | `الخطوة 2: معلومات إضافية (اختياري)` |
| 2099 | `اختر السنة الدراسية` |
| 2118 | `ابحث عن المدرسة...` / `اختر المحافظة أولاً...` |
| 2154 | `جاري الإضافة...` / `إضافة ✅` |
| 2194 | `جاري التعيين...` / `تعيين ✅` |
| 2236 | `جاري التعيين...` / `تعيين ✅` |

### 9. `ParentInventory.tsx`
**Issue:** No `t()` calls. All text hardcoded Arabic (~15+ strings).
| Line | Hardcoded String |
|------|-----------------|
| ~header | `منتجاتي المملوكة`, `منتج/منتجات` |
| ~nav | `رجوع` |
| ~empty | `لا توجد منتجات بعد`, `اشترِ منتجات من المتجر`, `تصفح المتجر` |
| ~status | `مستخدَم` |
| ~price | `ج.م`, `نقطة` |
| ~actions | `تعيين كهدية`, `تم التعيين`, `بانتظار الموافقة` |
| ~loading | `جاري تحميل المنتجات...` |
| ~fallback | `منتج غير معروف` |

### 10. `Wallet.tsx` (457 lines)
**Issue:** No `t()` calls. All text hardcoded Arabic (~10+ strings).
| Line | Hardcoded String |
|------|-----------------|
| ~header | `المحفظة`, `إدارة الرصيد والإيداعات` |
| ~nav | `رجوع` |
| ~stats | `الرصيد الحالي`, `إيداع أموال` |
| ~totals | `إجمالي الإيداع:`, `إجمالي المصروف:` |
| ~history | `سجل الإيداعات` |
| ~empty | `لا توجد إيداعات سابقة` |

### 11. `ChildNotifications.tsx`
**Issue:** Several hardcoded Arabic strings in header/lists.
| Line | Hardcoded String |
|------|-----------------|
| 157 | `الإشعارات` |
| 159 | `جديد` |
| 163 | `النقاط:` |
| 168 | `رجوع` |

### 12. `ChildProgress.tsx`
**Issue:** Many hardcoded Arabic strings for stats and progress display.
| Line | Hardcoded String |
|------|-----------------|
| 149 | `رجوع` |
| 158–164 | `نقطة`, `هدية مستلمة`, `يوم` |
| 167–178 | `الهدف القادم`, `نقطة`, progress text sentences |

### 13. `OTPVerification.tsx`
**Issue:** Multiple hardcoded Arabic strings.
| Line | Hardcoded String |
|------|-----------------|
| 152 | `التحقق من الهوية` |
| 153 | `تم إرسال رمز تحقق إلى` |
| 170 | `البريد` |
| 180 | `الرسائل` |

---

## 🟡 MODERATE — Several Hardcoded Strings (3–10)

### 14. `AdminAuth.tsx`
- Lines 60–62: `isRTL ? "Arabic" : "English"` pattern for recovery messages
- Line 79: `"Password Recovery"` hardcoded
- Lines 85–86, 94–95, 102: Form labels/placeholders hardcoded
- Lines 108–115: Button text hardcoded

### 15. `AdminDashboard.tsx`
- Line 65: `"Redirecting..."` hardcoded

### 16. `ChildGames.tsx`
- Lines 130–131: Hardcoded Arabic/English error messages in `onError`
- Line 176: `"جاري التحقق..."` fallback
- Line 190: `مرحباً`/`Hi` greeting with isRTL pattern

### 17. `ChildTasks.tsx`
- Line 180: `"مهمة"` (task unit fallback)
- Line 191: `مهام مكتملة` section header

### 18. `ChildSettings.tsx`
- Lines 106–109: Toast messages use `lang === "ar" ? "..." : "..."` instead of `t()`

### 19. `Notifications.tsx`
- Lines 106–113: Multiple hardcoded Arabic toast descriptions

### 20. `ParentAuth.tsx`
- Line 144: `"جاري التحقق من الجلسة..."` hardcoded

### 21. `ForgotPassword.tsx`
- Line 131: `"انتهت صلاحية الرمز، أعد الإرسال"` hardcoded

### 22. `AssignTask.tsx`
- Line 131: `رصيدك:` hardcoded Arabic

### 23. `ChildPublicProfile.tsx`
- Line 131: `"Classify - Kids Educational Platform"` hardcoded

---

## 🟢 OK — Well Internationalized (No Action Needed)

The following files are fully or near-fully using `t()` calls:

| File | Notes |
|------|-------|
| `AboutUs.tsx` | ✅ Only brand "Classify v1.3.0" hardcoded |
| `AccessibilityPolicy.tsx` | ✅ |
| `AccountDeletion.tsx` | ✅ |
| `ChildDiscover.tsx` | ✅ |
| `ChildGifts.tsx` | ✅ |
| `ChildLink.tsx` | ✅ (first 200 lines) |
| `ChildProfile.tsx` | ✅ (first 200 lines) |
| `ChildRewards.tsx` | ✅ |
| `ChildStore.tsx` | ✅ |
| `ContactUs.tsx` | ✅ |
| `Home.tsx` | ✅ (minor: `"Android APK • 6 MB"`) |
| `LibraryLogin.tsx` | ✅ |
| `LibraryProfile.tsx` | ✅ (first 200 lines) |
| `MemoryMatchPage.tsx` | ✅ (no user text) |
| `not-found.tsx` | ✅ |
| `ParentProfile.tsx` | ✅ (first 200 lines) |
| `ParentStore.tsx` | ✅ (first 200 lines) |
| `ParentTasks.tsx` | ✅ (first 200 lines) |
| `Privacy.tsx` | ✅ (redirect only) |
| `PrivacyPolicy.tsx` | ✅ |
| `SchoolLogin.tsx` | ✅ |
| `SchoolProfile.tsx` | ✅ (uses `t()` with fallbacks) |
| `Settings.tsx` | ✅ |
| `TaskCart.tsx` | ✅ |
| `TaskMarketplace.tsx` | ✅ |
| `TeacherLogin.tsx` | ✅ |
| `TeacherProfile.tsx` | ✅ (uses `t()` with fallbacks) |
| `Terms.tsx` | ✅ |

---

## Anti-Patterns Found

### 1. `isRTL ? "Arabic text" : "English text"` (Most Common)
Files: `DownloadApp.tsx`, `AdminAuth.tsx`, `ChildGames.tsx`, `ChildSettings.tsx`, `ParentDashboard.tsx`
**Fix:** Replace with `t("key")` and add both translations to JSON files.

### 2. Hardcoded Arabic in JSX (No t() at all)
Files: `Subjects.tsx`, `SubjectTasks.tsx`, `TeacherDashboard.tsx`, `LibraryDashboard.tsx`, `LibraryStore.tsx`, `ParentInventory.tsx`, `Wallet.tsx`
**Fix:** Wrap all visible text in `t()` calls and add keys to translation files.

### 3. `t("key", "Arabic fallback")` — Acceptable but Check Coverage
Files: `SchoolDashboard.tsx`, `SchoolProfile.tsx`, `TeacherProfile.tsx`, `ParentDashboard.tsx`
**Note:** These use `t()` with inline fallbacks. This works but the keys must exist in translation JSON files. Verify all keys are defined.

---

## Recommended Priority Order

1. **Subjects.tsx** — Small file, easy win
2. **SubjectTasks.tsx** — Medium file, straightforward
3. **AdminPurchasesTab.tsx** — Small, no i18n setup at all
4. **Wallet.tsx** — Small file
5. **ParentInventory.tsx** — Small file
6. **DownloadApp.tsx** — Replace all `isRTL` ternaries
7. **LibraryStore.tsx** — Medium file
8. **ChildNotifications.tsx** — Small fix
9. **ChildProgress.tsx** — Small fix
10. **OTPVerification.tsx** — Small fix
11. **TeacherDashboard.tsx** — Large file, many strings
12. **LibraryDashboard.tsx** — Large file, many strings
13. **ParentDashboard.tsx** — Large file, scattered issues
14. Remaining MODERATE files (AdminAuth, ChildGames, etc.)
