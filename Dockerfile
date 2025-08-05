# Security-hardened multi-stage Docker build
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

# Create non-root user for build stage
RUN addgroup --system --gid 1001 builduser && \
    adduser --system --uid 1001 builduser

WORKDIR /app

# Install pnpm and dependencies only when needed
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# Copy source files
COPY . .

# Create required directories with proper permissions
RUN mkdir -p public temp && \
    chown -R builduser:builduser /app && \
    pnpm run build

# Production image with security hardening
FROM --platform=$TARGETPLATFORM node:20-alpine AS runner

# Security updates and minimal packages
RUN apk add --no-cache --update \
    libc6-compat \
    dumb-init \
    && apk upgrade \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Security environment variables
ENV NODE_ENV=production \
    PORT=30000 \
    NODE_OPTIONS="--max-old-space-size=256 --max-http-header-size=8192" \
    PNPM_CONFIG_UPDATE_NOTIFIER=false \
    PNPM_CONFIG_FUND=false \
    FORCE_COLOR=0

# Create restricted non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs --home /app --no-create-home nextjs

# Create directories with minimal permissions
RUN mkdir -p public .next/static temp logs && \
    chmod 750 /app && \
    chmod 700 temp logs && \
    chown -R nextjs:nodejs /app

# Copy only necessary files with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security: Remove any potential sensitive files
RUN find /app -name "*.md" -delete && \
    find /app -name ".git*" -delete && \
    find /app -name "Dockerfile*" -delete

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:30000/api/health || exit 1

# Security: Expose only necessary port
EXPOSE 30000

# Use dumb-init for proper signal handling and security
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# Security labels
LABEL security.scan="true" \
      security.hardened="true" \
      maintainer="security@company.com"
