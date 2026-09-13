# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
# --ignore-scripts : `prepare` lance svelte-kit sync, qui exige les sources.
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
WORKDIR /app
COPY . .
RUN bunx prisma generate && bun run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Le serveur ne tourne pas en root : une faille applicative ne doit pas donner
# les droits d'ecriture sur l'image.
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app

COPY --from=build --chown=app:app /app/build ./build
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/prisma ./prisma

RUN mkdir -p /var/storage && chown app:app /var/storage

USER app
EXPOSE 3000
CMD ["node", "build"]
