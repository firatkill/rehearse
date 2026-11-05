FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.14.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 APP_EDITION=full LLM_MODE=live RATE_LIMIT_BACKEND=memory \
    OPENAI_API_KEY=build-placeholder CHAT_MODEL=build-placeholder PRICE_INPUT_PER_MTOK=0 PRICE_OUTPUT_PER_MTOK=0 \
    SESSION_SECRET=build-only-session-secret-000000000000000000 \
    IP_HASH_SECRET=build-only-ip-hash-secret-000000000000000000 \
    NEXT_PUBLIC_SITE_URL=http://localhost:3000
RUN mkdir -p public && pnpm build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production APP_EDITION=full DATA_DIR=/data HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p /data && chown node:node /data /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD node -e 'const h=process.env.APP_PASSWORD?{Authorization:"Basic "+Buffer.from("rehearse:"+process.env.APP_PASSWORD).toString("base64")}:{};fetch("http://127.0.0.1:3000/api/health",{headers:h}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'
CMD ["node", "server.js"]
