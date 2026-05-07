import React, { useRef, useEffect, useState } from "react"
import type { Document } from "../types"
import api from "../api/client"

interface Props {
  doc: Document
  seekTo?: number | null
  onSeekDone?: () => void
}

export default function MediaPlayer({ doc, seekTo, onSeekDone }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading")

  const isAudio = doc.file_type === "audio"
  const getPlayer = (): HTMLAudioElement | HTMLVideoElement | null =>
    isAudio ? audioRef.current : videoRef.current

  useEffect(() => {
    let objectUrl: string | null = null
    setPlaying(false); setCurrentTime(0); setDuration(0)
    setLoadState("loading"); setBlobUrl(null)
    api.get(`/documents/${doc.id}/stream`, { responseType: "blob" })
      .then((res: any) => {
        objectUrl = URL.createObjectURL(res.data)
        setBlobUrl(objectUrl)
        setLoadState("ready")
      })
      .catch(() => setLoadState("error"))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [doc.id])

  useEffect(() => {
    if (seekTo == null || loadState !== "ready") return
    const p = getPlayer(); if (!p) return
    const doSeek = () => {
      p.currentTime = seekTo
      p.play().catch(() => {})
      setPlaying(true); onSeekDone?.()
    }
    if (p.readyState >= 1) doSeek()
    else p.addEventListener("loadedmetadata", doSeek, { once: true })
  }, [seekTo, loadState])

  const onTimeUpdate = () => { const p = getPlayer(); if (p) setCurrentTime(p.currentTime) }
  const onLoadedMetadata = () => { const p = getPlayer(); if (p) setDuration(p.duration || 0) }
  const togglePlay = () => {
    const p = getPlayer(); if (!p) return
    if (playing) { p.pause(); setPlaying(false) }
    else { p.play().catch(() => {}); setPlaying(true) }
  }
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = getPlayer(); if (!p) return
    const t = Number(e.target.value); p.currentTime = t; setCurrentTime(t)
  }
  const seekRel = (s: number) => {
    const p = getPlayer(); if (!p) return
    p.currentTime = Math.max(0, Math.min(duration, p.currentTime + s))
  }
  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length]
    setSpeed(next); const p = getPlayer(); if (p) p.playbackRate = next
  }
  const toggleMute = () => {
    const p = getPlayer(); if (!p) return; p.muted = !muted; setMuted(!muted)
  }
  const fmt = (s: number) => {
    if (!s || isNaN(s) || !isFinite(s)) return "0:00"
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
  }
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const ev = { onTimeUpdate, onLoadedMetadata, onEnded: () => setPlaying(false) }

  return (
    <div style={{ background: "linear-gradient(180deg,#1a1a2e 0%,#12121a 100%)", borderBottom: "1px solid #2a2a4a", padding: "12px 20px", flexShrink: 0 }}>
      {isAudio && blobUrl && <audio ref={audioRef} src={blobUrl} preload="auto" {...ev} style={{ display: "none" }} />}
      {!isAudio && blobUrl && (
        <video ref={videoRef} src={blobUrl} preload="auto" {...ev}
          style={{ width: "100%", maxHeight: 160, borderRadius: 10, background: "#000", display: "block", marginBottom: 10 }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: isAudio ? "rgba(81,207,102,0.15)" : "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {isAudio ? "🎵" : "🎬"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6 }}>{doc.original_filename}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#6a6a8a", width: 36, textAlign: "right", flexShrink: 0 }}>{fmt(currentTime)}</span>
            <div style={{ flex: 1, position: "relative", height: 6, background: "#0a0a0f", borderRadius: 3, cursor: "pointer" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "#5c7cfa", borderRadius: 3, pointerEvents: "none" }} />
              <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime} onChange={seek}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", margin: 0 }} />
            </div>
            <span style={{ fontSize: 11, color: "#6a6a8a", width: 36, flexShrink: 0 }}>{fmt(duration)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CB onClick={() => seekRel(-10)}>⏪</CB>
            <button onClick={togglePlay} disabled={loadState !== "ready"}
              style={{ width: 34, height: 34, borderRadius: "50%", background: loadState === "ready" ? "#5c7cfa" : "#2a2a4a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, cursor: loadState === "ready" ? "pointer" : "default", border: "none" }}>
              {loadState === "loading" ? "⟳" : loadState === "error" ? "✕" : playing ? "⏸" : "▶"}
            </button>
            <CB onClick={() => seekRel(10)}>⏩</CB>
            <div style={{ width: 1, height: 14, background: "#2a2a4a", margin: "0 4px" }} />
            <button onClick={cycleSpeed} style={{ fontSize: 11, color: "#6a6a8a", padding: "3px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "none", cursor: "pointer" }}>{speed}x</button>
            <CB onClick={toggleMute}>{muted ? "🔇" : "🔊"}</CB>
            {loadState !== "ready" && (
              <span style={{ fontSize: 11, color: loadState === "error" ? "#ff6b6b" : "#6a6a8a", marginLeft: 4 }}>
                {loadState === "loading" ? "Loading..." : "Load failed"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CB({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: "4px 7px", borderRadius: 6, color: "#6a6a8a", fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>
      {children}
    </button>
  )
}