FROM oven/bun:1.4.5 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.4.5-slim
WORKDIR /app
ENV NODE_ENV=production
# This upgrade applies Debian fixes newer than the base image. BuildKit reuses a cached layer,
# so a fix published after the layer was built lands only when the layer rebuilds. The RUN
# echoes APT_REFRESH: set it to today's date to rebuild the layer when a scan flags an OS
# package that a fresh upgrade fixes (#158).
# curl is for Coolify's health check and the daily-reminder-push task (DEPLOY.md sections 5, 6).
ARG APT_REFRESH=2026-11-23
RUN echo Debian packages refreshed ${APT_REFRESH} && apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/build ./build
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/drizzle ./drizzle
# The daily-db-backup task runs `bun run db:backup`, which runs scripts/backup.ts from source.
# Copy it with each file it imports.
COPY --from=build /app/scripts/backup.ts ./scripts/
COPY --from=build /app/src/lib/server/backup.ts ./src/lib/server/
RUN bun install --frozen-lockfile --production
# Run as the base image's bun user (uid 1000, gid 1000). A fresh volume mounted at /app/data
# takes this directory's owner; one a root container wrote needs `chown -R 1000:1000` (DEPLOY.md
# section 4).
RUN mkdir -p /app/data && chown bun:bun /app/data
USER bun
EXPOSE 3000
CMD ["bun", "./build/index.js"]
