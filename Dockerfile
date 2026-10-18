# Production image of the management portal: the traced Next.js standalone server, run as a non-root user.
#   docker build -t pavex-management-portal .
#   docker run -p 3001:3001 -e API_BASE_URL=http://gateway:8080 pavex-management-portal
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable \
    && corepack prepare pnpm@11.10.0 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

WORKDIR /app

RUN addgroup -S -g 10001 pavex \
    && adduser -S -u 10001 -G pavex pavex

COPY --from=build --chown=pavex:pavex /app/public ./public
COPY --from=build --chown=pavex:pavex /app/.next/standalone ./
COPY --from=build --chown=pavex:pavex /app/.next/static ./.next/static

USER pavex

EXPOSE 3001

# API_BASE_URL (the gateway) is read by the server at runtime; it is not baked into the build.
CMD ["node", "server.js"]
