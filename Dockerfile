# syntax=docker/dockerfile:1

# ==============================================================================
# Base Image: Lightweight Node.js Alpine with libc6 compatibility
# ==============================================================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ==============================================================================
# Dependencies Stage: Install all dependencies
# ==============================================================================
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else npm install; \
  fi

# ==============================================================================
# Builder Stage: Build Next.js in standalone mode
# ==============================================================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ==============================================================================
# Runner Stage: Minimal production image optimized for Google Cloud Run / GCP
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Google Cloud Run injects $PORT (defaulting to 8080).
# HOSTNAME="0.0.0.0" ensures the container listens across all network interfaces.
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Create non-root system user for enhanced container security on GCP
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone bundle
COPY --from=builder /app/public ./public

# Next.js standalone output contains only the required production files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
