# CORS Setup for Video Export

## Overview
The video editor requires CORS (Cross-Origin Resource Sharing) headers to be properly configured on the server serving video assets. This is necessary because:

1. Video elements use `crossOrigin="anonymous"` to allow canvas capture and MediaRecorder
2. The `captureStream()` API requires CORS headers for cross-origin video sources
3. Export functionality needs to access video frames for encoding

## Required CORS Headers

The server serving video assets must include the following headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Range
Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges
```

### For Development (Local Server)

If using a local development server, add these headers to your server configuration:

#### Express.js Example
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
  next();
});
```

#### Node.js HTTP Server Example
```javascript
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve video files...
});
```

#### Nginx Example
```nginx
location /videos/ {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, HEAD, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Range';
    add_header 'Access-Control-Expose-Headers' 'Content-Range, Content-Length, Accept-Ranges';
    
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, HEAD, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Range';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}
```

### For Production

For production environments, consider:

1. **Restrict Origin**: Replace `*` with your specific domain:
   ```
   Access-Control-Allow-Origin: https://yourdomain.com
   ```

2. **Use Credentials**: If using cookies/authentication:
   ```
   Access-Control-Allow-Origin: https://yourdomain.com
   Access-Control-Allow-Credentials: true
   ```

3. **Cache Preflight**: Set appropriate cache headers for OPTIONS requests

## Testing CORS

You can test if CORS is properly configured using:

```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Range" \
     -X OPTIONS \
     -v \
     http://your-server.com/video.mp4
```

Look for the CORS headers in the response.

## Browser Console Errors

If CORS is not properly configured, you may see errors like:

- `Access to video at '...' from origin '...' has been blocked by CORS policy`
- `Failed to execute 'captureStream' on 'HTMLVideoElement'`
- `MediaRecorder: Failed to start recording`

## Notes

- The `Range` header is important for video streaming and seeking
- `Content-Range` and `Accept-Ranges` are needed for proper video playback
- Some browsers may cache CORS responses, so clear cache if issues persist
