FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Remove or comment out turbo.json line
# COPY turbo.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main.js"]