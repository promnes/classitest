# Classify - Production Deployment Guide (Hostinger VPS)

This guide covers deploying Classify on a Hostinger VPS with Docker.

## Prerequisites

- Hostinger VPS with Ubuntu 22.04/24.04
- SSH access to your VPS
- A domain name pointed to your VPS IP

---

## Quick Start (HTTP Only)

The fastest way to get running - no SSL required:

```bash
# 1. Connect to your VPS
ssh root@your-vps-ip

# 2. Install Docker (if not installed)
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# 3. Clone repository
git clone https://github.com/your-username/classify.git
cd classify

# 4. Create environment file
cp .env.production.example .env

# 5. Edit .env with your values
nano .env
# At minimum, set these:
# - POSTGRES_PASSWORD
# - JWT_SECRET
# - SESSION_SECRET
# - ADMIN_EMAIL
# - ADMIN_PASSWORD

# 6. Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"

# 7. Start the application (HTTP only)
docker compose -f docker-compose.http.yml up -d

# 8. Check status
docker compose -f docker-compose.http.yml ps
docker compose -f docker-compose.http.yml logs -f app

# 9. Test health endpoint
curl http://localhost/health
curl http://localhost:5000/api/health
```

Your app is now running at `http://your-vps-ip`

---

## Hostinger VPS Readiness Plan (Production)

### 1) Prepare Server
- Update packages
- Install Docker + Compose plugin
- Open ports 80/443/22

### 2) Deploy Code
- Clone repository
- Checkout the correct branch/tag
- Copy environment file: .env.production.example → .env

### 3) Configure Environment
- Set required secrets (POSTGRES_PASSWORD, JWT_SECRET, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD)
- Set APP_URL to your domain
- Configure SMTP/RESEND/TWILIO only if used

#### Step-by-step .env (production)

1) Copy the production template:

```bash
cp .env.production.example .env
```

2) Generate secrets (run on the server):

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')"
```

3) Edit `.env` and set **all required values**:

```dotenv
POSTGRES_USER=classify_user
POSTGRES_PASSWORD=PASTE_GENERATED_32_CHAR_SECRET
POSTGRES_DB=classify_db

JWT_SECRET=PASTE_GENERATED_64_CHAR_SECRET
SESSION_SECRET=PASTE_GENERATED_64_CHAR_SECRET

ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=PASTE_GENERATED_16_CHAR_SECRET

APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

4) Optional providers (only if used):

```dotenv
SMTP_HOST=smtp.mail.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=YOUR_EMAIL_PASSWORD
SMTP_FROM=Classify <noreply@yourdomain.com>

RESEND_API_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_FROM_NUMBER=
SMS_PROVIDER=twilio
SMS_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

5) Final check before start:

```bash
grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|SESSION_SECRET|ADMIN_EMAIL|ADMIN_PASSWORD|APP_URL|CORS_ORIGIN)=" .env
```

### 4) Build & Run
- Build images
- Start services with HTTPS compose

### 5) SSL
- Issue certificates with certbot
- Install certs in nginx/ssl
- Enable auto-renew

### 6) Database
- Ensure DB container is healthy
- Run migrations: npm run db:push
- Verify admin exists

### 7) Verify
- Health: /api/health
- Static: /index.html, /assets/*, /manifest.json, /sw.js
- Auth + OTP smoke flow

### 8) Hardening
- Change default passwords
- Set CORS_ORIGIN
- Enable firewall
- Set backups and log monitoring
---

## Production Setup (HTTPS with SSL)

### Step 1: Install Certbot

```bash
apt update
apt install certbot -y
```

### Step 2: Get SSL Certificate

```bash
# Stop any running containers
docker compose down

