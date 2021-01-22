### STAGE 1: Build ###
FROM node:lts-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

### STAGE 2: Run ###
FROM nginx:stable-alpine
RUN apk --no-cache add openssl
COPY .docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /etc/nginx/ssl
RUN openssl req -x509 -newkey rsa:4096 -keyout /etc/nginx/ssl/server.key -out /etc/nginx/ssl/server.cert -days 365 -subj '/CN=pwndoc' -nodes
COPY --from=build /app/dist/spa /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]