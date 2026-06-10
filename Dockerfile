# Builder stage
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

RUN npm ci --legacy-peer-deps
RUN cd apps/api && npx prisma generate

# ✅ CORRECT - Only copy from apps/api
COPY apps/api ./apps/api
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json

RUN cd apps/api && npm run build

# Production stage
FROM node:22-slim

RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "cd /app/apps/api && npx prisma migrate deploy && node dist/main.js"]