import React, { useState } from 'react'
import { documentsApi } from '../api/documents'
import type { Document } from '../types'

interface Props {
  onUpload: (file: File) => Promise<void>
  showToast: (m: string, t?: any) => void
}

export default function UploadPanel({ onUpload, showToast }: Props) {
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
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', borderRadius: 14, border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-color)'}`, background: dragging ? 'rgba(92,124,250,0.06)' : 'var(--bg-tertiary)', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
        <input type="file" accept=".pdf,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.avi,.mkv,.webm" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} disabled={uploading} />
        <div style={{ fontSize: 36, marginBottom: 10 }}>☁️</div>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{uploading ? `Uploading... ${progress}%` : 'Drop file here'}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>or click to browse</p>
        {uploading && (
          <div style={{ width: '100%', marginTop: 12, height: 3, background: 'var(--border-color)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        )}
      </label>

      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Supported Formats</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '📄', label: 'PDF Documents' },
            { icon: '🎵', label: 'MP3, WAV, OGG' },
            { icon: '🎬', label: 'MP4, WEBM, AVI' },
            { icon: '🎙', label: 'M4A, MOV, FLAC' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
