#!/bin/bash

# Test interpretation endpoint
echo "Testing /api/interpret endpoint..."
echo "Command: '4s aerial night city, vertical, cinematic'"
echo ""

curl -X POST http://localhost:3001/api/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "text": "4s aerial night city, vertical, cinematic"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo -e "\n✅ Interpretation test complete"

