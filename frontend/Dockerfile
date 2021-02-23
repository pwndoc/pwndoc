### STAGE 1: Build ###
FROM node:lts-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

### STAGE 2: Run ###
FROM nginx:stable-alpine
COPY .docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /etc/nginx/ssl
COPY ssl/server* /etc/nginx/ssl/
COPY --from=build /app/dist/spa /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]