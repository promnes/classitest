# Hardcoded Arabic Text Audit Report

**Date:** 2025-01-XX  
**Scope:** All `.tsx` files under `client/src/pages/` and `client/src/components/`  
**i18n System:** react-i18next with `useTranslation()` hook and `t()` function  
**Translation Files:** `client/src/i18n/locales/en.json` and `ar.json` (1114 lines each)

---

## Summary

| Category | Files Affected | Total Hardcoded Arabic Instances |
|----------|---------------|----------------------------------|
| Pages (NO t() at all) | ~15 | ~1,200+ |
| Pages (t() with Arabic fallback) | ~12 | ~400+ |
| Components (NO t() at all) | ~45 | ~1,100+ |
| **TOTAL** | **~72 files** | **~2,700+** |

### Three Patterns Found

1. **🔴 FULLY HARDCODED** — No `t()` usage at all. Arabic strings directly in JSX/logic. **Highest priority.**
2. **🟡 t() WITH ARABIC FALLBACK** — Uses `t("key", "Arabic fallback")`. Keys exist but Arabic is embedded as default. **Medium priority** (fallback is fragile — should come from translation file).
3. **🟠 isRTL TERNARY** — Uses `isRTL ? "Arabic" : "English"`. Should use `t()` instead. **High priority.**

---

## PAGES — Fully Hardcoded (🔴 NO t() at all)

### 1. TeacherDashboard.tsx (~200+ Arabic strings)

**THE WORST OFFENDER IN THE PROJECT.** Zero i18n usage.

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 68 | `"فشل رفع الملف"` | `teacherDashboard.uploadFailed` |
| 80 | `"فشل رفع الملف إلى التخزين"` | `teacherDashboard.uploadToStorageFailed` |
| 92 | `"فشل رفع الملف إلى التخزين"` | `teacherDashboard.uploadToStorageFailed` |
| 107 | `"فشل تأكيد رفع الملف"` | `teacherDashboard.uploadConfirmFailed` |
| 320 | `"تم إضافة المهمة بنجاح"` | `teacherDashboard.taskAddedSuccess` |
| 343 | `"تم تحديث المهمة"` | `teacherDashboard.taskUpdated` |
| 358 | `"تم حذف المهمة"` | `teacherDashboard.taskDeleted` |
| 378 | `"تم نشر المنشور"` | `teacherDashboard.postPublished` |
| 392 | `"تم حذف المنشور"` | `teacherDashboard.postDeleted` |
| 414 | `"تم إرسال طلب السحب"` | `teacherDashboard.withdrawalSent` |
| 435 | `"تم إنشاء المهمة من القالب بنجاح"` | `teacherDashboard.taskFromTemplateSuccess` |
| 453 | `"تم تحديث الملف الشخصي"` | `teacherDashboard.profileUpdated` |
| 473 | `"تم إنشاء التصويت"` | `teacherDashboard.pollCreated` |
| 475 | `"فشل إنشاء التصويت"` | `teacherDashboard.pollCreateFailed` |
| 491 | `"تم تحديث التصويت"` | `teacherDashboard.pollUpdated` |
| 493 | `"فشل التحديث"` | `teacherDashboard.updateFailed` |
| 505 | `"تم حذف التصويت"` | `teacherDashboard.pollDeleted` |
| 507 | `"فشل الحذف"` | `teacherDashboard.deleteFailed` |
| 524 | `"سؤال التصويت مطلوب"` | `teacherDashboard.pollQuestionRequired` |
| 529 | `"يجب إضافة خيارين على الأقل"` | `teacherDashboard.pollMinOptions` |
| 607 | `"السؤال والسعر وإجابتين على الأقل مطلوبة"` | `teacherDashboard.taskFormRequired` |
| 611 | `"يجب تحديد إجابة صحيحة واحدة على الأقل"` | `teacherDashboard.correctAnswerRequired` |
| 681 | `"فشل رفع الملفات"` | `teacherDashboard.filesUploadFailed` |
| 718 | `"الفيديو يجب أن يكون أقل من 30 ثانية"` | `teacherDashboard.videoMaxDuration` |
| 745 | `"يرجى اختيار صورة فقط"` | `teacherDashboard.imageOnlyPlease` |
| 771 | `"فشل رفع الصورة" / "فشل رفع صورة الغلاف"` | `teacherDashboard.imageUploadFailed` / `teacherDashboard.coverUploadFailed` |
| 799 | `"لوحة تحكم المعلم"` | `teacherDashboard.dashboardTitle` |
| 805 | `"المعلم"` | `teacherDashboard.teacher` |
| 827 | `"المهام"` | `teacherDashboard.tasks` |
| 834 | `"الرصيد المتاح"` | `teacherDashboard.availableBalance` |
| 841 | `"الطلبات"` | `teacherDashboard.orders` |
| 848 | `"التقييم"` | `teacherDashboard.rating` |
| 856-862 | Tab triggers: `"المهام"`, `"القوالب"`, `"الطلبات"`, `"المحفظة"`, `"المنشورات"`, `"التصويتات"`, `"الملف الشخصي"` | `teacherDashboard.tab.*` |
| 868 | `"إدارة المهام"` | `teacherDashboard.manageTasks` |
| 871 | `"مهمة جديدة"` | `teacherDashboard.newTask` |
| 876 | `"لم يتم إضافة مهام بعد"` | `teacherDashboard.noTasksYet` |
| 891 | `"نشط" / "غير نشط"` | `teacherDashboard.active` / `teacherDashboard.inactive` |
| 896 | `"ج.م"` | `teacherDashboard.currency` |
| 898 | `"شراء"` | `teacherDashboard.purchase` |
| 905 | `"تعديل"` | `teacherDashboard.edit` |
| 907 | `"هل تريد حذف هذه المهمة؟"` | `teacherDashboard.confirmDeleteTask` |
| 909 | `"حذف"` | `teacherDashboard.delete` |
| 921 | `"قوالب المهام الجاهزة"` | `teacherDashboard.taskTemplates` |
| 922 | `"اختر مادة ثم اختر قالب لإنشاء مهمة جاهزة بسعرك"` | `teacherDashboard.taskTemplatesDesc` |
| 940 | `"لا توجد قوالب لهذه المادة"` | `teacherDashboard.noTemplatesForSubject` |
| 950 | `"إجابات"` / `"نقطة"` | `teacherDashboard.answers` / `teacherDashboard.points` |
| 969 | `"استخدام القالب"` | `teacherDashboard.useTemplate` |
| 980 | `"الطلبات"` | `teacherDashboard.ordersHeader` |
| 982 | `"لا توجد طلبات بعد"` | `teacherDashboard.noOrdersYet` |
| 990-991 | `"مهمة"`, `"المشتري:"`, `"طالب"` | `teacherDashboard.task` / `teacherDashboard.buyer` / `teacherDashboard.student` |
| 997 | `"تم التسوية"` | `teacherDashboard.settled` |
| 999 | `"معلق"` | `teacherDashboard.pending` |
| 1016-1028 | `"الرصيد المتاح"`, `"الرصيد المعلق"`, `"إجمالي المسحوب"` | `teacherDashboard.available/pending/totalWithdrawn` |
| 1035-1038 | `"طلبات السحب"`, `"طلب سحب"` | `teacherDashboard.withdrawalRequests` / `teacherDashboard.requestWithdrawal` |
| 1043 | `"لا توجد طلبات سحب"` | `teacherDashboard.noWithdrawals` |
| 1050-1056 | `"ج.م"`, `"صافي:"`, `"عمولة"`, `"مقبول"`, `"مرفوض"`, `"قيد المراجعة"` | `teacherDashboard.currency/net/commission/approved/rejected/underReview` |
| 1068-1075 | `"المنشورات"`, `"منشور جديد"`, `"لا يوجد منشورات بعد"` | `teacherDashboard.posts/newPost/noPostsYet` |
| 1083 | `"حذف؟"` | `teacherDashboard.confirmDelete` |
| 1113-1116 | `"التصويتات"`, `"إنشاء تصويت"` | `teacherDashboard.polls/createPoll` |
| 1121 | `"لا يوجد تصويتات بعد"` | `teacherDashboard.noPollsYet` |
| 1138-1142 | `"مثبت"`, `"مغلق"`, `"منتهي"`, `"مجهول"`, `"متعدد"` | `teacherDashboard.pinned/closed/expired/anonymous/multiple` |
| 1172 | `"مصوّت"` | `teacherDashboard.voter` |
| 1181-1196 | `"إلغاء التثبيت"`, `"تثبيت"`, `"فتح التصويت"`, `"إغلاق التصويت"`, `"حذف هذا التصويت؟"` | `teacherDashboard.unpin/pin/openPoll/closePoll/confirmDeletePoll` |
| 1226 | `"جاري الرفع..."`, `"تغيير الغلاف"` | `teacherDashboard.uploading/changeCover` |
| 1253 | `"لم يتم تحديد المادة"` | `teacherDashboard.noSubjectSet` |
| 1264 | `"عرض الصفحة العامة"` | `teacherDashboard.viewPublicPage` |
| 1289 | `"إلغاء"` / `"تعديل"` | `teacherDashboard.cancel` / `teacherDashboard.edit` |
| 1301-1304 | `"مهمة"`, `"طالب"`, `"منشور"`, `"تقييم"` | `teacherDashboard.taskCount/studentCount/postCount/ratingCount` |
| 1325-1364 | Profile form: `"الاسم"`, `"نبذة عني"`, `"المادة"`, `"سنوات الخبرة"`, `"السوشيال ميديا"`, `"حفظ التغييرات"` | `teacherDashboard.name/bio/subject/yearsExp/socialMedia/saveChanges` |
| 1378-1637 | Task modal: `"تعديل المهمة"`, `"مهمة جديدة"`, `"عنوان المهمة"`, `"السؤال"`, `"السعر"`, `"تصنيف المادة"`, `"الإجابات"`, `"شرح الإجابة"`, `"صور مع السؤال"`, `"الوسائط"`, `"إلغاء"`, `"جاري الرفع..."`, `"تحديث"`, `"إضافة"` | `teacherDashboard.modal.*` |
| 1647-1676 | Template modal: `"إنشاء مهمة من قالب"`, `"السعر (ج.م)"`, `"العنوان (اختياري)"`, `"السعر مطلوب"`, `"جاري الإنشاء..."`, `"إنشاء المهمة"` | `teacherDashboard.template.*` |
| 1685-1727 | Post modal: `"منشور جديد"`, `"اكتب محتوى المنشور..."`, `"صورة"`, `"فيديو (30 ثانية كحد أقصى)"`, `"إلغاء"`, `"نشر"` | `teacherDashboard.post.*` |
| 1736-1888 | Poll modal: `"إنشاء تصويت جديد"`, `"السؤال"`, `"الخيارات"`, `"إضافة خيار"`, `"السماح باختيار متعدد"`, `"تصويت مجهول"`, `"تثبيت التصويت"`, `"تاريخ الانتهاء"`, `"إلغاء"`, `"إنشاء التصويت"` | `teacherDashboard.poll.modal.*` |
| 1770-1781 | `"حجم الصورة يجب أن يكون أقل من 5MB"`, `"تم رفع صورة الخيار"`, `"فشل رفع الصورة"` | `teacherDashboard.imageSizeLimit/optionImageUploaded/imageUploadFailed` |
| 1840-1853 | `"إضافة خيار"`, `"السماح باختيار متعدد"`, `"تصويت مجهول"`, `"تثبيت التصويت"` | (repeated from above) |
| 1897-1915 | Withdrawal modal: `"طلب سحب"`, `"الرصيد المتاح:"`, `"ج.م"`, `"المبلغ (ج.م)"`, `"أدخل المبلغ المراد سحبه"`, `"إلغاء"`, `"إرسال الطلب"` | `teacherDashboard.withdrawal.*` |

