# AI-Powered Document & Multimedia Q&A Web Application

A full-stack web application that allows users to upload PDF documents, audio, and video files, then interact with an AI-powered chatbot to ask questions, get summaries, and extract timestamps from multimedia content.

## 🚀 Features

- **Multi-format Support**: Upload PDFs, audio (MP3, WAV, M4A, OGG, FLAC, AAC), and video (MP4, MOV, AVI, MKV, WEBM) files
- **AI-Powered Q&A**: Ask questions about your documents using Groq's free LLM API (llama-3.3-70b-versatile)
- **Automatic Transcription**: Audio/video files are transcribed using Groq's free Whisper API
- **Smart Summaries**: Get AI-generated summaries of all uploaded content
- **Timestamp Extraction**: Jump to specific moments in audio/video based on chatbot answers
- **Vector Search**: FAISS-powered semantic search with local embeddings (no API costs)
- **Real-time Streaming**: Chat responses stream in real-time using Server-Sent Events
- **Multi-user Support**: JWT authentication with user isolation
- **Rate Limiting**: Redis-based rate limiting to prevent abuse
- **Fully Dockerized**: One-command deployment with Docker Compose

## 🏗️ Architecture

### Backend (Python/FastAPI)
- **Framework**: FastAPI with async/await
- **Database**: PostgreSQL 16 with SQLAlchemy ORM
- **Cache**: Redis for rate limiting
- **AI Provider**: Groq (FREE tier) for LLM and transcription
- **Embeddings**: Local sentence-transformers + scikit-learn TF-IDF (no API costs)
- **Vector Store**: FAISS for semantic search
- **PDF Processing**: pypdf for text extraction
- **Authentication**: JWT tokens with bcrypt password hashing
- **Testing**: pytest with 95%+ coverage

### Frontend (React/TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Styling**: CSS-in-JS with CSS variables
- **Media Player**: Native HTML5 audio/video with custom controls

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Web Server**: Nginx for frontend + API proxy
- **CI/CD**: GitHub Actions (configured)

## 📋 Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- **Groq API Key** (FREE - get yours at [console.groq.com](https://console.groq.com))
  - Sign up → API Keys → Create API Key
  - Free tier includes generous limits for LLM and Whisper transcription

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-folder>
```

### 2. Configure Environment

Edit `backend/.env` and add your Groq API key:

```env
# Get your FREE key at https://console.groq.com
GROQ_API_KEY=your-groq-api-key-here
```

**Important**: The `.env` file already has all other settings configured. You only need to add your Groq API key.

### 3. Start the Application

```bash
docker compose up -d
```

This will:
- Build the backend and frontend images
- Start PostgreSQL, Redis, backend, and frontend containers
- Run database migrations
- Expose the app at http://localhost:8080

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:8080
```

**First-time setup**:
1. Click "Register" to create an account
2. Upload a PDF, audio, or video file
3. Wait for processing to complete (status will update automatically)
4. Click "Chat" to start asking questions about your document

## 🔧 Development Setup

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run tests
pytest

# Run with hot reload
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Using Development Compose

For development with hot reload:

```bash
docker compose -f docker-compose.dev.yml up
```

This mounts source code as volumes so changes are reflected immediately.

