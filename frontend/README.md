The frontend uses Vuejs and Quasar framework.

It has to be used with the backend.

# Installation for developpment environnment

*Source code can be modified live and application will automatically hot reload in browser.*

Build and run Docker container
```
docker-compose -f ./docker-compose.dev.yml up -d --build
```

Display container logs
```
docker-compose logs -f
```

Stop/Start container
```
docker-compose stop
docker-compose start
```

Application is accessible through https://localhost:8081