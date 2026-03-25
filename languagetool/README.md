# pwndoc-languagetools

Optional spellcheck/grammar service for [PwnDoc](https://github.com/pwndoc/pwndoc). Wraps [LanguageTool](https://languagetool.org/) with a management API for custom grammar rules.

## Features

- Proxies `/v2/check` requests to LanguageTool (single port: 8020)
- Manages custom grammar rules via REST API
- Auto-generates an API key on first startup for authentication
- Supports fasttext-based automatic language detection

## Deployment

### Option 1 — Same host as PwnDoc (simplest)

Use the built-in convenience flag:

```bash
./pwndoc-cli up --with-lt
```

The service runs alongside PwnDoc on the same host, communicating over the internal Docker network. HTTP is fine here — traffic never leaves the host.

Then in PwnDoc: **Settings > Report > Spellcheck**, set:
- **URL**: `http://pwndoc-languagetools:8020` (internal Docker hostname)
- **API Key**: retrieve it with:

```bash
./pwndoc-cli lt-apikey
```

---

### Option 2 — Separate server

Run the container on a dedicated host:

```bash
docker run -d \
  --name pwndoc-languagetools \
  --init \
  --restart always \
  -p 8020:8020 \
  -v languagetools-data:/data \
  -e LT_JAVA_XMX=1g \
  ghcr.io/pwndoc/pwndoc-languagetools:latest
```

Retrieve the API key:

```bash
docker exec pwndoc-languagetools cat /data/api-key
```

Then in PwnDoc settings, set the URL to `http://<server-ip>:8020`.

**Important:** Plain HTTP over an untrusted network exposes the API key in transit. If the server is reachable from the internet or an untrusted network, put a reverse proxy in front with TLS:

```nginx
server {
    listen 443 ssl;
    server_name languagetool.example.com;

    ssl_certificate     /etc/ssl/certs/lt.crt;
    ssl_certificate_key /etc/ssl/private/lt.key;

    location / {
        proxy_pass http://127.0.0.1:8020;
    }
}
```

Then set the URL in PwnDoc to `https://languagetool.example.com`.

If the separate server is on a private network or VPN, plain HTTP is acceptable since the network provides transport security.

---

### Option 3 — Use the public LanguageTool API

No self-hosting needed. In PwnDoc settings, set:
- **URL**: `https://api.languagetoolplus.com`
- **API Key** + **Username**: required for the Premium tier, leave empty for the free tier

The free tier has rate limits (~20 requests/min) and no custom grammar rules support.

---

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `LT_JAVA_XMS` | `512m` | Java minimum heap size |
| `LT_JAVA_XMX` | `1g` | Java maximum heap size |
| `API_KEY` | auto-generated | Fixed API key (overrides auto-generation, useful for reproducible deployments) |
| `REQUIRE_API_KEY` | `true` | Set to `false` to disable API key validation |
| `LT_PORT` | `8020` | Host port to bind when using the compose override |

## API Endpoints

All admin endpoints require the `X-Api-Key` header (unless `REQUIRE_API_KEY=false`). The `/v2/check` proxy accepts the key as either the `X-Api-Key` header or an `apiKey` form parameter.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Health check — returns `{ type: 'pwndoc-languagetools' }` |
| `POST` | `/v2/check` | API key | Proxy to LanguageTool spellcheck |
| `GET` | `/api/languages` | API key | List supported languages |
| `POST` | `/api/rules/update-grammar` | API key | Push custom rules for a language |
| `POST` | `/api/rules/restart` | API key | Restart LanguageTool to apply rule changes |

## How It Works

PwnDoc communicates with this service over HTTP using a URL and API key configured in settings. On startup and after every rule change, PwnDoc pushes the latest custom grammar rules to this service via the admin API. Rules are persisted as `grammar.xml` files in a Docker volume. LanguageTool (Java) runs internally on port 8010 and is proxied through the Node.js management API on port 8020 — only port 8020 needs to be exposed.
