# Frontend ↔ Backend Wiring Guide

## Frontend Environment Configuration

### Local Development
Create `frontend/.env`:
```bash
# Leave empty for same-origin (local dev)
VITE_API_URL=
```

### Production
Create `frontend/.env`:
```bash
# Set to your backend domain
VITE_API_URL=https://<your-backend-domain>
```

The frontend API client (`src/api/client.ts`) automatically uses `import.meta.env.VITE_API_URL` or falls back to empty string (same-origin).

## Backend CORS Configuration

The backend CORS is configured in `backend/src/middleware/index.ts` using environment variables:

### Environment Variables
- `ALLOW_ORIGIN` or `CORS_ORIGIN` (comma-separated for multiple origins)

### Default Behavior
- Defaults to `http://localhost:5173` if not set

### Production Setup
Set in your backend environment:
```bash
ALLOW_ORIGIN=http://localhost:5173,https://<your-emergent-app-domain>
```

Or for a single origin:
```bash
ALLOW_ORIGIN=https://<your-emergent-app-domain>
```

## Preview Element Safety

The `Preview.tsx` component already includes the required attributes:

```tsx
<video
  ref={videoRef}
  src={asset.url}
  crossOrigin="anonymous"  // ✅ Required for export
  playsInline             // ✅ Required for mobile
/>
```

These attributes ensure:
1. **`crossOrigin="anonymous"`**: Allows canvas capture and MediaRecorder export without tainting
2. **`playsInline`**: Enables inline playback on mobile devices

## Video Asset CORS Headers

For video assets served from external domains, ensure the server includes:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Range
Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges
```

See `CORS_SETUP.md` for detailed server configuration examples.

## Testing the Connection

1. **Local Dev**: Start both frontend and backend, ensure `VITE_API_URL` is empty
2. **Production**: Set `VITE_API_URL` to your backend domain and ensure `ALLOW_ORIGIN` includes your frontend domain
3. **Health Check**: The frontend TopBar shows connection status via `/health` endpoint

