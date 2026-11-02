# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /workspace

COPY packages/content/package.json packages/content/tsconfig.json ./packages/content/
COPY packages/content/src ./packages/content/src
COPY apps/server/package.json apps/server/package-lock.json apps/server/tsconfig.json ./apps/server/
COPY apps/server/src ./apps/server/src

WORKDIR /workspace/apps/server
RUN --mount=type=secret,id=proxy_ca \
  if [ -f /run/secrets/proxy_ca ]; then \
    NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci --ignore-scripts --strict-ssl=true --no-audit --no-fund; \
  else \
    npm ci --ignore-scripts --strict-ssl=true --no-audit --no-fund; \
  fi
RUN ./node_modules/.bin/tsc -p ../../packages/content/tsconfig.json \
  && npm run build \
  && npm prune --omit=dev --ignore-scripts

FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3001 DATA_FILE=/data/lingo-loop.sqlite
WORKDIR /app
COPY --from=build /workspace/apps/server/package.json ./package.json
COPY --from=build /workspace/apps/server/node_modules ./node_modules
COPY --from=build /workspace/apps/server/dist ./dist
COPY --from=build --chown=node:node /workspace/packages/content /packages/content
RUN mkdir -p /data && chown -R node:node /app /data /packages/content
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