---

### 2. LibraryDashboard.tsx (~96 Arabic strings)

Zero i18n usage. Entirely hardcoded.

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 234 | `"تم إضافة المنتج بنجاح"` | `libraryDashboard.productAddedSuccess` |
| 241 | `"فشل إضافة المنتج"` | `libraryDashboard.productAddFailed` |
| 262 | `"تم تحديث المنتج"` | `libraryDashboard.productUpdated` |
| 269 | `"فشل تحديث المنتج"` | `libraryDashboard.productUpdateFailed` |
| 283 | `"تم حذف المنتج"` | `libraryDashboard.productDeleted` |
| 288 | `"فشل حذف المنتج"` | `libraryDashboard.productDeleteFailed` |
| 303 | `"تم تحديث الطلب إلى: تم الشحن"` | `libraryDashboard.orderShipped` |
| 307 | `"فشل تحديث حالة الشحن"` | `libraryDashboard.shippingUpdateFailed` |
| 326 | `"تم تأكيد التسليم بنجاح"` | `libraryDashboard.deliveryConfirmed` |
| 333 | `"فشل التحقق من كود التسليم"` | `libraryDashboard.deliveryCodeFailed` |
| 357 | `"تم إرسال طلب السحب بنجاح"` | `libraryDashboard.withdrawalSuccess` |
| 365 | `"فشل إنشاء طلب السحب"` | `libraryDashboard.withdrawalFailed` |
| 403 | `"تم النسخ"` | `libraryDashboard.copied` |
| 427-553 | Multiple upload errors: `"فشل تجهيز رفع الصورة"`, `"فشل رفع الصورة إلى التخزين"`, `"فشل تأكيد رفع الصورة"` | `libraryDashboard.upload.*` |
| 561 | `"يرجى اختيار صورة فقط"` | `libraryDashboard.imageOnlyPlease` |
| 590 | `"تم رفع صورة المكتبة"` / `"تم رفع صورة الغلاف"` | `libraryDashboard.avatarUploaded` / `libraryDashboard.coverUploaded` |
| 604 | `"جاري التحميل..."` | `libraryDashboard.loading` |
| 621 | `"لوحة تحكم المكتبة"` | `libraryDashboard.dashboardTitle` |
| 629 | `"تسجيل الخروج"` | `libraryDashboard.logout` |
| 645-684 | Stats: `"المنتجات"`, `"المبيعات"`, `"الإحالات"`, `"نقاط النشاط"` | `libraryDashboard.stats.*` |
| 695-710 | `"رابط الإحالة"`, `"كود الإحالة"` | `libraryDashboard.referralLink/referralCode` |
| 724-729 | Tabs: `"المنتجات"`, `"الطلبات"`, `"الإحالات"`, `"سجل النشاط"`, `"الأرباح والسحب"`, `"الملف الشخصي"` | `libraryDashboard.tab.*` |
| 734-795 | Products section: `"منتجاتي"`, `"إضافة منتج"`, `"جاري التحميل..."`, `"ج.م"`, `"خصم"`, `"المخزون:"`, `"هل تريد حذف هذا المنتج؟"`, `"لا توجد منتجات بعد"`, `"إضافة أول منتج"` | `libraryDashboard.products.*` |
| 809-826 | Referrals: `"زيارة"`, `"تسجيل"`, `"شراء"`, `"نقطة"`, `"لا توجد إحالات بعد"`, `"شارك رابط الإحالة لكسب النقاط"` | `libraryDashboard.referrals.*` |
| 840-893 | Orders: `"منتج مكتبة"`, `"المشتري:"`, `"الكمية:"`, `"الإجمالي:"`, `"العنوان:"`, `"الطلب بانتظار تأكيد الأدمن"`, `"تم الشحن"`, `"أدخل كود التسليم..."`, `"كود التسليم"`, `"تم التسليم"`, `"لحماية المستهلك"`, `"لا توجد طلبات حالياً"` | `libraryDashboard.orders.*` |
| 905-920 | Activity: `"إضافة منتج"`, `"تحديث منتج"`, `"لا يوجد نشاط بعد"` | `libraryDashboard.activity.*` |
| 930-999 | Finance: `"الرصيد المتاح"`, `"الرصيد المعلّق"`, `"إجمالي المبيعات"`, `"إجمالي العمولة"`, `"طلب سحب أموال"`, `"المبلغ"`, `"وسيلة الدفع"`, `"تفاصيل الدفع"`, `"تأكيد طلب السحب"`, `"سجل طلبات السحب"`, `"فواتير المبيعات اليومية"` | `libraryDashboard.finance.*` |
| 1040-1189 | Profile/Product form: `"جاري الرفع..."`, `"تغيير الغلاف"`, `"العنوان"`, `"الوصف"`, `"رابط الصورة"`, `"السعر"`, `"المخزون"`, `"نسبة الخصم"`, `"الحد الأدنى"`, `"إلغاء"`, `"جاري الحفظ..."`, `"حفظ"` | `libraryDashboard.form.*` |