## 📁 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── core/          # Security, rate limiting, Redis
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routers/       # API endpoints
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic (LLM, transcription, vector search)
│   │   ├── config.py      # Settings management
│   │   ├── database.py    # Database connection
│   │   └── main.py        # FastAPI app
│   ├── tests/             # Pytest test suite
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Auth)
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript types
│   │   └── main.tsx       # Entry point
│   ├── Dockerfile
│   ├── nginx.conf         # Nginx configuration
│   └── package.json
├── docker-compose.yml     # Production compose
├── docker-compose.dev.yml # Development compose
└── README.md
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest --cov=app --cov-report=html
```

Coverage report will be in `backend/htmlcov/index.html`

### Frontend Tests

```bash
cd frontend
npm test
```

## 🔐 Security Features

- **Password Hashing**: bcrypt with salt
- **JWT Tokens**: Secure token-based authentication
- **Rate Limiting**: 60 requests per minute per IP
- **CORS**: Configured allowed origins
- **Input Validation**: Pydantic schemas for all inputs
- **File Size Limits**: Configurable max upload size (default 100MB)
- **SQL Injection Protection**: SQLAlchemy ORM with parameterized queries
- **XSS Protection**: React's built-in escaping

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Documents
- `POST /api/documents/upload` - Upload file
- `GET /api/documents/` - List user's documents
- `GET /api/documents/{id}` - Get document details
- `GET /api/documents/{id}/status` - Get processing status
- `DELETE /api/documents/{id}` - Delete document
- `GET /api/documents/{id}/stream` - Stream audio/video file

### Chat
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions` - List user's sessions
- `GET /api/chat/sessions/{id}` - Get session with messages
- `DELETE /api/chat/sessions/{id}` - Delete session
- `POST /api/chat/ask` - Ask question (non-streaming)
- `GET /api/chat/ask/stream` - Ask question (streaming SSE)

### Health
- `GET /health` - Health check endpoint

## 🎯 Key Technologies

### AI & ML
- **Groq**: Free LLM API (llama-3.3-70b-versatile) and Whisper transcription
- **FAISS**: Facebook AI Similarity Search for vector embeddings
- **scikit-learn**: TF-IDF vectorization for local embeddings
- **pypdf**: PDF text extraction

### Backend
- **FastAPI**: Modern async Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **Alembic**: Database migrations
- **Pydantic**: Data validation
- **python-jose**: JWT token handling
- **bcrypt**: Password hashing
- **Redis**: Caching and rate limiting

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **React Router**: Client-side routing
- **Axios**: HTTP client

## 🐛 Troubleshooting

### Backend won't start
- Check logs: `docker logs <container-name>`
- Verify Groq API key is set in `backend/.env`
- Ensure ports 8000, 8080, 5432, 6379 are not in use

### File upload fails
- Check file size (default limit: 100MB)
- Verify file format is supported
- Check backend logs for errors

### Transcription fails
- Verify Groq API key is valid
- Check Groq API quota at console.groq.com
- Ensure audio/video file is in a supported format

### Chat responses are slow
- Groq free tier has rate limits
- Check network connection
- Consider upgrading to Groq paid tier for faster responses

## 📝 Environment Variables

Key environment variables in `backend/.env`:

```env
# AI Provider (groq or openai)
AI_PROVIDER=groq

# Groq API (FREE at console.groq.com)
GROQ_API_KEY=your-key-here
GROQ_MODEL=llama-3.3-70b-versatile

# Database
DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/qaapp

# Redis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=supersecretkey-change-in-production-abc123xyz

# File Upload
MAX_FILE_SIZE_MB=100
UPLOAD_DIR=/app/uploads
FAISS_INDEX_DIR=/app/faiss_indexes

# CORS
ALLOWED_ORIGINS=["http://localhost:8080","http://localhost:3000"]
```

## 🚀 Deployment

### Production Deployment

1. Update `backend/.env` with production values:
   - Change `SECRET_KEY` to a strong random value
   - Update `ALLOWED_ORIGINS` with your domain
   - Set `DEBUG=false`

2. Build and start:
   ```bash
   docker compose up -d
   ```

3. Set up reverse proxy (nginx/Caddy) for HTTPS

4. Configure domain DNS to point to your server

### Cloud Deployment

The application can be deployed to:
- **AWS**: ECS/Fargate + RDS + ElastiCache
- **GCP**: Cloud Run + Cloud SQL + Memorystore
- **Azure**: Container Instances + Azure Database + Azure Cache

## 📄 License

[Your License Here]

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

## 🎉 Acknowledgments

- **Groq** for providing free LLM and Whisper API access
- **FastAPI** for the excellent async Python framework
- **React** team for the amazing UI library
- **FAISS** for efficient vector search
- All open-source contributors

---

**Built with ❤️ using FastAPI, React, and Groq AI**
