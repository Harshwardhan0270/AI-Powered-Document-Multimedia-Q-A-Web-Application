import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { documentsApi } from '../api/documents'
import { chatApi } from '../api/chat'
import type { Document, ChatSession, ChatMessage, TimestampRef } from '../types'
import Toast from '../components/Toast'
import Sidebar from '../components/Sidebar'
import MediaPlayer from '../components/MediaPlayerNew'
import ChatArea from '../components/ChatArea'
import UploadPanel from '../components/UploadPanel'
import SummaryPanel from '../components/SummaryPanel'

export type Panel = 'upload' | 'summary' | 'timestamps' | null

export interface ToastMsg { id: number; message: string; type: 'success' | 'error' | 'info' | 'warning' }

export default function MainPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Documents
  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(true)

  // Chat
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)

  // Active document for chat
  const [activeDoc, setActiveDoc] = useState<Document | null>(null)

  // Panel
  const [panel, setPanel] = useState<Panel>(null)

  // Media
  const [mediaDoc, setMediaDoc] = useState<Document | null>(null)
  const [seekTime, setSeekTime] = useState<number | null>(null)

  // Toasts
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  // View: 'documents' | 'chat'
  const [view, setView] = useState<'documents' | 'chat'>('documents')

  const showToast = useCallback((message: string, type: ToastMsg['type'] = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  // Load documents
  useEffect(() => {
    documentsApi.list().then(setDocuments).catch(() => {}).finally(() => setDocsLoading(false))
  }, [])

  // Poll processing docs
  useEffect(() => {
    const processing = documents.filter(d => d.status === 'pending' || d.status === 'processing')
    if (!processing.length) return
    const iv = setInterval(async () => {
      const updated = await Promise.all(processing.map(d => documentsApi.getStatus(d.id).catch(() => d)))
      setDocuments(prev => prev.map(doc => {
        const u = updated.find(x => x.id === doc.id)
        return u ? { ...doc, ...u } : doc
      }))
    }, 3000)
    return () => clearInterval(iv)
  }, [documents])

  // Load chat sessions — auto-clean empty "New Chat" duplicates
  useEffect(() => {
    chatApi.listSessions().then(async (all) => {
      // Delete sessions with no messages and default title
      const empties = all.filter(s => s.title === 'New Chat')
      if (empties.length > 1) {
        // Keep the most recent one, delete the rest silently
        const toDelete = empties.slice(1)
        await Promise.all(toDelete.map(s => chatApi.deleteSession(s.id).catch(() => {})))
        setSessions(all.filter(s => !toDelete.find(d => d.id === s.id)))
      } else {
        setSessions(all)
      }
    }).catch(() => {})
  }, [])

  const handleUpload = async (file: File) => {
    try {
      const doc = await documentsApi.upload(file)
      setDocuments(prev => [doc, ...prev])
      showToast(`${file.name} uploaded! Processing...`, 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Upload failed', 'error')
    }
  }

  const handleDeleteDoc = async (id: string) => {
    try {
      await documentsApi.delete(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
      if (activeDoc?.id === id) { setActiveDoc(null); setMediaDoc(null) }
      showToast('Document deleted', 'info')
    } catch {
      showToast('Delete failed', 'error')
    }
  }

  const handleChatDoc = async (doc: Document) => {
    setActiveDoc(doc)
    setView('chat')
    if (doc.file_type === 'audio' || doc.file_type === 'video') setMediaDoc(doc)
    // Reuse existing session for this doc if one exists, otherwise create new
    const existing = sessions.find(s => s.document_id === doc.id)
    if (existing) {
      await handleLoadSession(existing)
      return
    }
    try {
      const session = await chatApi.createSession(doc.id, doc.original_filename.slice(0, 40))
      setSessions(prev => [session, ...prev])
      setActiveSession(session)
      setMessages([])
      showToast(`Chat started for ${doc.original_filename}`, 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Could not start chat', 'error')
    }
  }

  const handleNewChat = () => {
    // Don't create a backend session yet — just open a blank chat UI
    // Session is created on first message send
    setActiveSession(null)
    setMessages([])
    setActiveDoc(null)
    setMediaDoc(null)
    setView('chat')
  }

  const handleLoadSession = async (session: ChatSession) => {
    setActiveSession(session)
    setView('chat')
    try {
      const full = await chatApi.getSession(session.id)
      setMessages(full.messages || [])
      if (full.document_id) {
        const doc = documents.find(d => d.id === full.document_id)
        if (doc) {
          setActiveDoc(doc)
          if (doc.file_type === 'audio' || doc.file_type === 'video') setMediaDoc(doc)
        }
      }
    } catch {
      setMessages([])
    }
  }

  const handleDeleteSession = async (id: string) => {
    try {
      await chatApi.deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSession?.id === id) { setActiveSession(null); setMessages([]) }
      showToast('Chat deleted', 'info')
    } catch {
      showToast('Delete failed', 'error')
    }
  }

  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return
    setSending(true)

    // Lazily create session on first message if none exists
    let session = activeSession
    if (!session) {
      try {
        const title = (activeDoc?.original_filename || text).slice(0, 40)
        session = await chatApi.createSession(activeDoc?.id, title)
        setSessions(prev => [session!, ...prev])
        setActiveSession(session)
      } catch (err: any) {
        showToast(err?.response?.data?.detail || 'Could not create chat', 'error')
        setSending(false)
        return
      }
    }

    const userMsg: ChatMessage = { id: `tmp-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    const streamingId = `streaming-${Date.now()}`
    setMessages(prev => [...prev, { id: streamingId, role: 'assistant', content: '', created_at: new Date().toISOString() }])

    try {
      const resp = await chatApi.ask(session.id, text)
      setMessages(prev => prev.map(m =>
        m.id === streamingId
          ? { ...m, id: resp.message_id, content: resp.content, timestamp_start: resp.timestamp_refs?.[0]?.start, timestamp_end: resp.timestamp_refs?.[0]?.end }
          : m
      ))
      // Update session title after first message
      if (messages.length === 0) {
        setSessions(prev => prev.map(s => s.id === session!.id ? { ...s, title: text.slice(0, 40) } : s))
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.id === streamingId ? { ...m, content: 'Sorry, something went wrong. Please try again.' } : m
      ))
      showToast(err?.response?.data?.detail || 'AI error', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleClearEmpty = async () => {
    const empties = sessions.filter(s => s.title === 'New Chat')
    await Promise.all(empties.map(s => chatApi.deleteSession(s.id).catch(() => {})))
    setSessions(prev => prev.filter(s => s.title !== 'New Chat'))
    if (activeSession && empties.find(s => s.id === activeSession.id)) {
      setActiveSession(null); setMessages([])
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => <Toast key={t.id} {...t} />)}
      </div>

      {/* Sidebar */}
      <Sidebar
        user={user}
        view={view}
        sessions={sessions}
        activeSessionId={activeSession?.id}
        onNewChat={handleNewChat}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        onViewChange={setView}
        onLogout={handleLogout}
        onClearEmpty={handleClearEmpty}
      />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <header style={{ background: 'rgba(18,18,26,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', background: 'rgba(92,124,250,0.15)', color: '#748ffc', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(92,124,250,0.3)' }}>
              llama-3.3-70b
            </span>
            {activeDoc && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                • {activeDoc.original_filename}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['upload', 'summary'].map(p => (
              <button key={p} onClick={() => setPanel(panel === p ? null : p as Panel)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: panel === p ? 'rgba(92,124,250,0.2)' : 'var(--bg-tertiary)', color: panel === p ? 'var(--accent)' : 'var(--text-secondary)', border: `1px solid ${panel === p ? 'rgba(92,124,250,0.4)' : 'var(--border-color)'}`, fontSize: 13, transition: 'all 0.2s' }}>
                {p === 'upload' ? '📎' : '📄'} {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Center */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {view === 'documents' ? (
              <DocumentsView
                documents={documents}
                loading={docsLoading}
                onUpload={handleUpload}
                onDelete={handleDeleteDoc}
                onChat={handleChatDoc}
                showToast={showToast}
              />
            ) : (
              <>
                {mediaDoc && (
                  <MediaPlayer doc={mediaDoc} seekTo={seekTime} onSeekDone={() => setSeekTime(null)} />
                )}
                <ChatArea
                  session={activeSession}
                  messages={messages}
                  sending={sending}
                  activeDoc={activeDoc}
                  onSend={handleSend}
                  onSeek={setSeekTime}
                />
              </>
            )}
          </div>

          {/* Right panel */}
          {panel && (
            <div style={{ width: 360, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>
                  {panel === 'upload' ? '📎 Upload Files' : '📄 Document Summary'}
                </span>
                <button onClick={() => setPanel(null)} style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {panel === 'upload' && <UploadPanel onUpload={handleUpload} showToast={showToast} />}
                {panel === 'summary' && <SummaryPanel doc={activeDoc} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Documents View ──────────────────────────────────────────────────────────
function DocumentsView({ documents, loading, onUpload, onDelete, onChat, showToast }: {
  documents: Document[]
  loading: boolean
  onUpload: (f: File) => void
  onDelete: (id: string) => void
  onChat: (doc: Document) => void
  showToast: (m: string, t?: any) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file: File) => {
    setUploading(true); setProgress(0)
    try { await onUpload(file) }
    finally { setUploading(false); setProgress(0) }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Documents</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Upload PDFs, audio, and video files to analyze with AI</p>

        {/* Drop zone */}
        <label
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 24px', borderRadius: 16, border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-color)'}`, background: dragging ? 'rgba(92,124,250,0.06)' : 'var(--bg-secondary)', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginBottom: 24 }}>
          <input type="file" accept=".pdf,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.avi,.mkv,.webm" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} disabled={uploading} />
          <div style={{ fontSize: 36, marginBottom: 12 }}>☁️</div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{uploading ? `Uploading... ${progress}%` : 'Drop file here or click to browse'}</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>PDF, MP3, WAV, MP4, MOV and more • Max 100MB</p>
          {uploading && (
            <div style={{ width: '100%', maxWidth: 280, marginTop: 14, height: 4, background: 'var(--border-color)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          )}
        </label>

        {/* Document list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 72, borderRadius: 12 }} />)}
          </div>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
            <p style={{ fontSize: 16, fontWeight: 500 }}>No documents yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Upload a file above to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {documents.map(doc => <DocCard key={doc.id} doc={doc} onDelete={onDelete} onChat={onChat} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function DocCard({ doc, onDelete, onChat }: { doc: Document; onDelete: (id: string) => void; onChat: (doc: Document) => void }) {
  const [showSummary, setShowSummary] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const icon = doc.file_type === 'audio' ? '🎵' : doc.file_type === 'video' ? '🎬' : '📄'
  const statusColor = { pending: 'var(--warning)', processing: 'var(--accent)', completed: 'var(--success)', failed: 'var(--danger)' }[doc.status]
  const size = doc.file_size < 1024 * 1024 ? `${(doc.file_size / 1024).toFixed(1)} KB` : `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`

  return (
    <div className="slide-up" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 18, transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(92,124,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.original_filename}</p>
          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{size}</span>
            {doc.duration_seconds && <span>⏱ {Math.floor(doc.duration_seconds / 60)}:{String(Math.floor(doc.duration_seconds % 60)).padStart(2, '0')}</span>}
            <span style={{ color: statusColor, fontWeight: 500 }}>● {doc.status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {doc.status === 'completed' && (
            <button onClick={() => onChat(doc)}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              💬 Chat
            </button>
          )}
          <button onClick={async () => { setDeleting(true); await onDelete(doc.id) }} disabled={deleting}
            style={{ padding: 8, borderRadius: 8, color: 'var(--text-muted)', transition: 'color 0.15s', fontSize: 16 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            🗑
          </button>
        </div>
      </div>

      {doc.status === 'failed' && doc.error_message && (
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)' }}>Error: {doc.error_message}</p>
      )}

      {doc.status === 'completed' && doc.summary && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowSummary(!showSummary)}
            style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {showSummary ? '▲' : '▼'} {showSummary ? 'Hide summary' : 'Show summary'}
          </button>
          {showSummary && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {doc.summary}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
