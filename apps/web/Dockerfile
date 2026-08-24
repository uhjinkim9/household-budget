# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build -w @budget/web

FROM node:22-alpine AS web-runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 web

COPY --from=build --chown=web:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=web:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=web:nodejs /app/apps/web/public ./apps/web/public

USER web
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

