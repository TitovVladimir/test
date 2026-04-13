FROM node:20-alpine AS build
ARG API_URL=http://api:3001
ENV API_URL=$API_URL
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# 1. Copy only dependency manifests first (cached unless deps change)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --ignore-scripts --frozen-lockfile

# 2. Copy source and build
COPY packages/shared/ packages/shared/
RUN pnpm --filter @task-manager/shared build

COPY apps/web/ apps/web/
RUN pnpm --filter @task-manager/web build

FROM node:20-alpine
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