---

### 3. ParentStore.tsx (~94 Arabic strings)

Zero i18n. Entirely hardcoded store UI.

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 63-64 | `"منتج"` (fallback product name) | `parentStore.defaultProduct` |
| 345 | `"كلاسيفاي ستور"` | `parentStore.storeTitle` |
| 353 | `"ابحث عن منتجات..."` | `parentStore.searchPlaceholder` |
| 365-366 | `"رصيد المحفظة"`, `"ج.م"` | `parentStore.walletBalance` / `parentStore.currency` |
| 399-407 | `"الكل"`, `"المكتبات"` | `parentStore.all` / `parentStore.libraries` |
| 435-437 | `"المتجر"`, `"السلة"`, `"طلباتي"` | `parentStore.storeTab/cartTab/ordersTab` |
| 473-497 | `"مخزوني"`, `"طلباتي"`, `"لا توجد طلبات بعد"`, `"تصفح المتجر واشترِ منتجات"`, `"تصفح المتجر"` | `parentStore.myInventory/orders/noOrders/browseStore` |
| 509-529 | Order statuses: `"مكتمل"`, `"قيد المعالجة"`, `"جاري التجهيز"`, `"تم الشحن"`, `"ملغي"` | `parentStore.orderStatus.*` |
| 554-666 | Cart + Sorting: `"سلة التسوق"`, `"السلة فارغة"`, `"أضف منتجات من المتجر"`, `"المجموع"`, `"إتمام الشراء"`, `"توصيل سريع"`, `"ضمان الجودة"`, `"دعم 24/7"`, `"ترتيب حسب"`, `"الأكثر مبيعاً"`, `"السعر: الأقل"`, `"السعر: الأعلى"`, `"الأحدث"`, `"التقييم"` | `parentStore.cart.*/sorting.*` |
| 696-802 | Products: `"المنتجات المميزة"`, `"مكتبة"`, `"شراء الآن"`, `"المنتجات"`, `"نتائج البحث"`, `"جميع المنتجات"`, `"لا توجد منتجات"`, `"جرب البحث بكلمات أخرى"` | `parentStore.products.*` |
| 861-935 | Product details: `"ج.م"`, `"تقييم"`, `"النقاط المطلوبة"`, `"أضف للسلة"`, `"شراء الآن"` | `parentStore.productDetail.*` |
| 977-1050 | Cart checkout: `"سلة التسوق"`, `"السلة فارغة"`, `"ج.م"`, `"المجموع"`, `"إتمام الشراء"` | `parentStore.checkout.*` |
| 1071-1191 | Checkout form: `"شراء مباشر"`, `"إتمام الشراء"`, `"عنوان الشحن"`, `"الاسم الكامل"`, `"المدينة"`, `"العنوان التفصيلي"`, `"المنطقة/الحي"`, `"الرمز البريدي"`, `"طريقة الدفع"`, `"لا توجد طرق دفع متاحة"`, `"الدفع من المحفظة"`, `"ملخص الطلب"`, `"جاري المعالجة..."`, `"تأكيد الشراء"` | `parentStore.checkout.form.*` |
| 1204-1276 | Gift assignment: `"تعيين المنتج كهدية"`, `"اختر الطفل"`, `"اختر طفلاً..."`, `"نقطة"`, `"النقاط المطلوبة للحصول على الهدية"`, `"سيحتاج الطفل جمع..."`, `"شراء وتعيين كهدية"`, `"أضف للسلة فقط"` | `parentStore.giftAssignment.*` |

---

### 4. ParentDashboard.tsx (~54 Arabic strings)

Mixed — some `t()` with fallbacks, some fully hardcoded.

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 433 | `"تم إضافة الطفل بنجاح ✅"`, `"يمكنه الآن الدخول برمز PIN"` | `parentDashboard.childAdded/childAddedDesc` |
| 437 | `"خطأ"`, `"فشل إضافة الطفل"` | `parentDashboard.error/childAddFailed` |
| 451 | `"تم تعيين رمز PIN ✅"` | `parentDashboard.pinSet` |
| 455 | `"فشل تعيين الرمز"` | `parentDashboard.pinSetFailed` |
| 472 | `"تم تعيين رمز PIN الخاص بك ✅"` | `parentDashboard.myPinSet` |
| 476 | `"فشل تعيين الرمز"` | `parentDashboard.myPinSetFailed` |
| 588-596 | Uses t() with fallbacks: `"تسجيل الخروج"`, `"هل أنت متأكد..."`, `"إلغاء"` | ✅ Keys exist but fallbacks embedded |
| 617 | `"ابحث عن مدارس، معلمين، مهام..."` | `parentDashboard.searchPlaceholder` |
| 631 | `"جارٍ البحث..."` | `parentDashboard.searching` |
| 637 | `"🏫 مدارس"` | `parentDashboard.schools` |
| 657 | `"👨‍🏫 معلمون"` | `parentDashboard.teachers` |
| 677 | `"📝 مهام"` | `parentDashboard.tasks` |
| 696 | `"لا توجد نتائج لـ"` | `parentDashboard.noResultsFor` |
| 877 | `"سوق المهام التعليمية"` | `parentDashboard.taskMarket` |
| 939 | `"منزل"` | `parentDashboard.defaultAddress` |
| 1024 | `"رمز PIN العائلي"` | `parentDashboard.familyPin` |
| 1027-1029 | `"✓ مفعّل"`, `"غير مفعّل"` | `parentDashboard.pinEnabled/pinDisabled` |
| 1040-1044 | `"تغيير PIN"`, `"تعيين PIN"`, `"إضافة طفل"` | `parentDashboard.changePin/setPin/addChild` |
| 1050 | `"رمز العائلة:"` | `parentDashboard.familyCode` |
| 1488 | `"رابط الإحالة الخاص بك:"` (isRTL pattern) | `parentDashboard.yourReferralLink` |
| 1498 | `"تم نسخ الرابط!"` (isRTL pattern) | `parentDashboard.linkCopied` |
| 1824 | `"إضافة طفل جديد"` | `parentDashboard.addNewChild` |
| 1839-1976 | Add child form: `"الخطوة 1"`, `"البيانات الأساسية"`, `"اسم الطفل"`, `"مثال: أحمد"`, `"رمز PIN (4 أرقام)"`, `"سيستخدم الطفل هذا الرمز..."`, `"التالي"`, `"إلغاء"`, `"الخطوة 2"`, `"معلومات إضافية"`, `"تاريخ الميلاد"`, `"المحافظة"`, `"السنة الدراسية"`, `"اختر السنة الدراسية"`, `"المدرسة"`, `"ابحث عن المدرسة..."`, `"اكتب اسم المدرسة..."`, `"جاري الإضافة..."` | `parentDashboard.addChildForm.*` |
| 1990-2058 | PIN modals: `"تعيين PIN لـ"`, `"رمز PIN جديد"`, `"جاري التعيين..."`, `"تعيين ✅"`, `"إلغاء"`, `"تعيين رمز PIN الخاص بك"`, `"رمز PIN يسمح لك بالدخول..."` | `parentDashboard.pinModal.*` |

