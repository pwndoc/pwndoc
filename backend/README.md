# Installation for developpment environnment

*Source code can be modified live and application will automatically reload on changes.*

Build and run Docker containers
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

API is accessible through https://localhost:5252/api