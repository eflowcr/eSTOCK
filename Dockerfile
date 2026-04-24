FROM node:22-alpine AS build
WORKDIR /usr/local/app

ARG API_BASE=/api
ARG ENVIRONMENT=production
ARG VERSION=0.0.0
ARG TESTING=false
ARG PRODUCTION=true

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Create .env from build args so load-env.js generates environment.generated.ts
RUN printf "API_BASE=%s\nVERSION=%s\nTESTING=%s\nPRODUCTION=%s\n" \
      "$API_BASE" "$VERSION" "$TESTING" "$PRODUCTION" > .env

RUN npm run build -- --configuration=$ENVIRONMENT --source-map=false

# nginx-unprivileged runs as uid 101 and binds on :8080 (required by VPS Manager SecurityContext)
FROM nginxinc/nginx-unprivileged:alpine
WORKDIR /usr/share/nginx/html
USER root
RUN rm -rf ./*
COPY --from=build --chown=nginx:nginx /usr/local/app/dist/eSTOCK_frontend/browser .
COPY --chown=nginx:nginx ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
USER 101:101

EXPOSE 8080
ENTRYPOINT ["nginx", "-g", "daemon off;"]
