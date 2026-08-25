# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

# ---- deps: install with a frozen lockfile ----
FROM base AS deps
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json ./
RUN npm ci

# ---- migrate: drizzle-kit + migrations for entrypoint auto-migrate ----
FROM base AS migrate
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json ./
# Only migrate/sync deps — full `npm ci --omit=dev` pulls the entire Next.js tree
# (~hundreds of MB) and triggers BuildKit "unknown parent image ID" export failures
# on small CapRover hosts when COPY --from=migrate node_modules runs.
RUN npm install drizzle-kit@0.31.10 drizzle-orm@0.45.2 postgres@3.4.9 --omit=dev --no-save \
  && npm cache clean --force
COPY drizzle.migrate.config.ts ./
COPY src/lib/db/migrations ./src/lib/db/migrations
COPY scripts/sync-app-role-password.mjs ./scripts/sync-app-role-password.mjs
# #region agent log
RUN echo "[build-debug session=3d0783 hypothesis=A,B] migrate disk:" && df -h / && du -sh /app/node_modules
# #endregion
RUN mkdir -p /bundle/db-migrate/src/lib/db /bundle/scripts \
  && cp package.json drizzle.migrate.config.ts /bundle/db-migrate/ \
  && cp -r node_modules /bundle/db-migrate/ \
  && cp -r src/lib/db/migrations /bundle/db-migrate/src/lib/db/ \
  && cp scripts/sync-app-role-password.mjs /bundle/scripts/ \
  && tar -cf /migrate-bundle.tar -C /bundle .
# #region agent log
RUN echo "[build-debug session=3d0783 hypothesis=B] migrate bundle:" && ls -lh /migrate-bundle.tar
# #endregion

# ---- builder: compile the Next.js standalone output ----
FROM base AS builder
# CapRover injects these as build-args; declare them to avoid unconsumed warnings.
ARG AUTH_URL
ARG CAPROVER_GIT_COMMIT_SHA=unknown
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
# CapRover often builds on 1 GB droplets; override with BUILD_NODE_HEAP_MB on larger hosts.
ARG BUILD_NODE_HEAP_MB=2048
ENV NODE_OPTIONS="--max-old-space-size=${BUILD_NODE_HEAP_MB}"
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
# Re-declare: ARG does not carry across FROM. Keep demo roster + login hint in
# sync for the public image. White-label: --build-arg NEXT_PUBLIC_DEMO_SITE=false
# (also sets AUTH_ALLOW_DEMO_USERS=false). CapRover can still override at runtime.
ARG NEXT_PUBLIC_DEMO_SITE=true
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_COMMIT_SHA=${CAPROVER_GIT_COMMIT_SHA}
ENV NEXT_PUBLIC_DEMO_SITE=$NEXT_PUBLIC_DEMO_SITE
ENV AUTH_ALLOW_DEMO_USERS=$NEXT_PUBLIC_DEMO_SITE
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --link --from=migrate /migrate-bundle.tar /tmp/migrate-bundle.tar
COPY docker/entrypoint.sh /entrypoint.sh

USER root
# #region agent log
RUN echo "[build-debug session=3d0783 hypothesis=A,C] runner disk before extract:" && df -h /
# #endregion
RUN tar -xf /tmp/migrate-bundle.tar -C /app \
  && rm /tmp/migrate-bundle.tar \
  && chown -R nextjs:nodejs /app/db-migrate \
  && chmod +x /entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
