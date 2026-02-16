# ⚡ CLASSIFY Quick Reference Guide
**For Developers & Contributors**

---

## 🎯 Most Common Tasks

### 1. 🔑 Updating Admin Credentials (After deployment)

**Problem:** Changed ADMIN_EMAIL/ADMIN_PASSWORD in .env but login still fails?

**Solution:**
```bash
# 1. Edit .env file with new credentials
nano .env
# Update: ADMIN_EMAIL and ADMIN_PASSWORD

# 2. Sync to database
npm run admin:setup

# 3. Verify in logs
# Should see: ✓ Admin credentials updated successfully

# For Docker production:
docker-compose exec app npm run admin:setup
```

**Why needed:** Backend reads .env on startup only. Database keeps the persistent values. Script syncs them.

---

### 2. 🧑‍👩‍👧 Adding a New Child to Parent Account

**API Flow:**
```bash
# Parent creates new child
curl -X POST http://localhost:5000/api/family/children \
  -H "Authorization: Bearer <parentToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد",
    "birthday": "2015-05-20",
    "schoolName": "مدرسة النور"
  }'

# Response:
{
  "success": true,
  "data": {
    "id": "child-uuid",
    "name": "أحمد",
    "totalPoints": 0,
    "uniqueCode": "ABC123DEF456"
  }
}
```

**Via UI:**
1. Login as parent
2. Go to "My Children"
3. Click "Add Child"
4. Fill form → Save
5. Child account created instantly

---

### 3. 📝 Creating a Task & Assigning to Child

**API Flow:**
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer <parentToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "child-uuid",
    "question": "ما عاصمة السعودية؟",
    "answers": [
      {"id": "1", "text": "الرياض", "isCorrect": true},
      {"id": "2", "text": "جدة", "isCorrect": false},
      {"id": "3", "text": "الدمام", "isCorrect": false}
    ],
    "pointsReward": 10,
    "subjectId": "subject-uuid" (optional)
  }'

# Response:
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "pending",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

**Child solves task:**
```bash
curl -X POST http://localhost:5000/api/tasks/task-uuid/submit \
  -H "Authorization: Bearer <childToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "child-uuid",
    "selectedAnswerId": "1"
  }'

# Response:
{
  "success": true,
  "data": {
    "isCorrect": true,
    "pointsEarned": 10,
    "newTotalPoints": 10
  }
}
```

---

### 4. 🎁 Sending a Gift to Child

**Step 1: Parent sends gift**
```bash
curl -X POST http://localhost:5000/api/gifts \
  -H "Authorization: Bearer <parentToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "child-uuid",
    "productId": "product-uuid",
    "pointsThreshold": 1000,
    "message": "هدية أحمد لأداؤك الممتاز!"
  }'

# Response:
{
  "success": true,
  "data": {
    "id": "gift-uuid",
    "status": "SENT",
    "pointsThreshold": 1000
  }
}
```

**Step 2: Child earns points**
- Child completes tasks → earns points → reaches 1000 points
- Notification slides: "🎁 تم فتح هدية!"
- Gift status changes to "UNLOCKED"

**Step 3: Child activates gift**
```bash
curl -X POST http://localhost:5000/api/gifts/gift-uuid/activate \
  -H "Authorization: Bearer <childToken>"

# Response:
{
  "success": true,
  "data": {
    "status": "ACTIVATED",
    "productAccess": "granted"
  }
}
```

---

### 5. 💳 Creating an Order (Parent buys product for store)

**Step 1: Create order**
```bash
curl -X POST http://localhost:5000/api/store/orders \
  -H "Authorization: Bearer <parentToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid",
        "quantity": 1
      }
    ],
    "shippingAddressId": "address-uuid" (if physical product)
  }'

# Response:
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "status": "PENDING",
    "totalAmount": 99.99,
    "paymentUrl": "https://checkout.stripe.com/pay/cs_..." (if payment needed)
  }
}
```

**Step 2: Payment (for currency, not points)**
```bash
# User redirected to Stripe
# After successful payment:
# - Webhook received: POST /api/webhooks/stripe
# - Order status → "PAID"
# - Product access granted
# - Child notification sent
```

---

### 6. 🏪 Library Commerce Lifecycle (End-to-End)

**Scenario:** Parent buys from library → Admin confirms → Library ships → Delivery code verification → 15-day hold → Withdrawal request.

