# DocuMind AI — Document & Multimedia Q&A

An AI-powered web application to upload PDFs, audio, and video files and chat with them using AI.

## Features

- 📄 **PDF Q&A** — Upload PDFs, ask questions, get AI answers with source references
- 🎵 **Audio/Video** — Transcribe with Groq Whisper, chat about content, jump to timestamps
- 🤖 **AI Chat** — Groq llama-3.3-70b (free tier) with streaming responses
- 🔍 **Vector Search** — FAISS semantic search over document content
- 🔐 **Auth** — JWT multi-user authentication
- ⚡ **Rate Limiting** — Redis-based (60 req/min)
- 🐳 **Docker** — One-command deployment

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.12, SQLAlchemy |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AI | Groq (llama-3.3-70b + Whisper) |
| Vector Search | FAISS + numpy TF-IDF |
| Frontend | React 18, TypeScript, Vite |
| Deployment | Docker Compose / Render |

## Quick Start (Local)

### 1. Get a free Groq API key
Sign up at [console.groq.com](https://console.groq.com) → API Keys → Create

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set GROQ_API_KEY=your-key-here
```

### 3. Run
```bash
docker compose up -d
```

Open **http://localhost:8080**

## Deploy to Render (Free)

1. Fork this repo
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` and creates all services
5. Set `GROQ_API_KEY` in the backend service environment variables
6. Done — your app is live!

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Free key from console.groq.com | ✅ |
| `SECRET_KEY` | JWT signing key (auto-generated on Render) | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `AI_PROVIDER` | `groq` or `openai` | default: `groq` |
| `MAX_FILE_SIZE_MB` | Max upload size | default: `100` |

## API Documentation

Available at `/api/docs` (Swagger UI) when running.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── routers/      # auth, documents, chat
│   │   ├── services/     # llm, transcription, vector, pdf, file
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── core/         # security, rate limiting, redis
│   └── tests/            # pytest test suite
├── frontend/
│   └── src/
│       ├── pages/        # MainPage, LoginPage, RegisterPage
│       ├── components/   # ChatArea, MediaPlayer, Sidebar, etc.
│       └── api/          # axios API clients
├── docker-compose.yml    # Production compose
└── render.yaml           # Render deployment config
```

## License

MIT
