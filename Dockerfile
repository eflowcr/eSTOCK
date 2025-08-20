FROM node:20-alpine AS build

WORKDIR /usr/local/app

COPY ./ /usr/local/app/

# INSTALL ANGULAR
RUN npm install -g @angular/cli

RUN npm cache clean --force
RUN npm install --peer-legacy-deps --force

# RUN npm run build

RUN ng build --configuration=production --source-map=false

# RUN mv dist /usr/local/app/

FROM nginx:latest
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /usr/local/app/dist/eSTOCK_frontend/browser /usr/share/nginx/html
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
