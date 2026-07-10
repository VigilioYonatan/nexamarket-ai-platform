FROM node:22-bookworm AS builder
WORKDIR /repo
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
# A committed npm lockfile is REQUIRED for reproducible production builds.
COPY package-lock.json ./
RUN npm ci --ignore-scripts
COPY packages/domain packages/domain
COPY apps/api apps/api
COPY tsconfig.base.json ./
RUN npm run build --workspace=@nexa/domain && npm run build --workspace=@nexa/api
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/packages/domain/package.json /repo/packages/domain/package.json
COPY --from=builder /repo/packages/domain/dist /repo/packages/domain/dist
COPY --from=builder /repo/apps/api/package.json /repo/apps/api/package.json
COPY --from=builder /repo/apps/api/dist /repo/apps/api/dist
COPY --from=builder /repo/apps/api/migrations /repo/apps/api/migrations
WORKDIR /repo/apps/api
USER 10001:10001
EXPOSE 4000
CMD ["node", "dist/main.js"]
