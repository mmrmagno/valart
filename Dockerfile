FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a AS build

WORKDIR /app

# Node 25+ no longer bundles corepack. Keep in sync with "packageManager" in package.json.
RUN npm install -g pnpm@11.28.3

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

COPY . .
ARG PUBLIC_TURNSTILE_SITE_KEY=""
ENV PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY
RUN pnpm check && pnpm build

FROM nginx:1.31-alpine@sha256:df221db836e1754089190208cee7eeda94f233197056426eda74a43ab1abeac2 AS runtime

RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

COPY infra/nginx.conf /etc/nginx/nginx.conf
COPY infra/security-headers.inc /etc/nginx/security-headers.inc
COPY infra/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R a-w /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

EXPOSE 8080

USER nginx
CMD ["nginx", "-g", "daemon off;"]
