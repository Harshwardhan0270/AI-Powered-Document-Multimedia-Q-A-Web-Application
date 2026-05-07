# Quick Start Guide

## 🚀 Get Running in 3 Steps

### Step 1: Get Your FREE Groq API Key

1. Go to https://console.groq.com
2. Sign up (it's free!)
3. Click "API Keys" in the sidebar
4. Click "Create API Key"
5. Copy the key (starts with `gsk_...`)

### Step 2: Configure the Application

Open `backend/.env` in your editor and replace the placeholder:

```env
GROQ_API_KEY=your-groq-api-key-here
```

With your actual key:

```env
GROQ_API_KEY=gsk_YourActualKeyHere123456789...
```

**That's the only change you need to make!** All other settings are pre-configured.

### Step 3: Start the Application

```bash
docker compose up -d
```

Wait about 30 seconds for all services to start, then open:

```
http://localhost:8080
```

## 🎯 First Use

1. **Register**: Click "Register" and create an account
2. **Upload**: Drag and drop a PDF, audio, or video file
3. **Wait**: Processing takes 10-60 seconds depending on file size
4. **Chat**: Click the "Chat" button next to your document
5. **Ask**: Type a question about your document and press Enter

## 📝 Example Questions to Try

### For PDFs:
- "What is this document about?"
- "Summarize the main points"
- "What does it say about [topic]?"

### For Audio/Video:
- "What topics are discussed?"
- "When do they talk about [topic]?"
- "Summarize the conversation"

## 🔧 Troubleshooting

### "Connection refused" or "Cannot connect"
Wait 30 more seconds — services are still starting up.

### "Invalid API key" error
Double-check your Groq API key in `backend/.env`

### File upload fails
- Check file size (max 100MB by default)
- Verify file format is supported:
  - PDF: `.pdf`
  - Audio: `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.aac`
  - Video: `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`

### Processing stuck at "pending"
Check backend logs:
```bash
docker logs developanai-powereddocumentmultimediaqawebapplication-backend-1
```

## 🛑 Stop the Application

```bash
docker compose down
```

## 🔄 Restart the Application

```bash
docker compose restart
```

## 📊 Check Service Status

```bash
docker ps
```

You should see 4 containers running:
- `backend` (port 8000)
- `frontend` (port 8080)
- `db` (PostgreSQL)
- `redis`

## 🧹 Clean Up Everything

To remove all containers, volumes, and data:

```bash
docker compose down -v
```

**Warning**: This deletes all uploaded files and chat history!

## 📚 Next Steps

- Read [README.md](README.md) for detailed documentation
- Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture details
- Check `backend/tests/` for example API usage
- Explore the code in `backend/app/` and `frontend/src/`

## 🎉 You're All Set!

The application is now running and ready to use. Upload a document and start chatting!

---

**Need Help?**
- Check the logs: `docker logs <container-name>`
- Review [README.md](README.md) troubleshooting section
- Verify Groq API key is correct
- Ensure ports 8000, 8080, 5432, 6379 are not in use
