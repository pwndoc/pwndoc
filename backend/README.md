# Installation for development environment

*Source code can be modified live and application will automatically reload on changes.*

All operations go through the `./pwndoc-cli` wrapper script at the repository root. See [docs/installation.md](../docs/installation.md) for full usage.

Build and run Docker containers
```
./pwndoc-cli up --dev
```

Display container logs
```
./pwndoc-cli logs --backend-only
```

Stop/Start containers
```
./pwndoc-cli stop
./pwndoc-cli start
```

API is accessible through https://localhost:8081/api