# Builder stage
FROM node:22-slim AS builder

# Install OpenSSL and build dependencies
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy API package files
COPY apps/api/package*.json ./apps/api/

# Copy Prisma schema
COPY apps/api/prisma ./apps/api/prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Copy source code
COPY apps/api ./apps/api
COPY tsconfig.json ./tsconfig.json

# Build the TypeScript code
RUN cd apps/api && npm run build

# Production stage
FROM node:22-slim

# Install OpenSSL for production
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/api/package*.json ./apps/api/

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Set working directory to API
WORKDIR /app/apps/api

# Generate Prisma client for production
RUN npx prisma generate

# Expose port
EXPOSE 4000

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]