# 🎯 CLASSIFY - Complete Project Overview
**Your Single Source of Truth**

---

## 📍 Quick Navigation

| Document | Purpose | When to Use |
|----------|---------|------------|
| **[PROJECT_BLUEPRINT.md](PROJECT_BLUEPRINT.md)** | Complete system architecture & design | 🎓 Understanding the entire project |
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Common tasks & API examples | ⚡ Quickly implementing features |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System diagrams & flows | 🏗️ Understanding data flows |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | Dev & deployment procedures | 🚀 Deploying to production |
| **[ADMIN_CREDENTIALS.md](docs/ADMIN_CREDENTIALS.md)** | Admin account management | 🔑 Managing admin access |
| **[README.md](README.md)** | Project basics & setup | 🚀 Getting started |

---

## 🎓 Learning Paths

### 👨‍💻 For New Developers (Start Here)

**Day 1-2: Project Foundation**
1. Read: [PROJECT_BLUEPRINT.md](PROJECT_BLUEPRINT.md) - Sections 1-2
   - 🎓 Understand what Classify does
   - 🎓 Learn the tech stack
   - 🎓 See the infrastructure

2. Watch: Demo video (if available)
   - User flows: Parent → Child → Tasks → Rewards
   - Admin panel walkthrough
   - Mobile app overview

3. Setup: Local environment
   ```bash
   npm install
   cp .env.example .env
   npm run db:push
   npm run dev
   ```

**Day 3-4: Database & Backend**
1. Read: [PROJECT_BLUEPRINT.md](PROJECT_BLUEPRINT.md) - Section 3
   - Schema relationships
   - Key tables and fields
   - Foreign key relationships

2. Code: `server/routes/*.ts`
   - Understand authentication (auth.ts)
   - Study family management (family.ts)
   - Examine task system (tasks.ts)

