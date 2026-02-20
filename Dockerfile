# Multi-stage Dockerfile for CatchUp Application
# Stage 1: Build stage - compile TypeScript and run tests
FROM node:20-alpine AS builder

# Build argument for version (passed from Cloud Build)
ARG APP_VERSION=dev-local

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building and testing)
RUN npm install

# Copy source code
COPY src ./src
COPY tsconfig.json ./
COPY eslint.config.mjs ./
COPY .prettierrc.json ./
COPY vitest.config.ts ./

# Build TypeScript
RUN npm run build

# Stage 2: Runtime stage - minimal production image
FROM node:20-alpine

# Build argument for version
ARG APP_VERSION=dev-local

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy public assets for serving static files
COPY public ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Expose port 3000
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV APP_VERSION=$APP_VERSION

# Health check - verify application is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Switch to non-root user
USER nodejs

# Start the application with garbage collection exposed
CMD ["node", "--expose-gc", "--max-old-space-size=4096", "dist/index.js"]