---

### 5. ChildStore.tsx (~53 Arabic strings)

Zero i18n. Entire child store interface.

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 244 | `"كلاسيفاي ستور"` | `childStore.storeTitle` |
| 252 | `"ابحث..."` | `childStore.searchPlaceholder` |
| 264 | `"رصيد النقاط"` | `childStore.pointsBalance` |
| 300-310 | `"الكل"`, `"المكتبات"` | `childStore.all/libraries` |
| 339-347 | `"توصيل سريع"`, `"ضمان الجودة"`, `"دعم 24/7"` | `childStore.features.*` |
| 353-360 | Sorting: `"ترتيب"`, `"الأكثر مبيعاً"`, `"النقاط: الأقل"`, `"النقاط: الأعلى"`, `"الأحدث"`, `"التقييم"` | `childStore.sorting.*` |
| 390 | `"المنتجات المميزة"` | `childStore.featuredProducts` |
| 411-465 | `"متاح لك"`, `"مكتبة"`, `"نقطة"`, `"المنتجات"`, `"نتائج:"`, `"جميع المنتجات"` | `childStore.products.*` |
| 487-488 | `"لا توجد منتجات"`, `"جرب البحث بكلمات أخرى"` | `childStore.noProducts/tryDifferentSearch` |
| 555-605 | `"أضف"`, `"تقييم"`, `"نقطة"`, `"أضف للسلة"` | `childStore.addToCart/review/points` |
| 630-731 | Cart: `"سلة التسوق"`, `"السلة فارغة"`, `"نقطة"`, `"المجموع:"`, `"رصيدك الحالي:"`, `"نقاطك غير كافية!"`, `"تحتاج ... نقطة إضافية"`, `"العب لتكسب نقاط"` | `childStore.cart.*` |
| 731 | `"إتمام الشراء بالنقاط"` | `childStore.checkoutWithPoints` |
| 836-898 | Product modal: `"تفاصيل المنتج"`, `"تقييم"`, `"السعر"`, `"نقطة"`, `"رصيدك"`, `"أضف للسلة"`, `"نقاطك غير كافية"`, `"العب لتكسب نقاط"` | `childStore.productDetail.*` |

---

### 6. LibraryStore.tsx (~48 Arabic strings)

Zero i18n.

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 52 | `"منتج"` | `libraryStore.defaultProduct` |
| 315 | `"تم إنشاء الطلب بنجاح وهو الآن بانتظار موافقة الأدمن"` | `libraryStore.orderCreatedPending` |
| 318 | `"فشل إتمام الشراء"` | `libraryStore.purchaseFailed` |
| 324 | `"يرجى تسجيل دخول ولي الأمر أولاً لإتمام الشراء"` | `libraryStore.loginRequired` |
| 332 | `"هذا المنتج غير متوفر حالياً"` | `libraryStore.productUnavailable` |
| 377-385 | `"السلة فارغة"`, `"يرجى اختيار طريقة الدفع"`, `"يرجى استكمال بيانات عنوان الشحن"` | `libraryStore.emptyCart/selectPayment/completeShipping` |
| 419 | `"متجر المكتبات"` | `libraryStore.storeTitle` |
| 442-842 | Full store UI (similar pattern to ParentStore): `"السلة"`, `"ابحث عن منتج..."`, `"المكتبات المتاحة"`, `"الكل"`, `"لا توجد منتجات"`, `"ج.م"`, `"خصم"`, `"متوفر:"`, `"أضف للسلة"`, `"شراء الآن"`, `"غير متوفر"`, `"إضافة للسلة"`, `"سلة المكتبات"`, `"السلة فارغة"`, `"المجموع:"`, `"إتمام الشراء"`, `"شراء مباشر من المكتبات"`, `"عنوان الشحن"`, `"الاسم الكامل"`, `"المدينة"`, `"العنوان التفصيلي"`, `"المنطقة/الحي"`, `"الرمز البريدي"`, `"طريقة الدفع"`, `"لا توجد طرق دفع متاحة"`, `"الدفع من المحفظة"`, `"ملخص الطلب"`, `"جاري المعالجة..."`, `"تأكيد الشراء"` | `libraryStore.*` |

---

### 7. Wallet.tsx (~45 Arabic strings)

Uses t() only in 2 places, rest hardcoded.

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 21-29 | Payment labels/statuses: `"محفظة إلكترونية"`, `"بطاقة ائتمان"`, `"أخرى"`, `"قيد المراجعة"`, `"مقبول ✓"`, `"مرفوض ✗"` | `wallet.paymentMethod.*/wallet.status.*` |
| 33-35 | `"حدث خطأ أثناء إرسال طلب الإيداع"` | `wallet.depositError` |
| 139-174 | Header: `"💰 المحفظة"`, `"إدارة الرصيد والإيداعات"`, `"← رجوع"`, `"الرصيد الحالي"`, `"💳 إيداع أموال"`, `"إجمالي الإيداع"`, `"إجمالي المصروف"` | `wallet.header.*` |
| 185-238 | Deposits log: `"📋 سجل الإيداعات"`, `"لا توجد إيداعات سابقة"`, `"🔖 رقم العملية:"`, `"🧾 عرض إثبات التحويل"`, `"💬 ملاحظات الإدارة:"` | `wallet.deposits.*` |
| 260-445 | Deposit form: `"💳 إيداع أموال"`, `"اختر وسيلة الدفع"`, `"لا توجد وسائل دفع متاحة"`, `"التالي"`, `"إلغاء"`, `"تأكيد الإيداع"`, `"قم بالتحويل للحساب التالي ثم أدخل المبلغ"`, `"رقم العملية مطلوب..."`, `"البنك:"`, `"رقم الحساب:"`, `"باسم:"`, `"الهاتف:"`, `"المبلغ المحول"`, `"أدخل المبلغ"`, `"رقم العملية / المرجع البنكي"`, `"رابط إثبات التحويل"`, `"ملاحظات"`, `"جاري الإرسال..."`, `"✅ إرسال الطلب للمراجعة"`, `"← رجوع"`, `"إلغاء"` | `wallet.depositForm.*` |

