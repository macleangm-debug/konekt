#!/bin/bash
# Konekt Deployment Script
# Usage: ./deploy.sh [command]
# Commands: build, start, stop, restart, logs, seed, status

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_env() {
    if [ ! -f "./backend/.env" ]; then
        log_error "backend/.env not found!"
        log_info "Copy backend/.env.production to backend/.env and fill values"
        exit 1
    fi
    
    # Check critical vars
    source ./backend/.env
    
    if [ "$JWT_SECRET" == "CHANGE_ME_TO_RANDOM_32_CHAR_STRING" ]; then
        log_error "JWT_SECRET not set! Generate with: openssl rand -base64 32"
        exit 1
    fi
    
    if [ -z "$EMERGENT_LLM_KEY" ] || [ "$EMERGENT_LLM_KEY" == "your-emergent-llm-key-here" ]; then
        log_warn "EMERGENT_LLM_KEY not set - AI features will be disabled"
    fi
    
    if [ -z "$RESEND_API_KEY" ] || [ "$RESEND_API_KEY" == "re_your_resend_api_key_here" ]; then
        log_warn "RESEND_API_KEY not set - Email features will be disabled"
    fi
    
    log_info "Environment check passed"
}

build() {
    log_info "Building containers..."
    docker-compose build --no-cache
    log_info "Build complete"
}

start() {
    check_env
    log_info "Starting Konekt..."
    docker-compose up -d
    log_info "Waiting for services to be healthy..."
    sleep 10
    docker-compose ps
    log_info "Konekt is running!"
    log_info "Frontend: http://localhost (or your domain)"
    log_info "API: http://localhost/api"
}

stop() {
    log_info "Stopping Konekt..."
    docker-compose down
    log_info "Konekt stopped"
}

restart() {
    stop
    start
}

logs() {
    docker-compose logs -f ${2:-}
}

seed() {
    log_info "Seeding database..."
    docker-compose exec backend python seed_products.py
    log_info "Database seeded"
}

status() {
    docker-compose ps
    echo ""
    log_info "Health checks:"
    echo "Backend: $(curl -s http://localhost/api/health 2>/dev/null || echo 'Not responding')"
    echo "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost 2>/dev/null || echo 'Not responding')"
}

ssl_setup() {
    log_info "Setting up SSL with Let's Encrypt..."
    mkdir -p ./nginx/ssl
    
    # Using certbot with nginx
    docker run -it --rm \
        -v $(pwd)/nginx/ssl:/etc/letsencrypt \
        -v $(pwd)/nginx/www:/var/www/certbot \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        -d konekt.co.tz \
        -d www.konekt.co.tz \
        --email info@konekt.co.tz \
        --agree-tos \
        --no-eff-email
    
    log_info "SSL certificates generated"
    log_info "Restart nginx to apply: docker-compose restart nginx"
}

case "$1" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$@"
        ;;
    seed)
        seed
        ;;
    status)
        status
        ;;
    ssl)
        ssl_setup
        ;;
    *)
        echo "Konekt Deployment Script"
        echo ""
        echo "Usage: $0 {build|start|stop|restart|logs|seed|status|ssl}"
        echo ""
        echo "Commands:"
        echo "  build    - Build all containers"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - View logs (optional: logs backend)"
        echo "  seed     - Seed database with products"
        echo "  status   - Check service status"
        echo "  ssl      - Setup Let's Encrypt SSL"
        ;;
esac
