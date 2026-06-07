# ============================================
# TN Education Platform — Frontend Dockerfile
# Multi-stage build: build + serve with nginx
# ============================================

# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .

# Build arg for API URL (override at build time)
ARG VITE_API_BASE_URL=http://116.118.45.116:8000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npx vite build

# --- Stage 2: Serve with nginx ---
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
