FROM node:22-slim AS builder

# Install OpenSSL and Prisma dependencies
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Build TypeScript
RUN npm run build

# Production stage - Use Debian-based for better compatibility
FROM node:22-slim

# Install OpenSSL for production
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Regenerate Prisma client for production
RUN npx prisma generate

EXPOSE 3000

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]