---

### 8. TaskMarketplace.tsx (~18 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 40-44 | Sort labels: `"الأكثر مبيعاً"`, `"الأحدث"`, `"الأكثر إعجاباً"`, `"الأقل سعراً"`, `"الأعلى سعراً"` | `taskMarketplace.sort.*` |
| 103 | `"حدث خطأ"` | `taskMarketplace.error` |
| 123 | `"تمت الإضافة للسلة ✓"` | `taskMarketplace.addedToCart` |
| 146-148 | `"سوق المهام"`, `"مهام تعليمية من أفضل المعلمين"` | `taskMarketplace.title/subtitle` |
| 174 | `"ابحث عن مهام، مواد..."` | `taskMarketplace.searchPlaceholder` |
| 208 | `"الكل"` | `taskMarketplace.all` |
| 237-238 | `"لا توجد مهام حالياً"`, `"جرّب تغيير معايير البحث"` | `taskMarketplace.noTasks/tryDifferentSearch` |
| 285 | `"✓ مُشترى"` | `taskMarketplace.purchased` |
| 343 | `"ج.م"` | `taskMarketplace.currency` |
| 348-362 | `"مُشترى ✓"`, `"في السلة"`, `"أضف"` | `taskMarketplace.purchased/inCart/add` |

---

### 9. TaskCart.tsx (~18 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 68 | `"تم الحذف من السلة"` | `taskCart.removedFromCart` |
| 91-92 | `"تم الشراء بنجاح!"`, `"تم شراء X مهمة"` | `taskCart.purchaseSuccess/purchaseDesc` |
| 96 | `"فشل الشراء"` | `taskCart.purchaseFailed` |
| 116 | `"سلة المهام"` | `taskCart.title` |
| 138-143 | `"رصيد المحفظة"`, `"ج.م"`, `"شحن"` | `taskCart.walletBalance/currency/topUp` |
| 160-166 | `"السلة فارغة"`, `"تصفح سوق المهام..."`, `"تصفح المهام"` | `taskCart.emptyCart/emptyCartDesc/browseTasks` |
| 191-232 | `"بواسطة:"`, `"ج.م"`, `"عدد المهام"`, `"المجموع"` | `taskCart.by/currency/taskCount/total` |
| 238 | `"رصيدك غير كافٍ. تحتاج ... ج.م إضافية"` | `taskCart.insufficientBalance` |
| 250-255 | `"جاري الشراء..."`, `"شراء الكل"` | `taskCart.purchasing/purchaseAll` |

---

### 10. Notifications.tsx (~20 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 87-90 | `"تم القبول"`, `"تم الرفض"`, `"تم إرسال الكود للطفل..."`, `"تم رفض طلب تسجيل الدخول"` | `notifications.approved/rejected/codeSent/loginRejected` |
| 103-104 | `"تم التعليم"`, `"تم تعليم جميع الإشعارات كمقروءة"` | `notifications.markedRead/allMarkedRead` |
| 112 | `"تم نسخ الكود"` | `notifications.codeCopied` |
| 214-218 | `"🔔 الإشعارات"`, `"لديك X إشعارات جديدة"` | `notifications.title/newCount` |
| 230 | `"جارٍ التعليم..."` / `"تعليم الكل كمقروء"` | `notifications.markingAll/markAllRead` |
| 243 | `"← رجوع"` | `notifications.back` |
| 279 | `"جديد"` | `notifications.new` |
| 301 | `"كود الربط:"` | `notifications.linkCode` |
| 331-349 | `"موافقة"`, `"رفض"` | `notifications.approve/reject` |
| 362 | `"اضغط للانتقال ←"` | `notifications.clickToNavigate` |
| 373 | `"لا توجد إشعارات حالياً ✨"` | `notifications.empty` |
| 386-398 | `"السابق"`, `"صفحة X من Y"`, `"التالي"` | `notifications.prev/pageOf/next` |

---

### 11. ChildNotifications.tsx (~18 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 173 | `"الإشعارات"` | `childNotifications.title` |
| 176 | `"X جديد"` | `childNotifications.newCount` |
| 182 | `"النقاط: X"` | `childNotifications.points` |
| 192 | `"رجوع"` | `childNotifications.back` |
| 237 | `"+X نقطة"` | `childNotifications.pointsEarned` |
| 242 | `"الهدف: X نقطة"` | `childNotifications.targetPoints` |
| 247 | `"التقدم: X%"` | `childNotifications.progressPercent` |
| 274 | `"تم القراءة"` | `childNotifications.read` |
| 298-301 | `"لا توجد إشعارات"`, `"ستظهر هنا إشعاراتك..."` | `childNotifications.empty/emptyDesc` |
| 313-316 | `"مرحباً X!"`, `"استمر في جمع النقاط..."` | `childNotifications.greeting/encouragement` |
| 330-354 | Nav: `"العب"`, `"المتجر"`, `"الهدايا"`, `"المهام"` | `childNotifications.nav.*` |

---

### 12. ChildProgress.tsx (~20 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 101 | `"رجوع"` | `childProgress.back` |
| 118-164 | Stats: `"مستوى السرعة"`, `"نقطة/يوم"`, `"نقطة"`, `"مهمة منجزة"`, `"هدية مستلمة"`, `"يوم"` | `childProgress.stats.*` |
| 171-194 | `"الهدف القادم"`, `"X نقطة"`, `"باقي X نقطة للوصول للهدف!"` | `childProgress.nextMilestone/pointsRemaining` |
| 203-227 | `"أقرب هدية"`, `"X% - باقي X نقطة"`, `"لديك X هدية في انتظارك!"` | `childProgress.closestGift/giftsPending` |
| 238-264 | `"العب واكسب"`, `"هداياي"`, `"ابدأ رحلتك!"`, `"العب الألعاب وأنجز المهام لتكسب النقاط!"`, `"ابدأ الآن"` | `childProgress.playAndEarn/myGifts/startJourney/startNow` |

---

### 13. ChildTasks.tsx (~8 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 158 | `"مهمة"` | `childTasks.task` |
| 183 | `"مهام مكتملة (X)"` | `childTasks.completedTasks` |
| 266 | `"جاري الإرسال..."` / `"إرسال الإجابة"` | `childTasks.submitting/submitAnswer` |
| 276 | `"إلغاء"` | `childTasks.cancel` |
| 303-304 | `"أحسنت!"`, `"+X نقطة"` | `childTasks.wellDone/pointsEarned` |
| 309-310 | `"حاول مرة أخرى"`, `"الإجابة غير صحيحة"` | `childTasks.tryAgain/incorrectAnswer` |

---

### 14. Subjects.tsx (~15 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 66-69 | `"📚 المواد الدراسية"`, `"مهام جاهزة يمكن إرسالها للأطفال"` | `subjects.title/subtitle` |
| 85 | `"← رجوع"` | `subjects.back` |
| 94 | `"المواد"` | `subjects.subjects` |
| 120 | `"المهام الجاهزة"` | `subjects.readyTasks` |
| 155-163 | `"إرسال"`, `"لا توجد مهام جاهزة في هذه المادة"` | `subjects.send/noTasks` |
| 169 | `"اختر مادة لعرض المهام الجاهزة"` | `subjects.selectSubject` |
| 180-222 | Send modal: `"إرسال المهمة"`, `"اختر الطفل"`, `"-- اختر --"`, `"💰 رصيدك الحالي:"`, `"رصيدك غير كافي"` | `subjects.sendModal.*` |

