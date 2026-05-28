FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/drizzle ./drizzle
RUN bun install --frozen-lockfile --production
EXPOSE 3000
CMD ["bun", "./build/index.js"]
