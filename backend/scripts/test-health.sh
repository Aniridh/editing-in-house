#!/bin/bash

# Test health endpoint
echo "Testing /health endpoint..."
curl -X GET http://localhost:3001/health \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n✅ Health check complete"

