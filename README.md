# Classify - تطبيق الرقابة الأبوية 📱

<div dir="rtl">

تطبيق عربي شامل للرقابة الأبوية يساعد الآباء في إدارة علاقتهم مع أطفالهم من خلال المهام التعليمية والألعاب والمكافآت.

</div>

## 📚 Complete Documentation | التوثيق الشامل

**New team members?** Start here → [**COMPLETE_OVERVIEW.md**](COMPLETE_OVERVIEW.md) | **Quick lookup?** → [**QUICK_REFERENCE.md**](QUICK_REFERENCE.md) | **How to deploy?** → [**DEPLOYMENT.md**](DEPLOYMENT.md)

| Document | Purpose | Best For |
|----------|---------|----------|
| [**FULL_PROJECT_ANALYSIS.md**](FULL_PROJECT_ANALYSIS.md) | تحليل شامل من الكود مباشرة (85+ جدول, 39 صفحة) | فهم كل شيء بالتفصيل |
| [**PROJECT_BLUEPRINT.md**](PROJECT_BLUEPRINT.md) | Complete system reference (80+ tables, 150+ endpoints) | Understanding everything |
| [**ARCHITECTURE.md**](ARCHITECTURE.md) | System diagrams & flows (20+ visuals) | Visual learners |
| [**QUICK_REFERENCE.md**](QUICK_REFERENCE.md) | 50+ common tasks with examples | Day-to-day development |
| [**DEPLOYMENT.md**](DEPLOYMENT.md) | 🚀 Hostinger VPS deployment guide (optimized for Docker Manager) | DevOps & deployment |
| [**docs/DEPLOYMENT_OPTIMIZATION.md**](docs/DEPLOYMENT_OPTIMIZATION.md) | Performance benchmarks & optimization details | Understanding improvements |
| [**COMPLETE_OVERVIEW.md**](COMPLETE_OVERVIEW.md) | Navigation & learning paths | New team members |
| [**DOCUMENTATION_INDEX.md**](DOCUMENTATION_INDEX.md) | Master index & cross-references | Finding specific topics |

**✨ Total: 5,000+ lines, 30,000+ words, 100+ code examples, 20+ diagrams**

---

## Features | الميزات

### Authentication | المصادقة
- Parent registration with email/phone
- **Social Login** (Google, Facebook, Apple) - Circular icon buttons
- **OTP Providers** (Email/SMS) - Admin configurable
- OTP verification (6 digits, 5 min expiry) via Resend
- JWT sessions with bcrypt password hashing
- Trusted device remembering (skip OTP)
- Child PIN login with parent approval

### Parent Dashboard | لوحة الوالدين
- Child linking via QR code or unique code
- Task management with subjects (Classy tasks + custom + public tasks)
- Scheduled tasks with cancel option
- Daily/Weekly/Monthly progress reports
- E-commerce store with categories and filters
- Library store integration
- Wallet system with deposits and transfers
- Referral program (100 points per active referral)
- Growth tree tracking for children

### Child Interface | واجهة الأطفال
- Animated task completion with feedback (Framer Motion)
- Educational games with points system
- Growth tree visualization (8 stages)
- Gift unlocking based on milestones
- Store browsing and wishlist
- Notifications center
- Annual report (Khassar Sanawi)

### Admin Panel | لوحة الإدارة
- User management (parents, children, admins)
- Product and category management
- Subjects and template tasks (CRUD)
- **Social Login Providers** management
- **OTP Providers** management (Email/SMS settings)
- Referral tracking and statistics
- Ads management (target parents/children/all)
- Libraries management with referral system
- Profit system with commission tracking
- SEO settings with meta tags
- Support settings (email, phone, WhatsApp, Telegram)
- Activity logs and wallet analytics

### Internationalization | التدويل
- Arabic (RTL) and English (LTR) support
- 200+ translation keys
- Language preference persistence
- i18n integration with react-i18next

## Tech Stack | البنية التقنية

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Animations | Framer Motion |
| State | TanStack Query v5 |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT + bcrypt + Social OAuth |
| Email | Resend API |
| SMS | Twilio (configurable) |
| Mobile | Capacitor (iOS/Android) |

## API Notes | ملاحظات API

