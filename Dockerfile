
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─────────────────────────────────────────────────────────
FROM node:18-alpine AS production

WORKDIR /app

# Install curl for the healthcheck
RUN apk add --no-cache curl

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Expose the API port (default 8080; overridden by env)
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]
