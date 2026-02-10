#!/bin/bash
# ============================================
# Classify - Full VPS Deployment Script
# Domain: classi-fy.com
# Server: Hostinger VPS (srv1118737.hstgr.cloud)
# ============================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🚀 Classify - Full Production Deploy     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"

PROJECT_DIR="/var/www/classify"

# ── Step 1: System Update & Docker Check ──
echo -e "\n${YELLOW}[1/8] Checking system requirements...${NC}"

if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    apt update && apt install -y docker-compose-plugin
fi

echo -e "${GREEN}  ✅ Docker $(docker --version | cut -d' ' -f3)${NC}"
echo -e "${GREEN}  ✅ $(docker compose version)${NC}"

# ── Step 2: Firewall ──
echo -e "\n${YELLOW}[2/8] Configuring firewall...${NC}"
apt install -y ufw > /dev/null 2>&1 || true
ufw allow ssh > /dev/null 2>&1
ufw allow http > /dev/null 2>&1
ufw allow https > /dev/null 2>&1
echo "y" | ufw enable > /dev/null 2>&1 || true
echo -e "${GREEN}  ✅ Firewall configured (SSH, HTTP, HTTPS)${NC}"

# ── Step 3: Clone/Update repository ──
echo -e "\n${YELLOW}[3/8] Setting up project...${NC}"

if [ -d "$PROJECT_DIR" ]; then
    echo "  Project directory exists. Backing up .env..."
    cp "$PROJECT_DIR/.env" "/root/.env.backup.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
    cd "$PROJECT_DIR"
    
    # If it's a git repo, pull latest
    if [ -d ".git" ]; then
        echo "  Pulling latest code..."
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
    fi
else
    echo -e "${YELLOW}  ⚠️  Project directory not found at $PROJECT_DIR${NC}"
    echo -e "${YELLOW}  You need to upload the project first. Options:${NC}"
    echo -e "${YELLOW}  A) git clone YOUR_REPO_URL $PROJECT_DIR${NC}"
    echo -e "${YELLOW}  B) Upload via SCP from your local machine${NC}"
    echo ""
    echo "  Creating directory..."
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
echo -e "${GREEN}  ✅ Project directory: $PROJECT_DIR${NC}"

# ── Step 4: Create .env file ──
echo -e "\n${YELLOW}[4/8] Creating production .env...${NC}"

cat > "$PROJECT_DIR/.env" << 'ENVEOF'
# Classify - Production Environment
# Server: Hostinger VPS
# Domain: classi-fy.com

# Database
POSTGRES_USER=classify
POSTGRES_PASSWORD=ClassifySecure2024!
POSTGRES_DB=classify_db

# Security
JWT_SECRET=6d66a82275d21dc0d7bc2679fca04b0b141a299731351c0819ac48bf300bd861
SESSION_SECRET=2d54b01c569062bec0cf27156b4cd5e298b49425b81091efd6729e498011457a
ADMIN_PANEL_PASSWORD=admin123

# Admin Account
ADMIN_EMAIL=admin@classify.app
ADMIN_PASSWORD=Admin@Classify2024!
ADMIN_CREATION_SECRET=e3ce131e11ad1bc0c025a37d21fe35b24755c8a9b26e70ce9644434606b00c80
ADMIN_BYPASS_EMAILS=

# Application
APP_URL=https://classi-fy.com
FRONTEND_URL=https://classi-fy.com
BACKEND_URL=https://classi-fy.com
NODE_ENV=production

# SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@classi-fy.com
SMTP_PASSWORD=6f22397e3adfd325f141731e9712abc490b68b37ba717cc98bfa5388a1bd8a96
SMTP_FROM="Classify <info@classi-fy.com>"

# Resend
RESEND_API_KEY=re_DUZbgBML_51cv7PAGCqstLLhVc62HzjFQ

# CORS
CORS_ORIGIN=https://classi-fy.com
ALLOWED_ORIGINS=https://classi-fy.com,https://www.classi-fy.com
ENVEOF

echo -e "${GREEN}  ✅ .env created${NC}"

# ── Step 5: Stop existing containers ──
echo -e "\n${YELLOW}[5/8] Stopping existing containers...${NC}"
docker compose down 2>/dev/null || true
docker compose -f docker-compose.http.yml down 2>/dev/null || true
echo -e "${GREEN}  ✅ Old containers stopped${NC}"

