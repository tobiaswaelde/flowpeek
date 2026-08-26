FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN apt-get update && apt-get install --yes --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @flowpeek/api db:generate && pnpm --filter @flowpeek/api build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install --yes --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/prisma ./prisma
COPY --from=build /workspace/apps/api/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
