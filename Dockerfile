# Builds the SvelteKit app with adapter-node and runs it as a Node server. The API URL comes from
# .env.production (baked in at build time).
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app

# Coolify's Traefik proxy terminates TLS, so take the public protocol/host from its forwarded
# headers — otherwise url.origin (og:url, CSRF checks) would read http://<container>.
ENV NODE_ENV=production \
	PORT=3000 \
	PROTOCOL_HEADER=x-forwarded-proto \
	HOST_HEADER=x-forwarded-host

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./

USER node
EXPOSE 3000
CMD ["node", "build"]
