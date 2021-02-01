FROM node:10.15.2-alpine

RUN mkdir -p /app
WORKDIR /app
COPY package*.json ./
RUN apk --no-cache add --virtual builds-deps build-base python openssl
RUN npm install
COPY . .
# Security related changes to the codebase
RUN openssl req -x509 -newkey rsa:4096 -keyout /app/ssl/server.key -out /app/ssl/server.cert -days 365 -subj '/CN=pwndoc' -nodes


EXPOSE 4242
ENV NODE_ENV prod
ENTRYPOINT ["npm", "start"]