# 🔐 تقرير فحص أمان المحفظة وخطوات الشراء — Classify Platform

**التاريخ:** 2025-01-22
**النطاق:** نظام المحفظة (Wallet) + نظام الإيداع (Deposits) + نظام الشراء (Store Checkout) + نظام Stripe

---

## 📋 ملخص تنفيذي

تم فحص شامل لنظام المحفظة والشراء في المنصة. النظام يحتوي على **بنية مالية جيدة** مع نقاط قوة واضحة، لكن يوجد **عدة مخاطر أمنية** تتراوح بين متوسطة وعالية تحتاج معالجة.

### التقييم العام: 🟡 متوسط (يحتاج تحسينات)

| المجال | التقييم | الملاحظة |
|--------|---------|----------|
| حماية IDOR | 🟢 ممتاز | كل العمليات تأخذ parentId من الجلسة |
| التحقق من المدخلات | 🟡 جيد | موجود لكن غير مكتمل |
| حماية Race Condition | 🔴 ضعيف | خطر الإنفاق المزدوج موجود |
| نظام المحفظة المزدوج | 🟡 متوسط | نظامان منفصلان قد يسببان تعارض |
| Stripe Webhook | 🟢 ممتاز | Idempotent مع التحقق من التوقيع |
| Rate Limiting | 🟡 جيد | موجود على الإيداع، غائب عن Checkout |

---

## 🏗️ هيكل النظام المالي

### نظامان للمحفظة (⚠️ مخاطرة)

المنصة تحتوي على **نظامين منفصلين** للمحفظة:

#### النظام 1: `parentWallet` (النظام الأساسي — مستخدم فعلياً)
- **الجداول:** `parent_wallet` + `deposits`
- **الاستخدام:** إيداع يدوي ← موافقة أدمن ← رصيد ← شراء من المتجر + إرسال مهام
- **الملفات:** `server/routes/parent.ts`, `server/routes/store.ts`, `server/routes/admin.ts`

#### النظام 2: `wallets` + `walletTransfers` (نظام Stripe/Phase 2)
- **الجداول:** `wallets` + `wallet_transfers` (دفتر أستاذ)
- **الاستخدام:** Stripe webhook payments ← wallet top-up ← entitlements
- **الملفات:** `server/routes/payments.ts`, `server/utils/walletHelper.ts`

**المخاطرة:** النظامان يعملان بشكل مستقل تماماً. إيداع عبر النظام 1 لا ينعكس في النظام 2 والعكس. هذا قد يسبب ارتباك في الأرصدة عند تفعيل Stripe.

---

## 🔄 خطوات الشراء (Purchase Flow)

### المسار 1: الشراء بالمحفظة (Wallet Payment)

```
الوالد → يضيف منتجات للسلة → POST /api/store/checkout
  ├── التحقق من المنتجات والمخزون
  ├── حساب المبلغ الإجمالي
  ├── فحص رصيد المحفظة (parentWallet)
  └── [DB Transaction]:
      ├── خصم من parentWallet.balance
      ├── إنشاء parentPurchases
      ├── إنشاء parentPurchaseItems
      ├── تقليل المخزون
      ├── إنشاء parentOwnedProducts (status: "active")
      └── [إذا منتج مكتبة]: إنشاء libraryOrders + حساب العمولة
```

### المسار 2: الشراء بطريقة دفع أخرى (Manual Payment)

```
الوالد → checkout مع paymentMethodId ≠ "wallet"
  └── [DB Transaction]:
      ├── لا يتم خصم من المحفظة
      ├── إنشاء parentPurchases (status: "pending")
      ├── إنشاء parentOwnedProducts (status: "pending_admin_approval")
      └── الأدمن يوافق لاحقاً
```

### المسار 3: الشراء عبر Stripe

```
الوالد → Stripe Checkout Session
  ├── stripe.webhooks.constructEvent (التحقق من التوقيع)
  ├── تسجيل webhook event مع dedupe
  ├── checkout.session.completed:
  │   ├── upsertTransaction (idempotent)
  │   ├── تحديث storeOrders → "PAID"
  │   └── fulfillOrder:
  │       ├── wallet_topup → walletTransfers + recalcBalance
  │       └── أخرى → entitlements
  └── charge.refunded:
      ├── إنشاء refund record
      ├── حذف entitlements
      └── عكس walletTransfer (سالب)
```

