### STAGE 1: Build ###
FROM node:lts-alpine AS frontend-build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

### STAGE 2: Run ###
FROM nginx:stable-alpine
RUN mkdir -p /etc/nginx/ssl
COPY ssl/server* /etc/nginx/ssl/
COPY .docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY .docker/nginx/snippets /etc/nginx/snippets

COPY --from=frontend-build /app/dist/spa /usr/share/nginx/html

EXPOSE 8443

CMD ["nginx", "-g", "daemon off;"]