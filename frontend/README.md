The frontend uses Vue 3 and the Quasar framework.

It has to be used with the backend.

# Installation for development environment

*Source code can be modified live and application will automatically hot reload in browser.*

All operations go through the `./pwndoc-cli` wrapper script at the repository root. See [docs/installation.md](../docs/installation.md) for full usage.

Build and run Docker containers
```
./pwndoc-cli up --dev
```

Display container logs
```
./pwndoc-cli logs --frontend-only
```

Stop/Start containers
```
./pwndoc-cli stop
./pwndoc-cli start
```

Application is accessible through https://localhost:8081