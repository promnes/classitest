#!/bin/bash

# Classify Deployment Script for Hostinger VPS (Ubuntu 24.04 LTS)
# Optimized for 5000+ concurrent users

set -e

echo "========================================"
echo "  Classify - Production Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Consider using a non-root user.${NC}"
fi

# Check for required environment variables
check_env() {
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}Error: DATABASE_URL is not set${NC}"
        exit 1
    fi
    if [ -z "$JWT_SECRET" ]; then
        echo -e "${RED}Error: JWT_SECRET is not set${NC}"
        exit 1
    fi
    echo -e "${GREEN}Environment variables validated${NC}"
}

# Install Docker if not present
install_docker() {
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo -e "${GREEN}Docker installed successfully${NC}"
    else
        echo -e "${GREEN}Docker is already installed${NC}"
    fi
}

# Install Docker Compose if not present
install_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        echo "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo -e "${GREEN}Docker Compose installed successfully${NC}"
    else
        echo -e "${GREEN}Docker Compose is already installed${NC}"
    fi
}

# Create SSL directory
setup_ssl() {
    mkdir -p nginx/ssl nginx/logs
    
    if [ ! -f nginx/ssl/fullchain.pem ]; then
        echo -e "${YELLOW}Note: SSL certificates not found in nginx/ssl/${NC}"
        echo "Creating self-signed certificates for development..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/privkey.pem \
            -out nginx/ssl/fullchain.pem \
            -subj "/C=SA/ST=Riyadh/L=Riyadh/O=Classify/CN=localhost"
        echo -e "${YELLOW}For production, use Let's Encrypt with certbot${NC}"
    fi
}

# Build and start containers
deploy() {
    echo "Building Docker images..."
    docker-compose build --no-cache
    
    echo "Starting containers..."
    docker-compose up -d
    
    echo "Waiting for services to be healthy..."
    sleep 10
    
    echo "Running database migrations..."
    docker-compose exec app npm run db:push
    
    echo -e "${GREEN}Deployment completed successfully!${NC}"
}

# Main execution
main() {
    echo "Step 1: Checking environment..."
    check_env
    
    echo "Step 2: Installing Docker..."
    install_docker
    
    echo "Step 3: Installing Docker Compose..."
    install_docker_compose
    
    echo "Step 4: Setting up SSL..."
    setup_ssl
    
    echo "Step 5: Deploying application..."
    deploy
    
    echo ""
    echo "========================================"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo "========================================"
    echo ""
    echo "Application is running at:"
    echo "  - HTTP:  http://your-domain.com"
    echo "  - HTTPS: https://your-domain.com"
    echo ""
    echo "Useful commands:"
    echo "  docker-compose logs -f app    # View app logs"
    echo "  docker-compose ps             # Check status"
    echo "  docker-compose restart app    # Restart app"
    echo "  docker-compose down           # Stop all services"
}

main "$@"
