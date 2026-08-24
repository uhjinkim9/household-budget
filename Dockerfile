# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

COPY apps ./apps

# Browser requests use the same origin. Next.js proxies /api to the API process.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_PORT=4000 \
    API_INTERNAL_URL=http://127.0.0.1:4000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 app

COPY --from=build --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=app:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=app:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:nodejs /app/apps/web/public ./apps/web/public
COPY --chown=app:nodejs scripts/start-production.mjs ./scripts/start-production.mjs

USER app
EXPOSE 3000
CMD ["node", "scripts/start-production.mjs"]

