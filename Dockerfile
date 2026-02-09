# Dockerfile optimized for Ubuntu 24.04 LTS (Hostinger VPS)
# Multi-stage build for smaller production image
# Optimized for 5000+ concurrent users

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cache optimization)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install production utilities (curl for health checks, busybox-extras for netcat)
RUN apk add --no-cache curl wget busybox-extras

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy package files
COPY package*.json ./

# Install production dependencies + drizzle-kit and typescript for migrations
RUN npm ci --omit=dev && \
    npm install drizzle-kit drizzle-orm typescript tsx @neondatabase/serverless bcrypt && \
    npm cache clean --force

# Copy built files from builder (dist contains both server and client)
COPY --from=builder /app/dist ./dist

# Copy shared schema and migrations
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Copy entrypoint script
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x ./scripts/docker-entrypoint.sh

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && \
    chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start command with entrypoint
CMD ["sh", "./scripts/docker-entrypoint.sh"]
