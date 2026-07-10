FROM node:22-bookworm AS builder
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN npm ci --ignore-scripts
COPY packages/domain packages/domain
COPY apps/web apps/web
RUN npm run build --workspace=@nexa/domain && npm run build --workspace=@nexa/web
FROM caddy:2.10-alpine
COPY infra/caddy/static.Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /repo/apps/web/dist /srv
USER 10001:10001
EXPOSE 8080
