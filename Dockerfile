# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# Install dependencies first (layer cached unless package files change)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# VITE_* vars must be present at build time — they are baked into the JS bundle
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Run ──────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

# Install only what vite preview needs (vite is a devDep)
COPY package*.json ./
COPY vite.config.ts ./
RUN npm ci

# Copy the built static files from the build stage
COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node_modules/.bin/vite", "preview", "--host", "0.0.0.0", "--port", "8080"]