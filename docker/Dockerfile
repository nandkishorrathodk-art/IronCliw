# Multi-stage Dockerfile for IronCliw
# 2x Better Than IronCliw - Full Container Support

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    ffmpeg \
    curl \
    ca-certificates

COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    bash \
    tzdata \
    && ln -sf /usr/share/zoneinfo/UTC /etc/localtime

# Create ironcliw user
RUN addgroup -g 1000 ironcliw && \
    adduser -u 1000 -G ironcliw -s /bin/bash -D ironcliw

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/skills ./skills
COPY --from=builder /app/extensions ./extensions

# Create necessary directories
RUN mkdir -p /app/workspace /app/logs /app/config /app/data && \
    chown -R ironcliw:ironcliw /app

# Switch to ironcliw user
USER ironcliw

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose ports
EXPOSE 3000 8080 9090

# Environment variables
ENV NODE_ENV=production \
    IRONCLI_WORKSPACE=/app/workspace \
    IRONCLI_LOGS=/app/logs \
    IRONCLI_CONFIG=/app/config

VOLUME ["/app/workspace", "/app/logs", "/app/config", "/app/data"]

CMD ["node", "dist/index.js"]

# Stage 4: Development
FROM node:20-alpine AS development
WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    ffmpeg \
    curl \
    ca-certificates \
    bash

COPY . .
RUN npm install

EXPOSE 3000 8080 9090

CMD ["npm", "run", "dev"]
