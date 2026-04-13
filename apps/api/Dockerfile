FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# 1. Copy only dependency manifests first (cached unless deps change)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --ignore-scripts --frozen-lockfile

# 2. Copy source and build
COPY packages/shared/ packages/shared/
RUN pnpm --filter @task-manager/shared build

COPY apps/api/ apps/api/
RUN cd apps/api && npx prisma@6 generate
RUN pnpm --filter @task-manager/api build

# 3. Create production deployment
RUN pnpm --filter @task-manager/api deploy --prod /deploy
RUN cd /deploy && npx prisma@6 generate

FROM node:20-alpine
RUN apk update && apk add postgresql-client
COPY --from=build /deploy /app
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 3001
CMD echo "Ensuring database exists..." && PGPASSWORD=$POSTGRES_PASSWORD createdb -h postgres -U $POSTGRES_USER $POSTGRES_DB 2>/dev/null; echo "Pushing schema..." && npx prisma@6 db push --skip-generate && echo "Starting app..." && node dist/main
