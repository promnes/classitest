#!/bin/bash

# ==============================================================================
# Classify Fast Deployment Script
# ==============================================================================
# Optimized for Hostinger Docker Manager - Minimal downtime updates
# 
# Usage:
#   ./scripts/deploy-fast.sh                 # Pull from main branch
#   ./scripts/deploy-fast.sh dev             # Pull from dev branch
#   ./scripts/deploy-fast.sh --no-build      # Skip rebuild (env changes only)
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BRANCH="${1:-main}"
NO_BUILD=false
PROJECT_DIR="/docker/classitest"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --no-build) NO_BUILD=true ;;
        *) BRANCH="$1" ;;
    esac
    shift
done

echo -e "${BLUE}========================================"
echo "  Classify - Fast Deployment"
echo "  Branch: $BRANCH"
echo "========================================${NC}"

# Check if running on VPS
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Not on VPS. Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Git Pull
echo -e "\n${YELLOW}[1/5] Pulling latest code from $BRANCH...${NC}"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
echo -e "${GREEN}✓ Code updated${NC}"

# Step 2: Check if .env exists
echo -e "\n${YELLOW}[2/5] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found. Copy from .env.example first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Environment configured${NC}"

# Step 3: Rebuild or just restart
if [ "$NO_BUILD" = true ]; then
    echo -e "\n${YELLOW}[3/5] Skipping build (--no-build flag)${NC}"
else
    echo -e "\n${YELLOW}[3/5] Building updated image...${NC}"
    # Use BuildKit for faster builds with layer caching
    DOCKER_BUILDKIT=1 docker compose build app
    echo -e "${GREEN}✓ Image built successfully${NC}"
fi

# Step 4: Restart containers
echo -e "\n${YELLOW}[4/5] Restarting services...${NC}"
docker compose up -d --force-recreate app
echo -e "${GREEN}✓ Services restarted${NC}"

# Step 5: Wait and verify health
echo -e "\n${YELLOW}[5/5] Verifying deployment...${NC}"
sleep 10

# Check container status
APP_CONTAINER=$(docker ps --filter "name=app" --format "{{.Names}}" | head -1)
if [ -n "$APP_CONTAINER" ]; then
    echo -e "${GREEN}✓ Container is running: $APP_CONTAINER${NC}"
else
    echo -e "${RED}✗ Container failed to start${NC}"
    echo -e "${YELLOW}Showing logs:${NC}"
    docker compose logs app --tail=50
    exit 1
fi

# Check health endpoint (retry up to 6 times = 60 seconds)
for i in $(seq 1 6); do
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
    if [ "$HEALTH_CHECK" = "200" ]; then
        echo -e "${GREEN}✓ Health check passed (HTTP 200)${NC}"
        break
    fi
    if [ "$i" -eq 6 ]; then
        echo -e "${RED}✗ Health check failed after 60s (HTTP $HEALTH_CHECK)${NC}"
        echo -e "${YELLOW}Showing recent logs:${NC}"
        docker compose logs app --tail=30
        exit 1
    fi
    echo -e "  Waiting for app to start... (attempt $i/6)"
    sleep 10
done

# Show container info
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
docker compose ps

echo -e "\n${YELLOW}Useful commands:${NC}"
echo "  View logs:        docker compose logs -f app"
echo "  Check status:     docker compose ps"
echo "  Restart:          docker compose restart app"
echo "  Full rebuild:     docker compose up -d --build"
echo ""
