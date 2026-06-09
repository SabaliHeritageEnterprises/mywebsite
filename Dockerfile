FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY turbo.json ./

RUN npm ci

COPY . .

RUN npm run build

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main.js"]