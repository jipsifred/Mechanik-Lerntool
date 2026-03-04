# ── Stage 1: Build frontend ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install production dependencies (includes native modules like bcrypt)
COPY package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    apk del python3 make g++

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server code + task database + public assets
COPY server/ ./server/
COPY public/ ./public/

# Create persistent data directory for users.db
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "--import", "tsx", "server/index.ts"]