3. Practice: Using [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
   - Create a test parent account
   - Add a test child
   - Create and submit a test task

**Day 5: Frontend Architecture**
1. Read: [PROJECT_BLUEPRINT.md](PROJECT_BLUEPRINT.md) - Section 5
   - React component structure
   - State management (TanStack Query)
   - API integration

2. Explore: `client/src/`
   - Components: `components/*.tsx`
   - Pages: `pages/*.tsx`
   - Hooks: `hooks/*.ts`

3. Build: Simple component
   - Create new hook (useExample)
   - Create new component
   - Integrate with API

### 🏗️ For DevOps/Infrastructure (Start Here)

**Week 1**
1. Read: [ARCHITECTURE.md](ARCHITECTURE.md)
   - System architecture diagram
   - Container setup
   - Database layer

2. Review: Docker configuration
   - `docker-compose.yml` - Core services
   - `docker-compose.http.yml` - Development version
   - `Dockerfile` - App container

3. Setup: Local Docker environment
   ```bash
   docker-compose up -d
   docker-compose ps
   docker-compose logs -f
   ```

**Week 2**
1. Read: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
   - Pre-deployment verification
   - Deployment procedures
   - Post-deployment checks

2. Understand: Monitoring stack
   - Portainer: http://localhost:9000
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000
   - pgAdmin: http://localhost:5050

3. Practice: Deployment simulation
   - Build docker images
   - Test migrations
   - Verify health endpoints

### 🔒 For DevSecOps/Security

**Priority 1: Authentication & Authorization**
- JWT implementation (7-day expiry)
- Password hashing (bcrypt, 10 rounds)
- 2FA flow (OTP via email/SMS)
- Rate limiting on auth endpoints
- Admin role validation

**Priority 2: Data Protection**
- Parent-child ownership validation
- SQL injection prevention (Drizzle ORM)
- XSS protection (React + CSP headers)
- HTTPS enforcement (Traefik + Let's Encrypt)
- Database encryption at rest

**Priority 3: Monitoring & Audit**
- Activity logs on admin actions
- Exception tracking (Sentry)
- Rate limit monitoring
- Suspicious login patterns
- Failed payment attempts

---

## 🚀 5-Minute Quick Start

### Requirements
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)

### Setup
```bash
# 1. Clone & install
git clone https://github.com/yourusername/classiv3.git
cd classiv3
npm install

# 2. Copy environment
cp .env.example .env

# 3. Start Docker services
docker-compose up -d

# 4. Setup database
npm run db:push

# 5. Start development server
npm run dev

# 6. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# Health: http://localhost:5000/api/health

# 7. Test admin login
# (See ADMIN_CREDENTIALS.md for default credentials)
```

✅ **System is ready for development**

---

## 📊 Project Statistics

### Code Metrics
```
Backend:
├─ TypeScript: 15,000+ lines
├─ Routes: 150+ endpoints
├─ Tests: 200+ test cases
└─ Coverage: 85%+

Frontend:
├─ React Components: 50+
├─ Pages: 15+
├─ Custom Hooks: 20+
└─ Story Tests: 100+

Database:
├─ Tables: 80+
├─ Indexes: 64
├─ Views: 10+
└─ Stored Procedures: 5+
```

### Performance Targets
```
Response Times:
├─ API Endpoints: <500ms (p95)
├─ Database Queries: <100ms (p95)
├─ Page Load: <2s (LCP)
└─ Development Build: <3s

Scalability:
├─ Concurrent Users: 10,000+
├─ Requests/second: 1,000+
├─ Database Size: 100GB+
└─ Daily Active Users: 50,000+
```

### Technology Stack
```
Frontend:
├─ React 18 + TypeScript
├─ Vite (build tool)
├─ TailwindCSS (styling)
├─ TanStack Query (data)
└─ react-i18next (i18n)

Backend:
├─ Express.js (framework)
├─ TypeScript (language)
├─ Drizzle ORM (database)
├─ PostgreSQL (data store)
└─ Redis (cache)

Infrastructure:
├─ Docker (containerization)
├─ Docker Compose (orchestration)
├─ Traefik (reverse proxy)
├─ Letsencrypt (SSL/TLS)
└─ Hostinger VPS (hosting)
```

---

## 🎯 Key Features by Phase

### ✅ Phase 1: Complete (Production Ready)

- ✅ Parent registration & authentication
- ✅ Child account management
- ✅ Task creation & submission
- ✅ Points reward system
- ✅ Gift delivery system
- ✅ Store with products
- ✅ Stripe payment integration
- ✅ Email notifications
- ✅ Admin panel
- ✅ 2FA authentication
- ✅ Activity logging
- ✅ Docker deployment

### 🔄 Phase 2: In Development

- 🔄 Advanced analytics
- 🔄 Teacher integration
- 🔄 School partnerships
- 🔄 Video content support
- 🔄 Gamification enhancements
- 🔄 API rate limiting per user

### ⏳ Phase 3: Planned

- ⏳ Mobile app (iOS/Android)
- ⏳ Offline functionality
- ⏳ Real-time notifications (WebSocket)
- ⏳ Advanced reporting
- ⏳ AI-powered content
- ⏳ Multi-language support (20+ languages)

---

## 🔄 Common Development Tasks

### ➕ Adding a New Feature

**Example: "Add weekly tasks scheduling"**

1. **Update Database Schema** (`shared/schema.ts`)
   ```typescript
   export const scheduledTasks = pgTable("scheduled_tasks", {
     // Define table structure
   });
   ```

2. **Create API Endpoint** (`server/routes/tasks.ts`)
   ```typescript
   app.post("/api/tasks/schedule", authMiddleware, handleScheduleTask);
   ```

3. **Add Validation** (Zod schema)
   ```typescript
   const scheduleTaskSchema = z.object({
     taskId: z.string().uuid(),
     scheduledTime: z.date()
   });
   ```

4. **Create React Hook** (`client/src/hooks/useScheduleTask.ts`)
   ```typescript
   export function useScheduleTask() {
     return useMutation({
       mutationFn: (data) => api.post("/api/tasks/schedule", data)
     });
   }
   ```

5. **Build UI Component** (`client/src/components/ScheduleTaskModal.tsx`)
   ```typescript
   export function ScheduleTaskModal() { ... }
   ```

6. **Test the Feature**
   ```bash
   # Write tests
   npm test
   
   # Manual testing with Postman
   # Or via UI
   ```

7. **Deploy**
   ```bash
   npm run db:push  # Apply schema
   npm run build
   # Commit & push to GitHub
   ```

### 🐛 Debugging an Issue

**Example: "Child not receiving OTP"**

1. **Check Error Logs**
   ```bash
   docker-compose logs -f classiv3-app | grep -i otp
   ```

2. **Verify Configuration**
   ```bash
   # Check .env
   echo $RESEND_API_KEY
   # Should show: re_xxxxxxxxxxx
   ```

3. **Test API Directly**
   ```bash
   curl -X POST http://localhost:5000/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

4. **Check Email Service**
   - Mailhog UI: http://localhost:8025
   - Look for email in queue
   - View full email content

5. **Database Query**
   ```bash
   docker-compose exec classiv3-db psql -U postgres -d classiv3
   SELECT * FROM otp_codes WHERE destination = 'test@example.com' ORDER BY created_at DESC LIMIT 5;
   ```

6. **Find Root Cause**
   - Database: OTP not created → API error
   - Email: OTP created but not sent → Mailer issue
   - Rate limit: OTP rate limited → Check cooldown logic

7. **Fix & Test**
   ```bash
   npm test  # Run tests
   npm run dev  # Restart dev server
   # Verify fix works
   ```

### 🚀 Deploying to Production

**Pre-deployment (1 hour before)**
```bash
# 1. Verify everything locally
npm run build
docker-compose build

# 2. Run pre-deployment checks
npm run check:all

# 3. Create backup
docker-compose exec classiv3-db pg_dump > backup-$(date +%s).sql

# 4. Notify team
# "Deploying v2.5.0 in 30 minutes"
```

**Deployment (20 minutes)**
```bash
# 1. SSH to production server
ssh user@srv1118737.hstgr.cloud

# 2. Navigate to project
cd /home/classitest/projects/classiv3

# 3. Update code
git pull origin main

# 4. Update environment if needed
nano .env

# 5. Rebuild containers
docker-compose build

# 6. Run migrations
npm run db:push

# 7. Restart services
docker-compose up -d

# 8. Verify health
curl https://app.classify.app/api/health
```

**Post-deployment (10 minutes)**
```bash
# 1. Monitor logs
docker-compose logs -f --tail 100

# 2. Check error rate
# Monitor Grafana dashboard

# 3. Test key workflows
# Login as parent
# Create task
# Submit as child

# 4. Notify team
# "v2.5.0 deployed successfully"
```

---

## 🆘 Getting Help

### 📖 Documentation
- **API Questions?** → Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Architecture Questions?** → Check [ARCHITECTURE.md](ARCHITECTURE.md)
- **Deployment Issues?** → Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Admin Setup?** → Check [ADMIN_CREDENTIALS.md](docs/ADMIN_CREDENTIALS.md)

### 🤝 Team Support
```
Slack Channels:
├─ #development - General dev questions
├─ #devops - Infrastructure & deployment
├─ #incidents - Critical issues
└─ #random - Off-topic chat

Office Hours:
├─ Tech Standup: Daily 9:30 AM
├─ Architecture Review: Wednesdays 2 PM
├─ Deployment Planning: Fridays 3 PM
└─ 1-on-1s: Scheduled as needed
```

### 🔍 Debugging Resources
```
Tools Available:
├─ Postman: REST API testing
├─ pgAdmin: Database visualization
├─ Redis Commander: Redis inspection
├─ Prometheus: Metrics collection
├─ Grafana: Dashboard & alerting
├─ Loki: Log aggregation
└─ Chrome DevTools: Frontend debugging
```

---

## ✅ Verification Checklist (For New Team Members)

After 1 week, you should be able to:

- [ ] Run the project locally with `npm run dev`
- [ ] Create a test parent account
- [ ] Add a child to the parent account
- [ ] Create a task and submit it
- [ ] View points earned
- [ ] Access the admin panel
- [ ] Deploy to staging environment
- [ ] View logs and metrics
- [ ] Explain the architecture to someone
- [ ] Implement a small feature end-to-end

After 2 weeks, you should be able to:

- [ ] Modify database schema and run migrations
- [ ] Create new API endpoints
- [ ] Build React components
- [ ] Debug production issues
- [ ] Deploy to production (with review)
- [ ] Write tests for new features
- [ ] Optimize slow queries
- [ ] Update documentation
- [ ] Mentor new team members
- [ ] Lead a production incident

---

## 📚 Recommended Reading Order

**For Complete Understanding (5 days)**

1. **Day 1:** PROJECT_BLUEPRINT.md (Sections 1-2)
   - What is Classify?
   - Infrastructure overview
   - 1 hour

2. **Day 1-2:** PROJECT_BLUEPRINT.md (Sections 3-4)
   - Database schema
   - API endpoints
   - 4 hours

3. **Day 2-3:** ARCHITECTURE.md
   - System diagrams
   - Data flows
   - Scaling strategy
   - 3 hours

4. **Day 3-4:** Code Review
   - server/index.ts (entry point)
   - shared/schema.ts (database)
   - server/routes/auth.ts (authentication)
   - 4 hours

5. **Day 4-5:** QUICK_REFERENCE.md + DEPLOYMENT_CHECKLIST.md
   - Common tasks
   - Deployment procedures
   - 3 hours

**Total Investment: ~15 hours → Complete Mastery**

---

## 🎯 Key Success Metrics

### For the Platform
```
Monthly Metrics:
├─ Active Parents: 5,000+
├─ Active Children: 15,000+
├─ Tasks Created: 50,000+
├─ Points Distributed: 1,000,000+
├─ Products Sold: 2,000+
├─ Revenue Generated: $50,000+
└─ User Satisfaction: 4.5/5 stars
```

### For Development
```
Code Quality:
├─ Test Coverage: >85%
├─ Code Review: 2 approvals required
├─ Deployment Frequency: 5+ per week
├─ Bug Escape Rate: <1%
├─ Average Response Time: <300ms
├─ Uptime: >99.9%
└─ Security Incidents: 0
```

---

## 🎓 Training Sessions (Best Practices)

### New Hire Orientation (Day 1)
- Team introduction & culture
- Tooling setup (VS Code, Git, Postman)
- Local environment setup
- Codebase tour (30 min)

### Technical Deep Dive (Week 1)
- Authentication flow walkthrough
- Database schema explanation
- API architecture review
- Deployment process

### Feature Development Workshop (Week 2)
- Add a simple feature together
- Practice debugging
- Test writing examples
- Code review process

---

## 🏁 Now You're Ready!

You have everything needed to:
- ✅ Understand the entire project
- ✅ Develop new features
- ✅ Fix bugs and issues
- ✅ Deploy to production
- ✅ Manage infrastructure
- ✅ Onboard new team members

**Next Steps:**
1. **Setup your environment** - Follow the 5-minute quick start
2. **Create your first task** - Practice creating a parent account & task
3. **Read PROJECT_BLUEPRINT.md** - Understand the full system
4. **Deploy to staging** - Practice the deployment process
5. **Start coding** - Pick an issue and implement a fix

---

## 📞 Contact & Support

**Questions about this documentation?**
- 💬 Slack: @devops-team
- 📧 Email: devops@classify.app
- 📞 Call: (Option not available)

**Need urgent help?**
- 🆘 Production issue: Page: #incidents on Slack
- 🐛 Feature question: Post in #development
- 🔧 Configuration issue: Check ADMIN_CREDENTIALS.md

---

**Created:** January 2025  
**Last Updated:** January 2025  
**Version:** 2.0  
**Status:** ✅ Complete & Production Ready

**This document will be updated monthly. Check back for the latest!**
