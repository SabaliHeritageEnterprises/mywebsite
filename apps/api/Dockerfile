# ---- Build stage ----
# Build context is the repository root.
FROM node:20-alpine AS builder
WORKDIR /app

# Install all dependencies (monorepo root + workspaces)
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm install

# Copy full source
COPY . .

# Prisma requires DATABASE_URL at generate time; use .env.example as a
# build-time stub so the client is generated even without a live database.
RUN cp apps/api/.env.example apps/api/.env 2>/dev/null || \
    echo "DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy" > apps/api/.env

# Generate Prisma client and compile TypeScript
RUN npm run build -w apps/api

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm install --omit=dev --workspace=apps/api && npm cache clean --force

# Compiled output lives at apps/api/dist (nest build output dir)
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# Prisma schema (needed for migrate deploy at runtime)
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
# Generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

# Run pending migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/main.js"]
