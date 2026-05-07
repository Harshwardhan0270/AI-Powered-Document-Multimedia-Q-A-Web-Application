import React, { useRef, useEffect, useState } from 'react'
import type { ChatSession, ChatMessage, Document } from '../types'

interface Props {
  session: ChatSession | null
  messages: ChatMessage[]
  sending: boolean
  activeDoc: Document | null
  onSend: (text: string) => void
  onSeek: (t: number) => void
}

export default function ChatArea({ session, messages, sending, activeDoc, onSend, onSeek }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = () => {
    if (!input.trim() || sending || !session) return
    onSend(input.trim())
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {messages.length === 0 && !sending ? (
          session ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <p style={{ fontSize: 15, fontWeight: 500 }}>Ask anything about {activeDoc?.original_filename || 'your document'}</p>
              <p style={{ fontSize: 13, marginTop: 6, color: 'var(--text-muted)' }}>Try: "Summarize this" or "What are the key points?"</p>
            </div>
          ) : (
            <WelcomeScreen />
          )
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className="slide-up" style={{ marginBottom: 16 }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ background: 'linear-gradient(135deg, #4263eb, #5c7cfa)', borderRadius: '18px 18px 4px 18px', padding: '12px 16px', maxWidth: '75%' }}>
                      <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(92,124,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, marginTop: 2 }}>🧠</div>
                    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', maxWidth: '80%' }}>
                      {msg.content === '' ? (
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
                          {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />)}
                        </div>
                      ) : (
                        <>
                          <div className="prose" style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7 }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                          {/* Timestamp refs */}
                          {msg.timestamp_start != null && (
                            <button onClick={() => onSeek(msg.timestamp_start!)}
                              style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'rgba(92,124,250,0.15)', border: '1px solid rgba(92,124,250,0.3)', color: 'var(--accent)', fontSize: 12, transition: 'all 0.2s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(92,124,250,0.25)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(92,124,250,0.15)')}>
                              ▶ Jump to {fmt(msg.timestamp_start)}
                            </button>
                          )}
                          {/* Copy */}
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button onClick={() => navigator.clipboard.writeText(msg.content)}
                              style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                              📋 Copy
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input — always show in chat view */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 10, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '8px 8px 8px 16px', transition: 'border-color 0.2s' }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
          <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); autoResize(e.target) }} onKeyDown={handleKey}
            placeholder="Ask a question... (Enter to send, Shift+Enter for newline)"
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 14, resize: 'none', lineHeight: 1.6, maxHeight: 128, overflow: 'auto', padding: '4px 0' }} />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() && !sending ? 'var(--accent)' : 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s', fontSize: 16 }}>
            {sending ? <span className="spin" style={{ display: 'inline-block' }}>⟳</span> : '➤'}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>DocuMind may produce inaccurate information. Verify important details.</p>
      </div>
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div className="pulse-ring" style={{ width: 80, height: 80, background: 'rgba(92,124,250,0.15)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 24 }}>🧠</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 10 }}>Welcome to DocuMind</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 420, marginBottom: 32, fontSize: 15 }}>
        Upload your PDFs, audio, or video files and ask questions. I'll analyze the content and provide intelligent answers with timestamps.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 560, width: '100%' }}>
        {[
          { icon: '📄', title: 'Summarize PDF', desc: 'Get key insights', color: 'rgba(239,68,68,0.1)' },
          { icon: '🎙', title: 'Transcribe Audio', desc: 'Whisper powered', color: 'rgba(34,197,94,0.1)' },
          { icon: '🎬', title: 'Extract Topics', desc: 'Timestamp & search', color: 'rgba(168,85,247,0.1)' },
        ].map(item => (
          <div key={item.title} style={{ padding: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 14, cursor: 'default', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{item.title}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/## (.+)/g, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^(\d+)\. (.+)/gm, '<p><span style="color:var(--accent);font-weight:600">$1.</span> $2</p>')
    .replace(/^[-•] (.+)/gm, '<p><span style="color:var(--accent)">•</span> $1</p>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
}