### المسار 4: إيداع في المحفظة (Deposit Flow)

```
الوالد → يختار طريقة دفع → يدخل المبلغ + رقم التحويل + إيصال
  ├── POST /api/parent/deposit
  │   ├── التحقق: المبلغ > 0 و ≤ 100,000
  │   ├── التحقق: رقم التحويل 4-120 حرف
  │   ├── التحقق: URL الإيصال صالح
  │   ├── Rate limit: max 5 طلبات معلقة
  │   ├── إنشاء deposit (status: "pending")
  │   └── إشعار للأدمن
  └── الأدمن → PUT /api/admin/deposits/:id
      ├── status = "completed" → إضافة للرصيد
      └── status = "cancelled" → إشعار رفض
```

---

## 🚨 الثغرات الأمنية المكتشفة

### 🔴 عالية الخطورة

#### 1. Race Condition في Checkout — الإنفاق المزدوج (Double-Spend)

**الملف:** `server/routes/store.ts` سطر 380-393
**الوصف:** فحص الرصيد يتم **خارج** الـ transaction:

```typescript
// سطر 380: الفحص خارج الـ transaction
if (paymentMethodId === "wallet") {
  const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
  if (!wallet[0] || parseFloat(wallet[0].balance) < computedTotal) {
    return res.status(400).json({ message: "Insufficient wallet balance" });
  }
}

// سطر 393: الخصم داخل الـ transaction
const [purchase] = await db.transaction(async (tx) => {
  if (paymentMethodId === "wallet") {
    await tx.update(parentWallet).set({
      balance: sql`${parentWallet.balance} - ${computedTotal}`,
      ...
```

**المخاطرة:** إذا أرسل المستخدم طلبين checkout في نفس الوقت، كلاهما يمر من فحص الرصيد قبل أن يخصم أي منهما. النتيجة: رصيد سالب.

**الإصلاح المقترح:**
```typescript
const [purchase] = await db.transaction(async (tx) => {
  if (paymentMethodId === "wallet") {
    // فحص + خصم داخل الـ transaction مع SELECT FOR UPDATE
    const [wallet] = await tx
      .select()
      .from(parentWallet)
      .where(eq(parentWallet.parentId, parentId))
      .for('update'); // قفل الصف
    
    if (!wallet || parseFloat(wallet.balance) < computedTotal) {
      throw new Error("Insufficient wallet balance");
    }
    
    await tx.update(parentWallet).set({
      balance: sql`${parentWallet.balance} - ${computedTotal}`,
      ...
    });
  }
  ...
});
```

#### 2. Race Condition في إنشاء المهام

**الملف:** `server/routes/parent.ts` سطر 669-690
**الوصف:** نفس المشكلة — فحص الرصيد في سطر 670 خارج الـ transaction، والخصم في سطر 684 داخله.

```typescript
// سطر 670: خارج الـ transaction
const wallet = await db.select().from(parentWallet).where(...);
const currentBalance = Number(wallet[0]?.balance || 0);
if (currentBalance < pointsReward) { ... }

// سطر 683: داخل الـ transaction
const result = await db.transaction(async (tx) => {
  await tx.update(parentWallet).set({
    balance: sql`${parentWallet.balance} - ${pointsReward}`,
```

**المخاطرة:** نفس مشكلة الإنفاق المزدوج. يمكن إنشاء مهام بأكثر من الرصيد المتاح.

#### 3. لا يوجد CHECK CONSTRAINT على الرصيد

**الملف:** `shared/schema.ts` سطر 576
**الوصف:** عمود `balance` في `parentWallet` لا يحتوي على `CHECK (balance >= 0)`. هذا يعني أن قاعدة البيانات تسمح بأرصدة سالبة.

**الإصلاح:** إضافة constraint على مستوى قاعدة البيانات:
```sql
ALTER TABLE parent_wallet ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);
```

---

### 🟡 متوسطة الخطورة

#### 4. Admin Manual Deposit بدون حد أقصى