```bash
# 1) Library login
curl -X POST http://localhost:5000/api/library/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alnoor_library",
    "password": "secure123"
  }'

# 2) Parent checkout from store (library product included)
curl -X POST http://localhost:5000/api/store/checkout \
  -H "Authorization: Bearer <parentToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{ "productId": "library-product-id", "quantity": 1 }],
    "paymentMethodId": "wallet",
    "shippingAddress": {
      "name": "Parent Name",
      "line1": "Street 1",
      "city": "Cairo",
      "state": "Nasr City",
      "postalCode": "11765",
      "country": "EG"
    }
  }'

# 3) Admin sees and confirms library order
curl http://localhost:5000/api/admin/library-orders \
  -H "Authorization: Bearer <adminToken>"

curl -X PUT http://localhost:5000/api/admin/library-orders/<orderId>/confirm \
  -H "Authorization: Bearer <adminToken>"

# 4) Library ships order (generates delivery code)
curl -X PUT http://localhost:5000/api/library/orders/<orderId>/ship \
  -H "Authorization: Bearer <libraryToken>"

# 5) Library verifies delivery using buyer code
curl -X POST http://localhost:5000/api/library/orders/<orderId>/verify-delivery \
  -H "Authorization: Bearer <libraryToken>" \
  -H "Content-Type: application/json" \
  -d '{ "code": "123456" }'

# 6) Balance after hold period settlement
curl http://localhost:5000/api/library/balance \
  -H "Authorization: Bearer <libraryToken>"

# 7) Library creates withdrawal request
curl -X POST http://localhost:5000/api/library/withdrawals \
  -H "Authorization: Bearer <libraryToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100.00",
    "paymentMethod": "bank_transfer",
    "paymentDetails": { "iban": "EG00XXXX" }
  }'

# 8) Admin reviews withdrawals
curl http://localhost:5000/api/admin/library-withdrawals \
  -H "Authorization: Bearer <adminToken>"

curl -X PUT http://localhost:5000/api/admin/library-withdrawals/<withdrawalId>/approve \
  -H "Authorization: Bearer <adminToken>"
```

**Order Status Flow:**
- `pending_admin` → `admin_confirmed` → `shipped` → `delivered` → `completed`

**Financial Notes:**
- Commission is deducted at order level (`commissionAmount`).
- Library net earnings go to pending balance after delivery verification.
- Release to available balance happens after consumer-protection hold (`holdDays`, default 15).

**Operational Endpoints:**
- Library: `/api/library/orders`, `/api/library/balance`, `/api/library/withdrawals`, `/api/library/invoices/daily`
- Admin: `/api/admin/library-orders`, `/api/admin/library-withdrawals`

---

### 7. 👤 Admin Controls (Super Admin only)

**Suspend problematic parent:**
```bash
curl -X POST http://localhost:5000/api/admin/parents/parent-uuid/suspend \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Suspicious payment activity"
  }'

# Result: Parent account frozen, cannot login
```

**Adjust child points (for corrections):**
```bash
curl -X POST http://localhost:5000/api/admin/children/child-uuid/adjust-points \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "delta": 100,
    "reason": "Correction for system error"
  }'

# Result: Points added/subtracted, logged to activity_log
```

**View activity log:**
```bash
curl "http://localhost:5000/api/admin/activity-log?entity=PRODUCT&limit=100" \
  -H "Authorization: Bearer <adminToken>"

# Response shows: All product creates/updates/deletes by admins
```

---

## 🐛 Debugging Common Issues

### ❌ "Invalid credentials" on login
**Cause:** Password mismatch between .env and database  
**Fix:**
```bash
npm run admin:setup
# Then test login
```

### ❌ "Unauthorized" on child API
**Cause:** Child token doesn't have parentId matching  
**Check:** Token payload should have childId, not parentId
**Debug:** Add logging to middleware

### ❌ OTP code not sent
**Check:**
```bash
# 1. Is RESEND_API_KEY set?
echo $RESEND_API_KEY

# 2. Is email domain correct?
# Should be: from@resend.dev

# 3. Check logs:
docker-compose logs classiv3-app | grep OTP

# 4. Test directly:
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### ❌ Database migration failed
**Issue:** Schema changed but database not updated
```bash
# Push schema to database:
npm run db:push

