# syntax=docker/dockerfile:1

# ---- Base ----
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ---- Production Dependencies ----
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --omit=peer

# Prune unnecessary Wasm files from Prisma Client for production runtime
RUN rm -f node_modules/@prisma/client/runtime/*.cockroachdb.wasm* \
    && rm -f node_modules/@prisma/client/runtime/*.mysql.wasm* \
    && rm -f node_modules/@prisma/client/runtime/*.sqlite.wasm* \
    && rm -f node_modules/@prisma/client/runtime/*.sqlserver.wasm*

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate && bun run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# 1. Copy the pruned production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# 2. Copy the generated client from BUILDER (keeps it in sync with your schema)
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# 3. Copy only the CLI machinery from DEPS for migrations
COPY --from=deps /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma

# 4. Copy configurations and build output
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY --chmod=755 scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