**الملف:** `server/routes/admin.ts` سطر 1887
**الوصف:** الأدمن يمكنه إضافة أي مبلغ بدون حد أقصى:
```typescript
if (!amount || amount <= 0) {
  return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Valid amount is required"));
}
// لا يوجد: if (amount > MAX_ADMIN_DEPOSIT)
```
**المخاطرة:** خطأ بشري (إضافة مليون بدلاً من ألف) أو اختراق حساب أدمن.

#### 5. Admin Manual Deposit بدون Transaction

**الملف:** `server/routes/admin.ts` سطر 1893-1907
**الوصف:** عملية القراءة والكتابة ليست في transaction واحد:
```typescript
const wallet = await db.select().from(parentWallet)...; // قراءة
if (!wallet[0]) {
  await db.insert(parentWallet)...; // كتابة 1
} else {
  const newBalance = parseFloat(wallet[0].balance) + amount; // حساب في JS
  await db.update(parentWallet).set({ balance: newBalance.toString() })...; // كتابة 2
}
```
**المخاطرة:** 
- Race condition بين القراءة والكتابة
- الحساب في JavaScript بدلاً من SQL (خطر فقدان دقة عشرية)

#### 6. لا يوجد Rate Limiter مخصص لـ Checkout

**الملف:** `server/routes/store.ts`
**الوصف:** يوجد rate limiter عام على كل `/api/*` لكن لا يوجد حد مخصص لعمليات الشراء.
**المخاطرة:** هجوم brute force على Checkout endpoint.

#### 7. حقل `notes` بدون حد طول

**الملف:** `server/routes/parent.ts` سطر 907
**الوصف:** `notes: notes || null` — لا يوجد تحقق من طول النص.
**المخاطرة:** يمكن إرسال نص ضخم جداً → استهلاك مساحة قاعدة البيانات.

#### 8. تسجيل بيانات حساسة في الإشعارات

**الملف:** `server/routes/parent.ts` سطر 918-926
**الوصف:** إشعار الأدمن يحتوي على `transactionId` في نص الرسالة وفي `metadata`:
```typescript
message: `${parentName} طلب إيداع $${amount} عبر ${method[0].type} (Ref: ${normalizedTransactionId})`
metadata: { depositId: result[0].id, parentId: req.user.userId, amount, transactionId: normalizedTransactionId }
```
**المخاطرة:** إذا تسربت الإشعارات، يتسرب رقم التحويل المصرفي.

---

### 🟢 منخفضة الخطورة

#### 9. كشف طرق الدفع بدون تسجيل دخول

**الملف:** `server/routes/store.ts` سطر 56
**الوصف:** `GET /api/public/payment-methods` يكشف أرقام الحسابات البنكية وأسماء أصحابها بدون مصادقة.
**المقصود:** عرض طرق الدفع للزوار قبل التسجيل.
**ملاحظة:** هذا قد يكون مقبول من ناحية تجارية لكنه يكشف بيانات مالية.

#### 10. Invoice Number يعتمد على Timestamp

**الملف:** `server/routes/store.ts` سطر 412
```typescript
invoiceNumber: `INV-${Date.now()}`
```
**المخاطرة:** ليس فريداً بنسبة 100% (طلبان في نفس الميلي ثانية)، وقابل للتوقع.

#### 11. لا يوجد حماية Idempotency على إنشاء الإيداع

**الملف:** `server/routes/parent.ts` سطر 842
**الوصف:** نفس الوالد يمكنه إرسال طلبات إيداع متعددة بنفس `transactionId`. الحماية الوحيدة هي حد 5 طلبات معلقة.

---

## ✅ نقاط القوة

### 1. حماية IDOR ممتازة
كل عمليات المحفظة تأخذ `parentId` من `req.user.userId` (الجلسة) وليس من المستخدم:
- `GET /api/parent/wallet` → `req.user.userId` ✅
- `POST /api/parent/deposit` → `req.user.userId` ✅
- `GET /api/parent/deposits` → `req.user.userId` ✅
- `POST /api/store/checkout` → `req.user?.parentId || req.user?.userId` ✅

### 2. Stripe Webhook آمن
- التحقق من توقيع Stripe (`constructEvent`) ✅
- Idempotent: يفحص وجود transaction/transfer قبل الإنشاء ✅
- Dedupe عبر `webhookEvents.dedupeKey` ✅
- يرد 200 فوراً قبل المعالجة ✅
- عكس العمليات عند الاسترجاع (Refund) ✅

