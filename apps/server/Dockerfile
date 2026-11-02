FROM node:22-alpine AS build
WORKDIR /workspace

COPY packages/content/package.json packages/content/tsconfig.json ./packages/content/
COPY packages/content/src ./packages/content/src
COPY apps/server/package.json apps/server/package-lock.json apps/server/tsconfig.json ./apps/server/
COPY apps/server/src ./apps/server/src

WORKDIR /workspace/apps/server
RUN npm install --ignore-scripts --no-audit --no-fund
RUN ./node_modules/.bin/tsc -p ../../packages/content/tsconfig.json \
  && mkdir -p node_modules/@lingo-loop/content/dist \
  && cp -R ../../packages/content/dist/. node_modules/@lingo-loop/content/dist/ \
  && npm run build \
  && npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3001 DATA_FILE=/data/lingo-loop.json
WORKDIR /app
COPY --from=build /workspace/apps/server/package.json ./package.json
COPY --from=build /workspace/apps/server/node_modules ./node_modules
COPY --from=build /workspace/apps/server/dist ./dist
RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
