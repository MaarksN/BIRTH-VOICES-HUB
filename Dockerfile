# --- Stage 1: Build & Compile ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies and build tools
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and configurations
COPY tsconfig.json vite.config.ts ./
COPY src/ ./src/
COPY lib/ ./lib/
COPY components/ ./components/
COPY hooks/ ./hooks/
COPY pages/ ./pages/
COPY store/ ./store/
COPY data/ ./data/
COPY index.html index.css App.tsx index.tsx server.ts ./
COPY prisma/ ./prisma/

# Generate Prisma Client & Build the application
RUN npx prisma generate
RUN npm run build

# --- Stage 2: Production Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate

# --- Stage 3: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy artifacts from builder and deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Add Prisma schema for runtime commands if necessary
COPY prisma/ ./prisma/

# Set ownership
RUN chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 3000

# Basic healthcheck on app port
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