---

### 15. SubjectTasks.tsx (~30 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 125 | `"تم إرسال المهمة للطفل بنجاح!"` | `subjectTasks.taskSentSuccess` |
| 189 | `"العودة"` | `subjectTasks.back` |
| 213-222 | `"مهام كلاسي"`, `"مهامي"`, `"إنشاء مهمة جديدة"` | `subjectTasks.classifyTasks/myTasks/createNewTask` |
| 239-300 | `"مهام كلاسي الجاهزة"`, `"لا توجد مهام جاهزة لهذه المادة"`, `"نقطة"`, `"سهل"`, `"متوسط"`, `"صعب"`, `"مهامي الخاصة"`, `"لم تنشئ أي مهام بعد"`, `"إنشاء أول مهمة"` | `subjectTasks.*` |
| 347-514 | Send/Create modals: `"إرسال المهمة للطفل"`, `"اختر الطفل"`, `"عدد النقاط"`, `"رصيدك غير كافي"`, `"جاري الإرسال..."`, `"إرسال المهمة"`, `"إلغاء"`, `"إنشاء مهمة جديدة"`, `"عنوان المهمة"`, `"السؤال"`, `"الإجابات"`, `"الإجابة"`, `"صحيحة"`, `"النقاط"`, `"جاري الحفظ..."`, `"حفظ المهمة"` | `subjectTasks.modal.*` |

---

### 16. SettingsPro.tsx (~40 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 182-189 | `"⚙️ الإعدادات"`, `"← رجوع"` | `settingsPro.title/back` |
| 207-237 | Tabs: `"👤 البيانات الشخصية"`, `"🔐 الأمان"`, `"🎨 المظهر"`, `"🔔 الإشعارات"` | `settingsPro.tabs.*` |
| 245-381 | Personal/Security: `"تعديل البيانات الشخصية"`, `"الاسم"`, `"البريد الإلكتروني"`, `"تغيير كلمة المرور"`, `"كلمة المرور الحالية"`, `"كلمة المرور الجديدة"`, `"تأكيد كلمة المرور الجديدة"`, `"طريقة رمز التحقق"`, `"البريد الإلكتروني"`, `"رسالة نصية"`, `"رمز التحقق"` | `settingsPro.personal.*/security.*` |
| 407-565 | Appearance/Notifications: `"إعدادات المظهر"`, `"الوضع الليلي"` / `"الوضع النهاري"`, `"تبديل المظهر"`, `"🔔 إعدادات الإشعارات"`, `"الإشعارات الفورية"`, `"استلام إشعارات على الهاتف"`, `"إشعارات البريد الإلكتروني"`, `"استلام تحديثات عبر الإيميل"`, `"🎯 أنواع الإشعارات"`, `"📊 التقارير الدورية"`, `"ملخص يومي"`, `"تقرير يومي بنشاط الأطفال"`, `"ملخص أسبوعي"`, `"تقرير أسبوعي شامل"`, `"💾 حفظ إعدادات الإشعارات"` | `settingsPro.appearance.*/notifications.*` |

---

### 17. ForgotPassword.tsx (~5 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 124 | `"انتهت صلاحية الرمز، أعد الإرسال"` | `forgotPassword.otpExpired` |
| 207 | `"📧 البريد"` | `forgotPassword.emailLabel` |
| 227 | `"البريد الإلكتروني"` | `forgotPassword.email` |
| 278 | `"كلمة المرور الجديدة"` | `forgotPassword.newPassword` |
| 295 | `"تأكيد كلمة المرور"` | `forgotPassword.confirmPassword` |

---

### 18. OTPVerification.tsx (~9 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 113 | `"رمز خاطئ أو منتهي الصلاحية"` | `otpVerification.invalidOtp` |
| 153 | `"فشل إعادة الإرسال"` | `otpVerification.resendFailed` |
| 162 | `"🔐 التحقق من الهوية"` | `otpVerification.title` |
| 165 | `"تم إرسال رمز تحقق إلى..."` | `otpVerification.codeSentTo` |
| 186 | `"📧 البريد"` | `otpVerification.email` |
| 217-218 | `"✅ التحقق"`, `"إعادة إرسال"` | `otpVerification.verify/resend` |
| 233 | `"تذكر هذا الجهاز..."` | `otpVerification.rememberDevice` |
| 246 | `"← إلغاء"` | `otpVerification.cancel` |

---

### 19. ParentInventory.tsx (~28 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 17-20 | Status labels: `"بانتظار موافقة الإدارة"`, `"متاح للتعيين"`, `"مُعيّن لطفل"`, `"مستخدَم"` | `parentInventory.status.*` |
| 63 | `"جاري تحميل المنتجات..."` | `parentInventory.loading` |
| 78-95 | `"منتجاتي المملوكة"`, `"X منتج/منتجات"`, `"رجوع"` | `parentInventory.title/count/back` |
| 108-111 | `"لا توجد منتجات بعد"`, `"اشترِ منتجات من المتجر..."`, `"تصفح المتجر"` | `parentInventory.empty/emptyDesc/browseStore` |
| 119-292 | Product cards + assign dialog: `"منتج غير معروف"`, `"ج.م"`, `"نقطة"`, `"تعيين كهدية"`, `"تم التعيين"`, `"بانتظار الموافقة"`, `"تعيين كهدية للطفل"`, `"اختر الطفل"`, `"لا يوجد أطفال مرتبطين..."`, `"اختر طفلاً..."`, `"نقطة"`, `"النقاط المطلوبة للحصول على الهدية"`, `"سيحتاج الطفل جمع..."`, `"جاري التعيين..."`, `"تعيين كهدية"`, `"إلغاء"` | `parentInventory.products.*/assignDialog.*` |

---

### 20. ParentTasks.tsx (2 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 440 | `"الرصيد: X"` | `parentTasks.balance` |
| 729 | `"رصيدك غير كافي لإرسال هذه المهمة..."` | `parentTasks.insufficientBalance` |

---

### 21. PrivacyPolicy.tsx (~25 Arabic strings — ENTIRE PAGE)

The entire privacy policy page content is hardcoded in Arabic.

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 14 | `"سياسة الخصوصية"` | `privacyPolicy.title` |
| 27 | `"← العودة"` | `privacyPolicy.back` |
| 36-91 | Full policy text: `"مقدمة"`, `"نلتزم بحماية خصوصيتك..."`, all 8 sections with headers and content | `privacyPolicy.section1.*/section2.*` ... etc. |

---

### 22. Settings.tsx (5 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 341 | `"🏢 المحافظة"` | `settings.governorate` |
| 351 | `"🏙️ المدينة"` | `settings.city` |
| 358 | `"مثال: المعادي"` | `settings.cityPlaceholder` |
| 363 | `"📝 نبذة عنك"` | `settings.bio` |
| 371 | `"اكتب نبذة قصيرة عنك..."` | `settings.bioPlaceholder` |

---

### 23. ChildSettings.tsx (5 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 104-105 | `"تم تغيير اللغة"` / `"تم التغيير إلى العربية"` (conditional) | `childSettings.languageChanged/changedToArabic` |
| 194 | `"؟"` (single character fallback) | (minor) |
| 240 | `"العربية"` | (intentional — language name) |
| 445 | `"مرحباً X 👋"` (isRTL pattern) | `childSettings.greeting` |

