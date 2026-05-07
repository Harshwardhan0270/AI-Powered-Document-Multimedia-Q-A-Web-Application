import React from 'react'
import type { Document } from '../types'

export default function SummaryPanel({ doc }: { doc: Document | null }) {
  if (!doc) return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
      <p style={{ fontSize: 14 }}>No document selected</p>
      <p style={{ fontSize: 12, marginTop: 4 }}>Open a chat from a document to see its summary</p>
    </div>
  )

  if (doc.status !== 'completed') return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <p style={{ fontSize: 14 }}>Document is {doc.status}</p>
    </div>
  )

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* File info */}
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>{doc.file_type === 'audio' ? '🎵' : doc.file_type === 'video' ? '🎬' : '📄'}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{doc.original_filename}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {(doc.file_size / (1024 * 1024)).toFixed(1)} MB
              {doc.duration_seconds ? ` • ${Math.floor(doc.duration_seconds / 60)}:${String(Math.floor(doc.duration_seconds % 60)).padStart(2, '0')}` : ''}
            </p>
          </div>
        </div>
        <span style={{ fontSize: 11, background: 'rgba(81,207,102,0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(81,207,102,0.3)' }}>● completed</span>
      </div>

      {/* Summary */}
      {doc.summary && (
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>📝 AI Summary</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{doc.summary}</p>
        </div>
      )}

      {/* Transcript segments */}
      {doc.transcript_segments && doc.transcript_segments.length > 0 && (
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>⏱ Transcript Segments</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
            {doc.transcript_segments.map((seg, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 8px', borderRadius: 8, background: 'var(--bg-primary)' }}>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>
                  {Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, '0')}
                </span>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{seg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
