# Docker Deployment

## Build

```bash
docker build -t editing-in-house-backend .
```

## Run

```bash
docker run -p 3001:3001 \
  -e PORT=3001 \
  -e ALLOW_ORIGIN=http://localhost:5173 \
  -e PROVIDER_VIDEO=demo \
  -e PROVIDER_IMAGE=demo \
  -e PROVIDER_VOICE=demo \
  -e GEMINI_API_KEY=your-key-here \
  -e PERSIST_JOBS=1 \
  editing-in-house-backend
```

## Health Checks

The container includes health checks:
- `/health` - Returns `{ status: 'ok' }`
- `/metrics` - Returns Prometheus metrics

Test health:
```bash
curl http://localhost:3001/health
curl http://localhost:3001/metrics
```

## Graceful Shutdown

The container handles SIGTERM gracefully:
1. Stops accepting new connections
2. Closes all active SSE streams
3. Closes database connections
4. Exits cleanly

Test graceful shutdown:
```bash
docker stop <container-id>
# or
docker kill --signal=SIGTERM <container-id>
```

## Docker Compose

Use the provided `docker-compose.yml`:

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `ALLOW_ORIGIN` - CORS allowed origin(s), comma-separated
- `PROVIDER_VIDEO` - Video generation provider (demo/pika/runway)
- `PROVIDER_IMAGE` - Image generation provider (demo/pika/runway)
- `PROVIDER_VOICE` - Voice generation provider (demo/pika/runway)
- `GEMINI_API_KEY` - Google Gemini API key for LLM
- `LLM_PROVIDER` - LLM provider (default: gemini)
- `PERSIST_JOBS` - Enable SQLite persistence (0 or 1)

