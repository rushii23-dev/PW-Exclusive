# ClearClause — production image for Google Cloud Run (or any container host).
#
#   docker build -t clearclause .
#   docker run -p 8080:8080 -e GEMINI_API_KEY=... clearclause

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
# The standalone bundle carries only what the server needs at runtime, owned
# by root and run as the unprivileged `node` user, so the app cannot rewrite
# its own code. There is no public/ folder to copy: the icon is served from
# src/app and everything else is built into .next/static.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 8080
# For `docker run` and orchestrators that honour it; Cloud Run probes on its own.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server.js"]