---

### 24. ChildGames.tsx (5 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 86 | `"جاري التحقق..."` | `childGames.verifying` |
| 155 | `"؟"` (char fallback) | (minor) |
| 161 | `"مرحباً X 👋"` (isRTL pattern) | `childGames.greeting` |
| 369 | `"نتيجتك: X من Y"` (isRTL) | `childGames.yourScore` |
| 389 | `"أكمل اللعبة للحصول على النقاط..."` (isRTL) | `childGames.completeToEarn` |

---

### 25. Home.tsx (2 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 168 | `"هيا نلعب ونتعلم! 🎮"` (fallback for `t("letsPlay")`) | Already has key — remove fallback |
| 178 | `"ابدأ اللعب! 🚀"` (fallback for `t("startPlaying")`) | Already has key — remove fallback |

---

### 26. ChildProfile.tsx (2 Arabic strings)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 105 | `"يرجى اختيار صورة فقط"` | `childProfile.imageOnlyPlease` |
| 247 | `"؟"` (char fallback) | (minor) |

---

### 27. ChildGifts.tsx (1 Arabic string)

| Line | Arabic Text | Suggested Key |
|------|------------|---------------|
| 67 | `"خطأ"` (t() fallback) | Already keyed — `errors.error` |

---

## PAGES — t() with Arabic Fallback (🟡 Medium Priority)

These files **do** use `t("key", "Arabic fallback")` but embed Arabic as the default string. The Arabic should be moved into the translation files only.

### SchoolDashboard.tsx (~200+ lines with t() fallbacks)
All Arabic is used as the second argument to `t()`. Example: `t("schoolDashboard.teacherAdded", "تمت إضافة معلم")`. Keys span `schoolDashboard.*` namespace. **Arabic must be moved to ar.json**, and a proper English translation to en.json.

### SchoolProfile.tsx (~100+ lines with t() fallbacks)
All uses `t("schoolProfile.*", "Arabic")`. Same remediation needed.

### SchoolLogin.tsx (~15 lines with t() fallbacks)
Uses `t("schoolLogin.*", "Arabic")`.

### TeacherLogin.tsx (~15 lines with t() fallbacks)
Uses `t("teacherLogin.*", "Arabic")`.

### TeacherProfile.tsx (~50 lines with t() fallbacks)
Uses `t("teacherProfile.*", "Arabic")`.

### LibraryLogin.tsx (~15 lines with t() fallbacks)
Uses `t("libraryLogin.*", "Arabic")`.

### LibraryProfile.tsx (~25 lines with t() fallbacks)
Uses `t("libraryProfile.*", "Arabic")`.

### ParentProfile.tsx (~50 lines with t() fallbacks)
Uses `t("parentProfile.*", "Arabic")`.

### Wallet.tsx (2 lines with t() fallbacks)
Lines 112 and 115 use `t("wallet.depositSuccess", "Arabic")`.

---

## PAGES — isRTL Ternary Pattern (🟠 High Priority)

### DownloadApp.tsx (~40 Arabic strings via isRTL)

Every string uses `isRTL ? "Arabic" : "English"` pattern. Must be converted to `t()`.

| Line | Arabic (isRTL) | Suggested Key |
|------|---------------|---------------|
| 14-16 | Feature titles/descriptions: `"رقابة أبوية ذكية"`, `"تطبيق سهل الاستخدام"`, `"مهام وألعاب تعليمية"` | `downloadApp.features.*` |
| 20-23 | Security badges: `"خالي من الفيروسات"`, `"بيانات مشفرة"`, `"بدون إعلانات"`, `"موثق ومعتمد"` | `downloadApp.security.*` |
| 33 | `"الرئيسية"` | `downloadApp.home` |
| 75-114 | App details: `"تحميل APK للأندرويد"`, `"مطور موثق"`, `"التطبيق آمن ومعتمد"`, `"حجم التطبيق"`, `"الإصدار"`, `"متطلبات النظام"`, `"مجاني"` | `downloadApp.app.*` |
| 123-164 | Security & ratings: `"الأمان والخصوصية"`, `"اتصال HTTPS مشفر..."`, `"لا نشارك بياناتك..."`, `"تحكم كامل للوالدين..."`, `"آمن"`, `"للأطفال والعائلات"`, `"تقييم المستخدمين"`, `"آمن ونظيف"` | `downloadApp.privacy.*` |
| 185-211 | Install guide: `"📋 طريقة التثبيت"`, step-by-step instructions, `"أو سجّل من المتصفح"` | `downloadApp.install.*` |

### AdminAuth.tsx (~10 Arabic strings via isRTL)

| Line | Arabic (isRTL) | Suggested Key |
|------|---------------|---------------|
| 56-62 | `"تم إرسال رابط الاستعادة إلى X"`, `"إذا كان الحساب موجوداً..."` | `adminAuth.recoveryLinkSent/recoveryInfo` |
| 74-124 | `"استعادة كلمة المرور"`, `"أدخل اسم المستخدم..."`, `"اسم المستخدم"`, `"جاري الإرسال..."`, `"إرسال رابط الاستعادة"`, `"العودة لتسجيل الدخول"` | `adminAuth.recovery.*` |
| 159 | `"اسم المستخدم"` placeholder | `adminAuth.usernamePlaceholder` |

---

## COMPONENTS — Fully Hardcoded (🔴 Top Offenders)

### Admin Components (client/src/components/admin/)

| File | Count | Description |
|------|-------|-------------|
| GamesTab.tsx | 128 | Game management — `"إضافة لعبة"`, `"اسم اللعبة"`, `"رابط اللعبة"`, `"تم الحفظ"`, etc. |
| SchoolsTab.tsx | 109 | School management — `"إضافة مدرسة"`, `"اسم المدرسة"`, `"المحافظة"`, etc. |
| LibrariesTab.tsx | 96 | Library management — `"إضافة مكتبة"`, `"اسم المكتبة"`, etc. |
| ProductsTab.tsx | 82 | Product management — `"المنتجات"`, `"إضافة منتج"`, `"السعر"`, etc. |
| AdsTab.tsx | 81 | Ads management — `"إضافة إعلان"`, `"عنوان الإعلان"`, etc. |
| ParentsTab.tsx | 69 | Parents management — `"الآباء"`, `"بحث"`, etc. |
| MobileAppSettingsTab.tsx | 67 | Mobile app settings — full settings UI |
| ReferralsTab.tsx | 63 | Referrals management |
| PaymentMethodsTab.tsx | 56 | Payment methods — `"إضافة وسيلة دفع"`, `"رقم الحساب"`, etc. |
| DepositsTab.tsx | 56 | Deposits management |
| TasksTab.tsx | 53 | Tasks management |
| SubjectsTab.tsx | 49 | Subjects management |
| SettingsTab.tsx | 49 | Settings management |
| NotificationSettingsTab.tsx | 37 | Notification settings |
| NotificationsTab.tsx | 34 | Notifications management |
| ProfitSystemTab.tsx | 31 | Profit system — `"نسبة الربح"`, `"العمولة"`, etc. |
| GiftsTab.tsx | 27 | Gifts management |
| SymbolsTab.tsx | 23 | Symbols/achievements |
| LegalTab.tsx | 21 | Legal settings |
| TaskNotificationLevelsTab.tsx | 15 | Task notification levels |
| CategoriesTab.tsx | 14 | Categories — `"الفئات"`, `"إضافة فئة"`, etc. |
| ChildGameManager.tsx | 8 | Child game management |
| SupportSettingsTab.tsx | 6 | Support settings |
| OTPProvidersTab.tsx | 2 | OTP providers |
| UsersTab.tsx | 1 | Users management |
| SeoSettingsTab.tsx | 1 | SEO settings |

