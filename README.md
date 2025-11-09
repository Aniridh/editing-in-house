# AI NLE (Web)

A browser-based non-linear video editor that uses AI to generate video clips, images, and voiceovers on command. The editor generates content live with low latency, making video editing as simple as typing a command.

## Features

- **Natural Language Commands**: Type commands like "4s aerial night city, vertical, cinematic" to generate video clips
- **AI-Powered Generation**: Uses Gemini AI for command interpretation and demo providers for content generation
- **Real-time Progress**: Server-Sent Events (SSE) stream job progress updates
- **Timeline Editing**: Drag-and-drop interface for arranging clips on tracks
- **Live Preview**: See your edits in real-time

## Project Structure

```
editing-in-house/
├── frontend/          # React + TypeScript (Vite)
├── backend/           # Node.js/Express + TypeScript
├── package.json       # Root workspace config
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- Gemini API key (for command interpretation)

## Setup

### 1. Install Dependencies

From the root directory:

```bash
npm install
```

This will install dependencies for both frontend and backend workspaces.

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cp .env.example .env  # If .env.example exists, or create manually
```

Edit `.env` with your configuration:

```env
# LLM Provider: "gemini" or "openai"
LLM_PROVIDER=gemini

# Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS - Frontend origin (comma-separated for multiple)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

**Getting a Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy it to `GEMINI_API_KEY` in your `.env` file

### 3. Start Development Servers

From the root directory, run both frontend and backend:

```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173`

Or run them separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## API Endpoints

### POST /api/interpret
Interpret natural language commands into actions.

**Request:**
```json
{
  "text": "4s aerial night city, vertical, cinematic"
}
```

**Response:**
```json
{
  "actions": [
    {
      "type": "generate_clip",
      "prompt": "aerial night city, cinematic",
      "duration_sec": 4,
      "aspect": "9:16"
    }
  ]
}
```

### POST /api/generate/video
Generate a video clip.

**Request:**
```json
{
  "prompt": "aerial night city, cinematic",
  "duration_sec": 4,
  "aspect": "9:16",
  "style": "cinematic"
}
```

**Response:**
```json
{
  "jobId": "uuid-here"
}
```

### POST /api/generate/image
Generate an image.

**Request:**
```json
{
  "prompt": "sunset over mountains",
  "aspect": "16:9"
}
```

**Response:**
```json
{
  "url": "https://demo.example.com/img-123.jpg"
}
```

### POST /api/generate/voice
Generate voiceover audio.

**Request:**
```json
{
  "text": "Welcome to Night City",
  "voice": "default"
}
```

**Response:**
```json
{
  "url": "https://demo.example.com/voice-123.mp3"
}
```

### GET /api/jobs/:id/stream
Stream job progress via Server-Sent Events (SSE).

**Events:**
- `status`: `{ status: "queued" | "generating" | "complete" | "error" }`
- `progress`: `{ progress: 0-100 }`
- `complete`: `{ url: "https://..." }`
- `error`: `{ error: "error message" }`

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Testing

Test the API endpoints using the provided curl scripts:

```bash
# Test health endpoint
./backend/scripts/test-health.sh

# Test interpretation
./backend/scripts/test-interpret.sh

# Test generation and SSE streaming
./backend/scripts/test-generate.sh
```

## Development

### Backend

- **Entry point**: `backend/src/index.ts`
- **Types**: `backend/src/types.ts`
- **Interpretation**: `backend/src/lib/interpret.ts`
- **Job management**: `backend/src/lib/jobs.ts`
- **Demo provider**: `backend/src/lib/providers/demo.ts`
- **Routes**: `backend/src/routes/api.ts`
- **Middleware**: `backend/src/middleware/`

### Frontend

- **Entry point**: `frontend/src/main.tsx`
- **App**: `frontend/src/App.tsx`
- **Components**: `frontend/src/components/`
- **Store**: `frontend/src/store/editorStore.ts`
- **API client**: `frontend/src/lib/api.ts`
- **Types**: `frontend/src/types.ts`

## Example Commands

Try these commands in the Command Panel:

- `"4s aerial night city, vertical, cinematic"` - Generate a 4-second vertical video
- `"Insert at 5s a 3s skyline b-roll"` - Generate and insert a clip
- `"Add caption 'Welcome to Night City' from 0-2s"` - Add a caption
- `"Split at 2s, delete right clip"` - Split and delete
- `"Set aspect to 16:9"` - Change aspect ratio

## Architecture

### Data Flow

1. **Command Panel** → `/api/interpret` → `actions[]`
2. **Actions** → `/api/generate/*` → `jobId`
3. **Job Streaming** → `/api/jobs/:id/stream` (SSE) → `url`
4. **Asset Bin** → Timeline insertion

### Key Concepts

- **Asset**: Media that exists (video/image/audio URL)
- **Clip**: A placed asset segment on a track with start/end
- **Track**: Video, overlay, or audio track
- **Job**: An async generation task emitting progress and a final URL
- **Playhead**: Current timeline position (seconds)

## License

MIT