- Parent notifications (requires auth):
	- GET /api/notifications
	- PUT /api/notifications/:id
	- DELETE /api/notifications/:id

## Test Tokens | توكنات الاختبار

Use the web app and browser DevTools to read stored tokens:

1) Parent: log in to the parent dashboard, then run:

```js
localStorage.getItem("token")
```

2) Child: log in to the child experience, then run:

```js
localStorage.getItem("childToken")
```

3) Get `childId` using the child token:

```bash
curl -H "Authorization: Bearer <childToken>" http://127.0.0.1:5000/api/child/profile
```

## Project Structure | هيكل المشروع

```
classify/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # shadcn components
│   │   │   └── admin/      # Admin-specific components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── contexts/       # React contexts (Theme, etc.)
│   │   ├── i18n/           # Internationalization
│   │   │   └── locales/    # ar.json, en.json
│   │   └── lib/            # Utility functions
│   └── public/             # Static assets
├── server/                 # Backend Express application
│   ├── routes/             # API route handlers
│   │   ├── admin.ts        # Admin endpoints
│   │   ├── auth.ts         # Authentication endpoints
│   │   ├── parent.ts       # Parent endpoints
│   │   └── child.ts        # Child endpoints
│   ├── middleware/         # Express middleware
│   ├── utils/              # Helper utilities
│   ├── mailer.ts           # Resend email integration
│   └── sms-otp.ts          # SMS OTP service
├── shared/                 # Shared code
│   └── schema.ts           # Drizzle ORM schema (64+ indexes)
├── migrations/             # Database migrations
├── nginx/                  # Nginx configuration
│   └── nginx.conf          # Production nginx config
├── android/                # Android project (Capacitor)
├── ios/                    # iOS project (Capacitor)
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose with nginx
├── deploy.sh               # Deployment script for VPS
└── .env.example            # Environment template
```

## Quick Start | البداية السريعة

### Development | التطوير

```bash
# Install dependencies
npm install

# Run development server (port 5000)
npm run dev

# Database push
npm run db:push
```

### Production | الإنتاج

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Docker Deployment | النشر عبر Docker

### Prerequisites | المتطلبات

- Docker 20+
- Docker Compose 2+
- Ubuntu 24.04 LTS (Hostinger VPS)

### 🚀 Quick Deploy | النشر السريع

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/classify.git
cd classify

# 2. Copy environment file
cp .env.example .env

# 3. Edit environment variables
nano .env

# 4. Start all services
docker compose up -d
```

### ⚡ Fast Updates | التحديثات السريعة

**Most common:** One-command update with the optimized script:

```bash
# Quick update from main branch
./scripts/deploy-fast.sh

# Update from specific branch
./scripts/deploy-fast.sh dev

# Environment changes only (no rebuild)
./scripts/deploy-fast.sh --no-build
```

**Performance:**
- Code updates: **90% faster** (~30 seconds vs 5 minutes)
- Environment changes: **96% faster** (~5 seconds vs 2 minutes)
- Image size: **62% smaller** (~150MB vs 400MB)

### Manual Docker Commands | أوامر Docker اليدوية

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f app

# Stop all services
docker compose down

# Restart application
docker compose restart app

# Run database migrations
docker compose exec app npm run db:push

# Quick rebuild (with layer caching)
docker compose up -d --build app
```

## SSL Certificate Setup | إعداد شهادة SSL

### Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --webroot -w /var/www/certbot -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# Restart nginx
docker-compose restart nginx
```

## Environment Variables | متغيرات البيئة

### Required | مطلوبة

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
RESEND_API_KEY=re_your_resend_api_key
```

### Optional | اختيارية

```env
# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# Social Login (configure in admin panel)
GOOGLE_CLIENT_ID=xxx
FACEBOOK_APP_ID=xxx
APPLE_CLIENT_ID=xxx
```

## Admin Access | دخول المسؤول

```
URL: /admin
Email: marco0000110@gmail.com
Password: admin123
```

**⚠️ Change admin credentials in production!**

### Managing Admin Credentials | إدارة بيانات الإدمن

To change admin email or password:

```bash
# 1. Edit .env
ADMIN_EMAIL=newemail@domain.com
ADMIN_PASSWORD=NewPassword@2025

# 2. Apply changes to database
npm run admin:setup
```

