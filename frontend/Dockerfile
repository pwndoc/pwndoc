### STAGE 1: Build ###
FROM node:lts-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

### STAGE 2: Run ###
FROM nginx:stable-alpine
RUN apk add --no-cache gettext
COPY .docker/nginx.conf.template /etc/nginx/templates/default.conf.template
RUN mkdir -p /etc/nginx/ssl
COPY ssl/server* /etc/nginx/ssl/
COPY --from=build /app/dist/spa /usr/share/nginx/html
CMD ["sh", "-c", "envsubst '$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
# CMD ["nginx", "-g", "daemon off;"]