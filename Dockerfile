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

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /usr/local/app/dist/eSTOCK_frontend/browser .
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