**Important:** Changes in `.env` alone are not enough. You must run `npm run admin:setup` to sync changes to the database.

For detailed guide, see [ADMIN_CREDENTIALS.md](docs/ADMIN_CREDENTIALS.md)

## API Endpoints | نقاط النهاية

### Public
- `GET /api/health` - Health check
- `GET /api/auth/social-providers` - Active social login providers
- `GET /api/auth/otp-providers` - Active OTP providers

### Authentication
- `POST /api/auth/register` - Parent registration
- `POST /api/auth/login` - Parent login
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Admin
- `GET /api/admin/social-login-providers` - All social providers
- `PUT /api/admin/social-login-providers/:id` - Update provider
- `GET /api/admin/otp-providers` - All OTP providers
- `PUT /api/admin/otp-providers/:id` - Update OTP settings

## Performance Optimization | تحسين الأداء

### Docker Build Optimization
**3-stage multi-stage build** with aggressive layer caching:
- **Stage 1 (deps):** Dependencies cached unless `package.json` changes
- **Stage 2 (builder):** Build cached unless source code changes
- **Stage 3 (runner):** Minimal production image (~150MB)

**Results:**
- First build: ~6 minutes (25% faster)
- Code updates: ~30 seconds (90% faster)
- Env changes: ~5 seconds (96% faster)

### Database Indexes
64 optimized indexes for high-performance queries:
- Authentication indexes (parents, sessions, OTP codes)
- Task and notification indexes
- Order and purchase indexes
- Activity and login history indexes

### Caching
- TanStack Query with 5-minute staleTime
- Compression middleware enabled
- Static asset caching via nginx
- Docker BuildKit caching for faster rebuilds

### Scalability
- Optimized for 5000+ concurrent users
- Docker resource limits configured
- Connection pooling enabled
- Zero-downtime rolling updates

## Monitoring | المراقبة

```bash
# Check application health
curl http://localhost:5000/api/health

# View container status
docker-compose ps

# View application logs
docker-compose logs -f app

# View nginx logs
docker-compose logs -f nginx
```

### Monitoring Tools | أدوات المراقبة

#### 🎛️ Management Tools | أدوات الإدارة

| Tool | URL | Purpose | Credentials |
|------|-----|---------|-----------|
| **Portainer** | `http://localhost:9000` | إدارة Docker | [First login] |
| **pgAdmin** | `http://localhost:5050` | إدارة قاعدة البيانات | `admin@classiv3.com` / `admin123` |
| **Redis Commander** | `http://localhost:8081` | مراقبة Redis | - |

#### 📊 Observability Tools | أدوات المراقبة المتقدمة

| Tool | URL | Purpose |
|------|-----|---------|
| **Prometheus** | `http://localhost:9090` | جمع مقاييس الأداء |
| **Grafana** | `http://localhost:3000` | لوحات تحكم بصرية |
| **Loki** | `http://localhost:3100` | مركز السجلات المركزي |

#### 📧 Communication Tools | أدوات الاتصالات

| Tool | URL | Purpose |
|------|-----|---------|
| **Mailhog** | `http://localhost:8025` | اختبار الرسائل والـ OTP |

## Backup | النسخ الاحتياطي

```bash
# Backup database
docker-compose exec db pg_dump -U classify classify > backup.sql

# Restore database
docker-compose exec -T db psql -U classify classify < backup.sql

# Backup volumes
docker run --rm -v classify_postgres_data:/data -v $(pwd):/backup alpine tar cvf /backup/postgres_backup.tar /data
```

## Troubleshooting | استكشاف الأخطاء

### Application not starting
```bash
# Check logs
docker-compose logs app

# Verify database connection
docker-compose exec app npm run db:push
```

### Database connection issues
```bash
# Check database status
docker-compose exec db pg_isready -U classify

# Restart database
docker-compose restart db
```

### SSL certificate issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Renew Let's Encrypt
sudo certbot renew
```

## Contributing | المساهمة

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License | الترخيص

MIT License - see LICENSE file for details.

## Support | الدعم

- Email: support@classify-app.com
- WhatsApp: +966500000000
- Telegram: @classifyapp

---

<div dir="rtl">

**صُنع بـ ❤️ للآباء والأطفال**

</div>
