# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ─── Stage 2: Runner ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache sqlite

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma migration files and the generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

ENV PATH="/app/node_modules/.bin:$PATH"

# Copy seed script and entrypoint
COPY --from=builder /app/prisma/seed.ts ./prisma/seed.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Data volume mount point
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/prod.db

ENTRYPOINT ["./docker-entrypoint.sh"]
