# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

# ---- deps: install with a frozen lockfile ----
FROM base AS deps
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the Next.js standalone output ----
FROM base AS builder
# CapRover injects these as build-args; declare them to avoid unconsumed warnings.
ARG AUTH_URL
ARG CAPROVER_GIT_COMMIT_SHA=unknown
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
# CapRover often builds on 1 GB droplets; cap Node heap during next build.
ENV NODE_OPTIONS="--max-old-space-size=768"
# AUTH_SECRET is only needed at runtime; a build-time placeholder keeps
# Auth.js route collection happy during `next build`.
ARG AUTH_SECRET=build-time-placeholder-not-used-at-runtime
ENV AUTH_SECRET=$AUTH_SECRET
# Soft-launch defaults for the public demo host. Override at build time for a
# production white-label: NEXT_PUBLIC_OFFICER_HUB_PUBLIC=false NEXT_PUBLIC_DEMO_SITE=false
ARG NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true
ENV NEXT_PUBLIC_OFFICER_HUB_PUBLIC=$NEXT_PUBLIC_OFFICER_HUB_PUBLIC
ARG NEXT_PUBLIC_DEMO_SITE=true
ENV NEXT_PUBLIC_DEMO_SITE=$NEXT_PUBLIC_DEMO_SITE
RUN npm run build

# ---- runner: minimal production image ----
FROM base AS runner
ARG CAPROVER_GIT_COMMIT_SHA=unknown
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_COMMIT_SHA=${CAPROVER_GIT_COMMIT_SHA}
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY docker/entrypoint.sh /entrypoint.sh

USER root
RUN chmod +x /entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