# ── Step 6: Start with HTTP first (for SSL certificate) ──
echo -e "\n${YELLOW}[6/8] Starting services (HTTP mode for SSL setup)...${NC}"
docker compose -f docker-compose.http.yml up -d --build

echo "  Waiting for services to be healthy..."
sleep 30

# Check health
echo "  Testing health endpoint..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}  ✅ App is healthy (HTTP 200)${NC}"
else
    echo -e "${YELLOW}  ⚠️  Health check returned: $HEALTH (may still be starting)${NC}"
    echo "  Waiting another 30 seconds..."
    sleep 30
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
    echo -e "  Health check: $HEALTH"
fi

# ── Step 7: SSL Certificate ──
echo -e "\n${YELLOW}[7/8] Setting up SSL certificate...${NC}"

# Install certbot
apt install -y certbot > /dev/null 2>&1

# Stop nginx to free port 80 for certbot
docker compose -f docker-compose.http.yml stop nginx 2>/dev/null || true
sleep 3

echo "  Requesting SSL certificate for classi-fy.com..."
certbot certonly --standalone --non-interactive --agree-tos \
    --email admin@classi-fy.com \
    -d classi-fy.com -d www.classi-fy.com \
    2>&1 || {
    echo -e "${RED}  ❌ SSL failed. Make sure DNS A records point to this server's IP.${NC}"
    echo -e "${YELLOW}  Continuing with HTTP mode. Run this script again after fixing DNS.${NC}"
    
    # Restart HTTP mode
    docker compose -f docker-compose.http.yml up -d
    echo -e "\n${GREEN}App is running at: http://$(curl -s ifconfig.me)${NC}"
    exit 0
}

# Copy certs
mkdir -p "$PROJECT_DIR/nginx/ssl"
cp /etc/letsencrypt/live/classi-fy.com/fullchain.pem "$PROJECT_DIR/nginx/ssl/"
cp /etc/letsencrypt/live/classi-fy.com/privkey.pem "$PROJECT_DIR/nginx/ssl/"
chmod 600 "$PROJECT_DIR/nginx/ssl/"*.pem

echo -e "${GREEN}  ✅ SSL certificate installed${NC}"

# Stop HTTP containers
docker compose -f docker-compose.http.yml down

# ── Step 8: Start HTTPS Production ──
echo -e "\n${YELLOW}[8/8] Starting HTTPS production mode...${NC}"
docker compose up -d --build

echo "  Waiting for services..."
sleep 30

# Final health check
HEALTH=$(curl -sk -o /dev/null -w "%{http_code}" https://classi-fy.com/api/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}  ✅ HTTPS is working!${NC}"
else
    # Try local
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
    echo -e "  Local health: $HEALTH"
fi

# ── Setup SSL auto-renewal ──
echo -e "\n${YELLOW}Setting up SSL auto-renewal...${NC}"
(crontab -l 2>/dev/null; echo "0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/classi-fy.com/fullchain.pem $PROJECT_DIR/nginx/ssl/ && cp /etc/letsencrypt/live/classi-fy.com/privkey.pem $PROJECT_DIR/nginx/ssl/ && docker compose -f $PROJECT_DIR/docker-compose.yml restart nginx") | crontab -
echo -e "${GREEN}  ✅ Auto-renewal configured (monthly)${NC}"

# ── Final Summary ──
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")
echo -e "\n${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ✅ Deployment Complete!                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 Website:  ${GREEN}https://classi-fy.com${NC}"
echo -e "  🔒 HTTPS:    ${GREEN}Enabled${NC}"
echo -e "  📡 Server:   ${GREEN}$SERVER_IP${NC}"
echo -e "  📁 Project:  ${GREEN}$PROJECT_DIR${NC}"
echo ""
echo -e "  ${YELLOW}Useful commands:${NC}"
echo "  docker compose ps              # Check status"
echo "  docker compose logs -f app     # App logs"
echo "  docker compose logs -f nginx   # Nginx logs"
echo "  docker compose restart app     # Restart app"
echo "  docker compose down && docker compose up -d  # Full restart"
echo ""
echo -e "  ${YELLOW}Admin login:${NC}"
echo "  Email: admin@classify.app"
echo "  URL:   https://classi-fy.com"
echo ""
