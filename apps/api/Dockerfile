# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

COPY apps/api ./apps/api
RUN npm run build -w @budget/api
RUN npm prune --omit=dev

FROM node:22-alpine AS api-runner
WORKDIR /app
ENV NODE_ENV=production API_PORT=4000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 api

COPY --from=build --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=api:nodejs /app/apps/api/dist ./dist

USER api
EXPOSE 4000
CMD ["node", "dist/main.js"]

