FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN apt-get update && apt-get install --yes --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
  SHADOW_DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder_shadow \
  pnpm --filter @flowpeek/api db:generate \
  && pnpm --filter @flowpeek/api build
RUN pnpm --filter @flowpeek/api deploy --legacy --prod /production

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install --yes --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/prisma ./prisma
COPY --from=build /workspace/apps/api/prisma.config.ts ./prisma.config.ts
COPY --from=build /production/package.json ./package.json
COPY --from=build /production/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