### 3. التحقق من المدخلات على الإيداع
- المبلغ: `> 0` و `≤ 100,000` ✅
- رقم التحويل: مطلوب، 4-120 حرف ✅
- URL الإيصال: يجب أن يكون `http` أو `https` ✅
- طريقة الدفع: يتحقق أنها موجودة ونشطة ومنشأة من الأدمن ✅

### 4. Rate Limiting على الإيداع
- حد 5 طلبات إيداع معلقة لكل والد ✅
- Global rate limiter على كل `/api/*` ✅

### 5. عمليات Checkout في Transaction
- خصم الرصيد + إنشاء الطلب + تقليل المخزون كلها في `db.transaction()` ✅

### 6. حماية الموافقة المكررة
- الأدمن لا يمكنه الموافقة على إيداع مرتين:
```typescript
if (deposit.status === "completed" && status === "completed") {
  return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Deposit already completed"));
}
```

### 7. Cascade Delete صحيح
- حذف الوالد → حذف المحفظة والإيداعات تلقائياً ✅

---

## 📊 جدول ملخص الثغرات

| # | الثغرة | الخطورة | الملف | السطر | الحالة |
|---|--------|---------|-------|-------|--------|
| 1 | Race Condition في Checkout | 🔴 عالية | store.ts | 380-393 | ✅ تم الإصلاح |
| 2 | Race Condition في إنشاء المهام | 🔴 عالية | parent.ts | 669-690 | ✅ تم الإصلاح |
| 3 | لا CHECK CONSTRAINT على الرصيد | 🔴 عالية | schema.ts | 576 | ✅ تم الإصلاح (migration) |
| 4 | Admin Deposit بدون حد أقصى | 🟡 متوسطة | admin.ts | 1887 | ✅ تم الإصلاح (1M cap) |
| 5 | Admin Deposit بدون Transaction | 🟡 متوسطة | admin.ts | 1893 | ✅ تم الإصلاح |
| 6 | لا Rate Limiter على Checkout | 🟡 متوسطة | store.ts | 270 | ✅ تم الإصلاح (10/min) |
| 7 | حقل notes بدون حد طول | 🟡 متوسطة | parent.ts | 907 | ✅ تم الإصلاح (500 char) |
| 8 | transactionId في الإشعارات | 🟡 متوسطة | parent.ts | 918 | ✅ تم الإصلاح (masked) |
| 9 | طرق الدفع مكشوفة للزوار | 🟢 منخفضة | store.ts | 56 | قرار تجاري |
| 10 | Invoice Number غير فريد | 🟢 منخفضة | store.ts | 412 | ✅ تم الإصلاح (random suffix) |
| 11 | لا Idempotency على الإيداع | 🟢 منخفضة | parent.ts | 842 | ✅ تم الإصلاح (duplicate check) |

---

## 🛠️ خطة الإصلاح المقترحة (حسب الأولوية)

### المرحلة 1 — حرجة (فوري)
1. نقل فحص الرصيد داخل الـ transaction في Checkout و Task Creation
2. إضافة `SELECT FOR UPDATE` على صف المحفظة
3. إضافة CHECK CONSTRAINT على `balance >= 0`

### المرحلة 2 — مهمة (خلال أسبوع)
4. إضافة حد أقصى للـ Admin Manual Deposit (مثلاً 1,000,000)
5. تحويل Admin Manual Deposit لاستخدام `db.transaction()` مع `sql` expressions
6. إضافة rate limiter مخصص لـ Checkout (مثلاً 10 طلبات/دقيقة)
7. إضافة حد طول لـ `notes` (مثلاً 500 حرف)

### المرحلة 3 — تحسينات (خلال شهر)
8. توحيد نظام المحفظة (`parentWallet` + `wallets`) أو توثيق الاستخدام بوضوح
9. استخدام UUID v4 لـ Invoice Number
10. إضافة unique constraint على `(parentId, transactionId)` في `deposits`

---

**انتهى التقرير** — تم فحص الملفات: `schema.ts`, `store.ts`, `payments.ts`, `parent.ts`, `admin.ts`, `teacher.ts`, `walletHelper.ts`
