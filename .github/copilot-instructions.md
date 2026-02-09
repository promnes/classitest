# Copilot / AI Agent Instructions — **STRICT MODE**

**Project:** Classify — Kids Educational & Parental Control Platform
**Stack:** Express.js (Node 18+), React + Vite, PostgreSQL 14+, Drizzle ORM
**Audience:** AI agents only (Human contributors may reference)
**Authority Level:** 🔴 MAXIMUM (Violations invalidate all output)

---

## ⛔ ZERO-TOLERANCE DIRECTIVE

This document is **LAW**, not guidance.

If any rule below is violated, the work is considered **FAILED**, even if the code "works".

### Absolute Prohibitions
ش
* ❌ NO assumptions
* ❌ NO guessing
* ❌ NO repeated explanations
* ❌ NO restating documentation in chat
* ❌ NO leaving test artifacts behind
* ❌ NO partial verification

### Mandatory Behavior

* ✅ Update documentation files instead of explaining
* ✅ Execute real tests
* ✅ Preserve test evidence temporarily
* ✅ Remove all test tools and artifacts after success
* ✅ Leave the repository in a **clean production state**

---

## 🧠 Cognitive Discipline Rules (ANTI-AI-HALLUCINATION)

The agent **MUST** operate under these constraints:

### 🔴 Mandatory File Reading Before ANY Response

**Before writing a single word in chat or code**, the agent MUST:

1. Enumerate the files relevant to the task
2. Open and READ them fully
3. Build an internal mental model from real code

**CRITICAL FILES BY DOMAIN:**

Authentication:
- `server/routes/auth.ts` - Auth endpoints & OTP logic
- `server/services/mailer.ts` - Email/OTP delivery

Family Structure:
- `shared/schema.ts` - parents, children, parentChild tables
- `server/routes/family.ts` - Family management endpoints

Notifications:
- `server/notificationHandlers.ts` - Gift event handlers
- `server/services/mailer.ts` - Notification templates

Payments:
- `server/routes/payments.ts` - Stripe webhook handling
- `shared/schema.ts` - Payment and transaction tables

If a file exists and is relevant but NOT read → **IMMEDIATE FAILURE**.

The agent is **FORBIDDEN** from responding based on:

* Prior knowledge
* Similar projects
* Training data patterns

Only the current repository is authoritative.

---

### Evidence Enforcement Rules

1. If a file exists → **READ IT**
2. If behavior is unclear → **TRACE IT**
3. If a claim is made → **PROVE IT**
4. If proof is missing → **STOP**

Any output without evidence is invalid.

---

## 📁 SINGLE SOURCE OF TRUTH

| Domain        | Authority             |
| ------------- | --------------------- |
| Code behavior | Source code           |
| API format    | Existing responses    |
| DB structure  | `shared/schema.ts`    |
| Build output  | Real `dist/` contents |
| Runtime       | `node dist/index.js`  |
| Email/OTP     | `server/services/mailer.ts` |
| Notifications | `server/notificationHandlers.ts` |
| Auth routes   | `server/routes/auth.ts` |
| Parent-child  | `shared/schema.ts` (parentChild table) |

Chat text is **NOT** a source of truth.

---

## 📡 API CONTRACT (IMMUTABLE)

### Success Response

```json
{ "success": true, "data": {}, "message": "Optional" }
```

### Error Response

```json
{ "success": false, "error": "ERROR_CODE", "message": "Human readable" }
```

### Common Error Codes
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - User not authenticated or permission denied
- `BAD_REQUEST` - Invalid input
- `INTERNAL_SERVER_ERROR` - Server error
- `PARENT_CHILD_MISMATCH` - Parent doesn't own this child
- `OTP_EXPIRED` - OTP code expired or invalid
- `RATE_LIMITED` - Too many requests

### API Endpoints (Confirm in server/routes/*)

**Authentication**:
- `POST /api/auth/register` - Create parent account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/request-otp` - Request OTP code
- `POST /api/auth/verify-otp` - Verify OTP and complete 2FA
- `POST /api/auth/logout` - Logout

**Family Management**:
- `GET /api/family/children` - List user's children
- `POST /api/family/children` - Add new child
- `PUT /api/family/children/:id` - Update child
- `DELETE /api/family/children/:id` - Delete child

**Notifications**:
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/:id` - Mark read
- `DELETE /api/notifications/:id` - Delete

**Gifts/Rewards**:
- `POST /api/gifts` - Send gift to child
- `GET /api/gifts/:childId` - Get child's gifts

**Health**:
- `GET /api/health` - Health check (returns 200 if ok)

Changing this format is a **CRITICAL VIOLATION**.

---

## 🧪 MANDATORY MULTI-PHASE VERIFICATION PIPELINE

### 🔹 Phase 0 — Repository Intelligence Scan (REQUIRED)

**Objective:** Understand reality, not intention.

Steps (ALL REQUIRED):

* Read:

  * `server/index.ts`
  * `server/vite.ts`
  * `vite.config.ts`
  * `shared/schema.ts`
  * Deployment files (Docker / PM2 / VPS)
* Identify and record:

  * Backend entry
  * Frontend build output
  * Static serving strategy
  * Runtime port

📌 Output MUST be written to:

```
/docs/_ai-temp/phase0-scan.md
```

---

### 🔹 Phase 1 — Controlled Change Implementation

Rules:

* Touch **only** files required for the task
* No refactors unless explicitly authorized
* No duplicated logic
* No explanatory comments beyond necessity

