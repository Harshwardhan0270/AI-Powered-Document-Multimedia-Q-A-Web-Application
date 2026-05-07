import React from 'react'
import type { ChatSession } from '../types'
import type { User } from '../types'

interface Props {
  user: User | null
  view: 'documents' | 'chat'
  sessions: ChatSession[]
  activeSessionId?: string
  onNewChat: () => void
  onLoadSession: (s: ChatSession) => void
  onDeleteSession: (id: string) => void
  onViewChange: (v: 'documents' | 'chat') => void
  onLogout: () => void
  onClearEmpty?: () => void
}

export default function Sidebar({ user, view, sessions, activeSessionId, onNewChat, onLoadSession, onDeleteSession, onViewChange, onLogout, onClearEmpty }: Props) {
  const emptySessions = sessions.filter(s => s.title === 'New Chat')
  return (
    <aside style={{ width: 260, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pulse-ring" style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🧠</div>
          <div>
            <h1 style={{ fontWeight: 800, color: '#fff', fontSize: 16, lineHeight: 1.2 }}>DocuMind</h1>
            <p style={{ fontSize: 10, color: '#748ffc', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI-Powered Q&A</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '10px 10px 0' }}>
        {[
          { id: 'documents', label: 'Documents', icon: '📂' },
          { id: 'chat',      label: 'Chat',      icon: '💬' },
        ].map(item => (
          <button key={item.id} onClick={() => onViewChange(item.id as any)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2, background: view === item.id ? 'rgba(92,124,250,0.12)' : 'transparent', color: view === item.id ? 'var(--accent)' : 'var(--text-secondary)', borderLeft: view === item.id ? '3px solid var(--accent)' : '3px solid transparent', fontSize: 14, fontWeight: 500, transition: 'all 0.15s', textAlign: 'left' }}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
      </div>

      {/* New Chat */}
      <div style={{ padding: '10px 10px 6px' }}>
        <button onClick={onNewChat}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--accent)', color: '#fff', padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, transition: 'opacity 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          ＋ New Chat
        </button>
      </div>

      {/* Chat history */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 4px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Chats</p>
          {emptySessions.length > 0 && onClearEmpty && (
            <button onClick={onClearEmpty}
              style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-color)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
              title={`Delete ${emptySessions.length} empty chats`}>
              Clear {emptySessions.length} empty
            </button>
          )}
        </div>
        {sessions.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 10px' }}>No chats yet</p>
        ) : sessions.map(s => (
          <div key={s.id}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 8, marginBottom: 1, background: activeSessionId === s.id ? 'rgba(92,124,250,0.1)' : 'transparent', cursor: 'pointer', transition: 'background 0.15s', borderLeft: activeSessionId === s.id ? '2px solid var(--accent)' : '2px solid transparent' }}
            onClick={() => onLoadSession(s)}
            onMouseEnter={e => { if (activeSessionId !== s.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { if (activeSessionId !== s.id) e.currentTarget.style.background = 'transparent' }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>💬</span>
            <span style={{ flex: 1, fontSize: 12, color: activeSessionId === s.id ? 'var(--accent)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
            <button
              onClick={e => { e.stopPropagation(); onDeleteSession(s.id) }}
              style={{ flexShrink: 0, fontSize: 13, color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4, opacity: 0, transition: 'opacity 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.opacity = '1' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = '0' }}
              title="Delete chat">
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* User */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(92,124,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username || 'User'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
          <button onClick={onLogout} title="Sign out"
            style={{ color: 'var(--text-muted)', fontSize: 16, padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
