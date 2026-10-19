# ==========================================
# Étape 1 : Installation des dépendances (deps)
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copie des fichiers de définition des packages et du schéma Prisma
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Installation déterministe des dépendances avec npm ci
RUN npm ci

# ==========================================
# Étape 2 : Génération Prisma & Compilation Next.js (builder)
# ==========================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement factices pour la compilation Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="mysql://eduflow:eduflow@localhost:3306/eduflow"
ENV JWT_SECRET="build-secret-key-eduflow-hackathon-2026-minimum-32-chars"

# Génération du client Prisma adapté à l'environnement Alpine
RUN npx prisma generate

# Compilation de production Next.js
RUN npm run build

# ==========================================
# Étape 3 : Image d'Exécution Sécurisée (runner)
# ==========================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl wget
WORKDIR /app

# Variables d'environnement d'exécution
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Création d'un groupe et d'un utilisateur non-root pour la sécurité (CIS Benchmark)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copie des artéfacts de compilation et des dépendances
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/scripts ./scripts

# Copie du script d'entrée Docker
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Normalisation des permissions et des retours à la ligne (CRLF -> LF)
RUN mkdir -p /app/public/uploads && \
    sed -i 's/\r$//' ./docker-entrypoint.sh && \
    chmod +x ./docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app

# Définition de l'utilisateur non-root
USER nextjs

# Exposition du port applicatif
EXPOSE 3000

# Contrôle de santé Docker (Healthcheck) via l'endpoint dédié /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