# Check migration status:
npm run db:migrations

# If stuck, check raw SQL in /migrations folder
```

### ❌ Stripe webhook not working
**Check:**
```bash
# 1. Is webhook signed correctly?
# Stripe signature must match STRIPE_WEBHOOK_SECRET

# 2. Is endpoint URL correct?
# Should be: https://your-domain/api/webhooks/stripe

# 3. Check Stripe dashboard:
# https://dashboard.stripe.com/webhooks
```

---

## 📊 Quick Database Queries

### View all parents
```sql
SELECT id, email, name, created_at FROM parents LIMIT 10;
```

### View children of specific parent
```sql
SELECT c.id, c.name, c.total_points 
FROM children c
JOIN parent_child pc ON c.id = pc.child_id
WHERE pc.parent_id = '<parent-uuid>';
```

### Find tasks for child
```sql
SELECT id, question, status, points_reward 
FROM tasks 
WHERE child_id = '<child-uuid>'
ORDER BY created_at DESC;
```

### Check OTP attempts
```sql
SELECT destination, attempts, status, created_at 
FROM otp_codes 
WHERE purpose = 'login' AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### View failed payments
```sql
SELECT * FROM transactions 
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days';
```

### See admin activity
```sql
SELECT action, entity, entity_id, admin_id, created_at 
FROM activity_log 
ORDER BY created_at DESC LIMIT 20;
```

---

## 🚀 Performance Tips

### Cache Warm-up
```bash
# After deployment, warm up Redis:
curl http://localhost:5000/api/health/deep

# Checks database, Redis, storage connections
```

### Database Query Optimization
- Always filter by `parentId` first (indexed)
- Use `status IN (...)` instead of multiple queries
- Limit results: `LIMIT 50` for UI, `LIMIT 10` for exports
- Use indexes on: `(parentId, childId)`, `(child_id, created_at)`

### Frontend Performance
- Use React Query for caching: `staleTime: 5 * 60 * 1000` (5 min)
- Lazy load images: `loading="lazy"`
- Code split on routes: `React.lazy()`

---

## 📱 Testing Flows

### Test Parent Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newparent@test.com",
    "password": "Test123456!",
    "name": "أم الاختبار"
  }'
```

### Test 2FA Flow
```bash
# 1. Request OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "parent@example.com", "purpose": "login"}'

# 2. Wait for email (check Mailhog at localhost:8025)

# 3. Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "parent@example.com", "code": "123456", "purpose": "login"}'
```

### Test Stripe Payment Webhook
```bash
# In development, use Stripe CLI:
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Then trigger test event:
stripe trigger payment_intent.succeeded
```

---

## 📚 File Locations Reference

| Task | File |
|------|------|
| Add API endpoint | `server/routes/*.ts` |
| Modify database schema | `shared/schema.ts` |
| Update admin settings | `server/routes/admin.ts` |
| Change UI component | `client/src/components/*.tsx` |
| Run migrations | `migrations/` folder |
| Environment config | `.env` file |
| Admin credentials script | `scripts/manage-admin.js` |
| Email templates | `server/services/mailer.ts` |
| Error handling | `server/middleware.ts` |

---

## 🔄 Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-feature-name

# 2. Make changes
# ... edit files ...

# 3. Commit with good message
git commit -m "feat: add feature xyz - description"

# 4. Push to GitHub
git push origin feature/add-feature-name

# 5. Create Pull Request
# Go to GitHub → New PR

# 6. After review, merge to main
git checkout main
git pull
git merge feature/add-feature-name

# 7. Deploy
npm run build
docker-compose up -d
```

---

## 💡 Pro Tips

1. **Always use JWT middleware on protected routes** - Prevents unauthorized access
2. **Validate parent-child ownership** - Before returning any child data
3. **Hash sensitive data** - Passwords, tokens should never be plaintext
4. **Use parameterized queries** - Drizzle ORM does this automatically
5. **Log important actions** - Account suspensions, large transactions, admin actions
6. **Set rate limits** - On auth endpoints especially
7. **Test with Postman** - Before building UI
8. **Check browser DevTools** - Network tab shows all API calls
9. **Use Docker for consistency** - Dev environment matches production
10. **Keep secrets in .env** - Never commit API keys to Git

---

**Last Updated:** January 2025  
**Version:** 1.0