If documentation is affected → **UPDATE THE DOC FILE**, do not explain in chat.

---

### 🔹 Phase 2 — Instrumented Testing (REQUIRED)

The agent MUST:

* Create **temporary** test instruments
* Use:

  * curl
  * node scripts
  * DB queries (via Drizzle only)

All results MUST be recorded verbatim in:

```
/docs/_ai-temp/phase2-test-results.md
```

Examples:

```bash
curl -i http://127.0.0.1:5000/api/health
node dist/index.js
```

Screenshots, guesses, or summaries are NOT allowed.

---

### 🔹 Phase 3 — Cross-Dependency Validation

The agent MUST confirm:

* No existing endpoint behavior changed
* No auth scope escalation
* No static asset regression

Evidence MUST be appended to:

```
/docs/_ai-temp/phase3-regression-check.md
```

---

### 🔹 Phase 4 — Cleanup & Evidence Destruction

After ALL phases succeed:

The agent MUST:

* Delete `/docs/_ai-temp/`
* Remove:

  * test routes
  * debug logs
  * temp scripts
* Confirm repository state equals **pure production**

Failure to clean = **FAILURE**

---

## 🗂️ TEMPORARY EVIDENCE RULE

* Test evidence is **mandatory**
* Evidence lifespan: **ONLY during active task**
* Evidence is used as internal reference ONLY
* Evidence MUST be destroyed at completion

Persistent test artifacts are forbidden.

---

## 🔐 SECURITY ABSOLUTES

* Child tokens: **read / ack only** (no write permissions)
* Parent-child ownership ALWAYS validated before any child operation:
  ```typescript
  // Pattern: Check parentId === req.user.id before accessing child
  const parentChild = await db.query.parentChild.findFirst({
    where: and(
      eq(parentChild.parentId, req.user.id),
      eq(parentChild.childId, childId)
    )
  });
  if (!parentChild) throw new UnauthorizedError("Not authorized");
  ```
* Parent-child deletion: Cascade delete configured in schema (onDelete: "cascade")
* Rate limiting REQUIRED on auth flows:
  - OTP requests: 5 per hour per email (env: OTP_RATE_LIMIT_PER_HOUR)
  - Login attempts: Standard express-rate-limit on /api/auth/login
  - Register: Rate limited per IP
* No secrets in logs or responses:
  - ✅ OTP codes returned in development only
  - ✅ JWT tokens not logged
  - ✅ Passwords never logged
  - ✅ SMTP credentials only in errors for debugging
* SMS/Email verification:
  - SMS: Track smsVerified flag in parents table
  - Email: Implicit (email used as username = verified)
* 2FA enforcement:
  - twoFAEnabled flag in parents table
  - OTP required on login if enabled

Any relaxation requires explicit written authorization.

---

## 🧱 BUILD vs RUNTIME LAW (NON-NEGOTIABLE)

* Build tools (Vite, TS, esbuild) = DEV ONLY
* Production runtime:

```bash
node dist/index.js
```

If build tools are required at runtime → **CRITICAL FAILURE**.

---

## 🚀 DEPLOYMENT INVARIANTS

### Build & Runtime
* Frontend build: `vite build` → `dist/public/`
* Backend build: `esbuild` → `dist/index.js` (esm format, node platform)
* Production runtime: `NODE_ENV=production node dist/index.js`
* Port: 5000 (via `process.env.PORT`)

### Static Asset Serving (Express)
* Static directory: `path.resolve(process.cwd(), "dist", "public")`
* Served by middleware in `server/index.ts` (development) or via Nginx (production)

### SPA Fallback Rules
* SPA fallback MUST NOT intercept:
  * `/api/*` - All API routes
  * `/assets/*` - Built assets
  * `/sw.js` - Service worker
  * `/manifest.json` - PWA manifest
* Fallback configured in: `server/vite.ts` (development) or Nginx (production)

### Security Headers (Helmet)
* CSP: defaults false, custom directives configured
* Cross-origin: cross-origin policy enabled
* Trust proxy: 1 (for Nginx behind)

### CORS Configuration
* Access-Control-Allow-Origin: `*` (currently open)
* Allowed methods: GET, POST, PUT, DELETE, OPTIONS
* Allowed headers: Content-Type, Authorization

---

## 🧾 FAILURE HANDLING

If ANY phase fails:

* STOP execution
* Do NOT attempt workaround
* Report:

  * File
  * Line
  * Exact failure output

Silently continuing is forbidden.

---

## 🏁 FINAL COMPLETION CHECKLIST (ALL REQUIRED)

* [ ] App boots via `node dist/index.js`
* [ ] Health endpoint returns 200: `GET /api/health`
* [ ] All assets return 200: `GET /index.html`, `GET /assets/*`
* [ ] No temp files exist: Check `/docs/_ai-temp/` is empty/deleted
* [ ] No debug code remains: No console.log (except structured logging)
* [ ] Docs updated if behavior changed
* [ ] API contract verified: `{"success": true/false, "data": {...}, "error": "CODE"}`
* [ ] Parent-child relationships validated on protected endpoints
* [ ] OTP delivery tested (if modified)
* [ ] Database migrations applied: `npm run db:push`
* [ ] Rate limiting active on auth endpoints
* [ ] SMTP credentials verified (if email modified)

Only then may the task be declared **COMPLETE**.

---

**Mode:** STRICT / ZERO-HALLUCINATION
**Maintained By:** Classify Engineering
**Last Updated:** 2025-12-16
