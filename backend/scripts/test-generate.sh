#!/bin/bash

# Test generation endpoints and SSE streaming
echo "Testing /api/generate/video endpoint..."
echo ""

# Generate video
RESPONSE=$(curl -s -X POST http://localhost:3001/api/generate/video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "aerial night city, cinematic",
    "duration_sec": 4,
    "aspect": "9:16",
    "style": "cinematic"
  }')

echo "Generation response: $RESPONSE"
echo ""

# Extract jobId (simple extraction, assumes JSON response)
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "❌ No jobId found in response"
  exit 1
fi

echo "Job ID: $JOB_ID"
echo ""
echo "Streaming job progress (will timeout after 10 seconds)..."
echo ""

# Stream job progress (with timeout)
timeout 10 curl -N -X GET "http://localhost:3001/api/jobs/$JOB_ID/stream" \
  -H "Accept: text/event-stream" \
  2>/dev/null | while IFS= read -r line; do
  echo "$line"
done

echo -e "\n✅ Generation and streaming test complete"