# Get certificate (replace yourdomain.com)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Create SSL directory and copy certificates
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
chmod 600 nginx/ssl/*.pem
```

### Step 3: Start with HTTPS

```bash
# Use the main docker-compose.yml (includes SSL)
docker compose up -d
```

### Step 4: Auto-Renew SSL

```bash
# Add to crontab
crontab -e

# Add this line:
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /path/to/classify/nginx/ssl/ && docker compose restart nginx
```

---

## Environment Variables Reference

### Required (docker compose will fail without these)

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `classify_user` |
| `POSTGRES_PASSWORD` | Database password (32+ chars) | `openssl rand -base64 32` |
| `JWT_SECRET` | JWT signing key (64+ chars) | `openssl rand -base64 64` |
| `SESSION_SECRET` | Session encryption key (64+ chars) | `openssl rand -base64 64` |
| `ADMIN_EMAIL` | Admin login email | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Admin login password (16+ chars) | `openssl rand -base64 24` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key (email) | - |
| `RESEND_FROM` | Resend from address | - |
| `SMTP_HOST` | Email server | - |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email username | - |
| `SMTP_PASSWORD` | Email password | - |
| `CORS_ORIGIN` | Allowed origins | `*` |
| `LOG_LEVEL` | Log verbosity | `info` |
| `OTP_ALERT_THRESHOLD` | OTP alert threshold per minute | `15` |
| `SMS_PROVIDER` | SMS provider | `twilio` |
| `SMS_API_KEY` | SMS API key | - |
| `TWILIO_FROM_NUMBER` | Twilio phone number | - |

### CORS configuration

- `CORS_ORIGIN` accepts a comma-separated allowlist (e.g. `https://app.example.com,https://admin.example.com`).
- In development, unknown `/api/*` routes return the JSON 404 contract instead of the SPA to match production behavior.

---

## Getting Test Credentials (Gmail SMTP + SMS)

### Gmail SMTP (App Password)
1. Enable 2‑Step Verification on your Google Account.
2. Create an App Password for “Mail”.
3. Use these values in your `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM="Classify <your@gmail.com>"
```

### SMS (Twilio Test Credentials)
1. Create a Twilio account.
2. Use **Test** Account SID/Auth Token from the Twilio console.
3. Use a Twilio **Test** phone number.
4. Set these values in your `.env`:

```
SMS_PROVIDER=twilio
SMS_API_KEY=your_twilio_auth_token
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+10000000000
```

---

## Common Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f db

# Restart a service
docker compose restart app

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d

# Enter container shell
docker compose exec app sh
docker compose exec db psql -U classify_user -d classify_db

# Check database
docker compose exec db psql -U classify_user -d classify_db -c "SELECT * FROM admins LIMIT 1;"

# Full reset (WARNING: destroys data)
docker compose down -v
docker compose up -d
```

---

## Troubleshooting

### App not starting

```bash
# Check logs
docker compose logs app

# Common issues:
# - DATABASE_URL incorrect
# - JWT_SECRET not set
# - Port 5000 already in use
```

### Database connection failed

```bash
# Check if database is running
docker compose ps db

# Test connection
docker compose exec db pg_isready -U classify_user -d classify_db

# Check logs
docker compose logs db
```

### Nginx not responding

```bash
# Check nginx status
docker compose ps nginx

# Test config
docker compose exec nginx nginx -t

# Check logs
docker compose logs nginx
```

### SSL certificate issues

```bash
# Verify certificate files exist
ls -la nginx/ssl/

# Check file permissions
chmod 600 nginx/ssl/*.pem

# Test nginx config
docker compose exec nginx nginx -t
```

---

## Backup & Restore

### Backup Database

```bash
# Create backup
docker compose exec db pg_dump -U classify_user classify_db > backup_$(date +%Y%m%d).sql

# With compression
docker compose exec db pg_dump -U classify_user classify_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# From SQL file
cat backup.sql | docker compose exec -T db psql -U classify_user -d classify_db

# From compressed file
gunzip -c backup.sql.gz | docker compose exec -T db psql -U classify_user -d classify_db
```

### Backup Volumes

```bash
# Backup all data
docker run --rm -v classify_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v classify_app_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz /data
```

---

## Performance Tuning

### For high traffic (5000+ users)

Edit `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
  
  db:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### PostgreSQL tuning

Create `postgresql.conf`:

```bash
# Add to db service volumes:
# - ./postgresql.conf:/etc/postgresql/postgresql.conf

# postgresql.conf contents:
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 128MB
effective_cache_size = 768MB
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Use SSL/HTTPS
- [ ] Set proper CORS_ORIGIN
- [ ] Enable firewall (ufw)
- [ ] Regular backups
- [ ] Keep Docker images updated
- [ ] Monitor logs for suspicious activity

```bash
# Basic firewall setup
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

---

## Support

For issues:
1. Check logs: `docker compose logs -f`
2. Verify environment variables
3. Test health endpoint: `curl http://localhost:5000/api/health`
4. Check this documentation

---

*Last updated: January 2026*
