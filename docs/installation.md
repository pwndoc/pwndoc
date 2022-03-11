# Installation

> PwnDoc uses 3 containers: the backend, the frontend and the database. 

## Production

All 3 containers can be run at once using the docker-compose file in the root directory.

!> For production usage make sure to change the JWT secret in «src/lib/auth.js» and certificates in «ssl» folder

Build and run Docker containers
```
docker-compose up -d --build
```

Display backend container logs
```
docker-compose logs -f pwndoc-backend
```

Stop/Start containers
```
docker-compose stop
docker-compose start
```

Remove containers
```
docker-compose down
```

Update

```
docker-compose down
git pull
docker-compose up -d --build
```

Application is accessible through https://localhost:8443  
API is accessible through https://localhost:8443/api
## Development

For development purposes, specific docker-compose file can be used in each folder (backend/frontend).

> *Source code can be modified live and application will automatically reload on changes.*

Build and run backend and database containers
```
docker-compose -f backend/docker-compose.dev.yml up -d --build
```

Display backend container logs
```
docker-compose -f backend/docker-compose.dev.yml logs -f pwndoc-backend
```

Stop/Start container
```
docker-compose -f backend/docker-compose.dev.yml stop
docker-compose -f backend/docker-compose.dev.yml start
```

Remove containers
```
docker-compose -f backend/docker-compose.dev.yml down
```

Application is accessible through https://localhost:8081  
API is accessible through https://localhost:8081/api

## Tests

> For now only backend tests have been written (it's a continuous work in progress)

Test files are located in `backend/tests` using Jest testing framework

Script `run_tests.sh` at the root folder can be used to launch tests :

```
Usage:        ./run_tests.sh -q|-f [-h, --help]

Options:
  -h, --help  Display help
  -q          Run quick tests (No build)
  -f          Run full tests (Build with no cache)
```

!> **Don't use it in production as it will delete the production Database**

## Backup

It's possible, even recommended, to regularly backup the `backend/mongo-data` folder. It contains all the database.

To restore :
- Stop containers
- Replace the current `backend/mongo-data` folder with the backed up one
- Start containers


## Advanced
### Custom port

It's possible to run PwnDoc on a custom port (for example `443`), not just the default port port `8433`. The following changes are needed to the `docker-compose.yml`:

```yaml
  pwndoc-frontend:
    build:
      context: ./frontend
      args:
       - API_PORT: 443 # <--
    image: yeln4ts/pwndoc:frontend
    container_name: pwndoc-frontend
    restart: always
    ports:
      - 443:8443 # <--
    networks:
      - backend
```

Argument `API_PORT` is evaluated during frontend build time, therefore if you change it in `docker-compose.yml` than rebuild is necessary. If you want to build and start the containers, it's possible to use: `docker-compose up -d --build`