### Form Components (client/src/components/forms/)

| File | Count | Description |
|------|-------|-------------|
| TaskForm.tsx | 31 | Task creation form — `"عنوان المهمة"`, `"الإجابات"`, `"حفظ"`, etc. |

### Child Components (client/src/components/child/)

| File | Count | Description |
|------|-------|-------------|
| FloatingBubble.tsx | 9 | `"العودة"`, `"المتجر"`, `"الألعاب"`, `"المهام"`, etc. |
| GiftNotificationPopup.tsx | 10 | `"🎁 هدية جديدة!"`, `"لقد حصلت على..."`, `"النقاط المطلوبة:"`, etc. |
| TaskCard.tsx | 4 | `"نقطة"`, `"مهمة"` |
| SponsoredTaskNotification.tsx | 4 | `"مهمة جديدة من ولي الأمر!"`, etc. |
| PointsDisplay.tsx | 2 | `"نقطة"` |
| GameCard.tsx | 2 | `"نقطة"` |

### Dashboard Components (client/src/components/dashboard/)

| File | Count | Description |
|------|-------|-------------|
| LinkChildCard.tsx | 7 | `"ربط طفل جديد"`, `"اسم الطفل"`, `"رمز PIN"`, etc. |
| QuickActions.tsx | 5 | `"إجراءات سريعة"`, `"إضافة طفل"`, etc. |
| StatsCards.tsx | 4 | `"الأطفال"`, `"النقاط"`, etc. |
| ChildrenList.tsx | 3 | `"أطفالي"`, etc. |

### Root Components (client/src/components/)

| File | Count | Description |
|------|-------|-------------|
| PhoneInput.tsx | 49 | 🟢 **LIKELY INTENTIONAL** — country names in Arabic (`nameAr` data field) |
| ChildPermissionsSetup.tsx | 14 | Uses t() with Arabic fallbacks |
| NotificationBell.tsx | 12 | `"الإشعارات"`, `"لا توجد إشعارات"`, `"تعليم الكل كمقروء"`, etc. |
| MandatoryTaskModal.tsx | 8 | `"مهمة إلزامية!"`, `"يجب إكمال هذه المهمة"`, etc. |
| OTPInput.tsx | 7 | `"إعادة الإرسال"`, `"ثانية"`, etc. |
| ErrorBoundary.tsx | 5 | `"حدث خطأ غير متوقع"`, `"إعادة المحاولة"`, etc. |
| ChildNotificationBell.tsx | 5 | `"الإشعارات"`, `"لا توجد إشعارات"` |
| PinEntry.tsx | 5 | `"إدخال رمز PIN"`, `"حذف"`, `"دخول"` |
| SlidingAdsCarousel.tsx | 4 | Slide content |
| ImageCropper.tsx | 4 | `"قص الصورة"`, `"تأكيد"`, `"إلغاء"` |
| RandomAdPopup.tsx | 3 | Ad popup content |
| SMSVerification.tsx | 3 | `"إرسال رمز التحقق"`, etc. |
| AccountNotificationBell.tsx | 3 | Notification bell |
| SocialLoginButtons.tsx | 2 | `"تسجيل الدخول بـ Google"` |

### UI Components (client/src/components/ui/)

| File | Count | Description |
|------|-------|-------------|
| ShareMenu.tsx | 12 | `"مشاركة"`, `"نسخ الرابط"`, `"واتساب"`, `"فيسبوك"`, etc. |
| ProfileHeader.tsx | 5 | Profile header text |
| FollowButton.tsx | 5 | `"متابَع"`, `"متابعة"`, etc. |
| GovernorateSelect.tsx | 1 | Single Arabic string |

### Other Components

| File | Count | Description |
|------|-------|-------------|
| LanguageSelector.tsx | 1 | `"العربية"` — 🟢 **INTENTIONAL** (language name in its own script) |
| SplashScreen.tsx | 1 | Splash content |
| OTPMethodSelector.tsx | 1 | Method selection |
| notifications/NotificationModal.tsx | 1 | Notification text |
| notifications/NotificationToast.tsx | 1 | Toast text |
| parent/ChildGamesControl.tsx | 4 | `"التحكم بالألعاب"`, etc. |

---

## Intentional / Data-Only Arabic (🟢 Skip)

These should NOT be translated — they are data or intentional:

1. **PhoneInput.tsx** — `nameAr` field contains country names in Arabic (data)
2. **LanguageSelector.tsx** — `"العربية"` is the Arabic language name displayed in its own script
3. **ChildSettings.tsx line 240** — `"العربية"` same as above

---

## Recommended Remediation Order

### Phase 1 — Highest Impact (🔴 Fully hardcoded, high-traffic pages)
1. **TeacherDashboard.tsx** — 200+ strings, zero i18n
2. **LibraryDashboard.tsx** — 96 strings, zero i18n
3. **ParentStore.tsx** — 94 strings, zero i18n
4. **ChildStore.tsx** — 53 strings, zero i18n
5. **LibraryStore.tsx** — 48 strings, zero i18n
6. **ParentDashboard.tsx** — 54 strings, mixed
7. **Wallet.tsx** — 45 strings

### Phase 2 — Medium pages
8. **SettingsPro.tsx** — 40 strings
9. **SubjectTasks.tsx** — 30 strings
10. **ParentInventory.tsx** — 28 strings
11. **PrivacyPolicy.tsx** — 25 strings (entire page)
12. **Notifications.tsx** — 20 strings
13. **ChildProgress.tsx** — 20 strings
14. **ChildNotifications.tsx** — 18 strings
15. **TaskMarketplace.tsx** — 18 strings
16. **TaskCart.tsx** — 18 strings
17. **Subjects.tsx** — 15 strings

### Phase 3 — isRTL pattern pages
18. **DownloadApp.tsx** — 40 strings (isRTL ternary)
19. **AdminAuth.tsx** — 10 strings (isRTL ternary)
20. **ChildGames.tsx** — 5 strings (isRTL)
21. **ChildSettings.tsx** — 3 strings (isRTL)

### Phase 4 — Admin components (26 files, ~1,000+ strings)
All admin tab components under `client/src/components/admin/`

### Phase 5 — t() fallback cleanup
Move Arabic fallback text from code to ar.json for:
- SchoolDashboard.tsx, SchoolProfile.tsx, SchoolLogin.tsx
- TeacherLogin.tsx, TeacherProfile.tsx
- LibraryLogin.tsx, LibraryProfile.tsx
- ParentProfile.tsx
- ChildPermissionsSetup.tsx

### Phase 6 — Small components
Remaining root, child, dashboard, form, and UI components.

---

## Key Statistics

- **Total unique files with hardcoded Arabic:** ~72
- **Pages with zero i18n:** ~15
- **Pages with partial i18n (fallback pattern):** ~12
- **Admin components with zero i18n:** 26
- **Estimated new translation keys needed:** ~1,500-2,000
- **Existing keys in en.json/ar.json:** ~300+ (covering ~30 namespaces)
