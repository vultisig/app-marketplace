# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for environment variables (optional, can be overridden at build time)
ARG VITE_APP_STORE_URL=http://localhost:8080
ARG VITE_FEE_APP_ID=app-slug
ARG VITE_RECURRING_SENDS_APP_ID=app-slug
ARG VITE_RECURRING_SWAPS_APP_ID=app-slug
ARG VITE_VULTISIG_SERVER=http://localhost:3000

# Set environment variables for the build
ENV VITE_APP_STORE_URL=${VITE_APP_STORE_URL}
ENV VITE_FEE_APP_ID=${VITE_FEE_APP_ID}
ENV VITE_RECURRING_SENDS_APP_ID=${VITE_RECURRING_SENDS_APP_ID}
ENV VITE_RECURRING_SWAPS_APP_ID=${VITE_RECURRING_SWAPS_APP_ID}
ENV VITE_VULTISIG_SERVER=${VITE_VULTISIG_SERVER}

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
