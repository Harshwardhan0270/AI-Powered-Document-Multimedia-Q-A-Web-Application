import React from 'react'
import type { ToastMsg } from '../pages/MainPage'

const colors = {
  success: { bg: 'rgba(81,207,102,0.15)', border: 'rgba(81,207,102,0.4)', icon: '✅' },
  error:   { bg: 'rgba(255,107,107,0.15)', border: 'rgba(255,107,107,0.4)', icon: '❌' },
  info:    { bg: 'rgba(92,124,250,0.15)',  border: 'rgba(92,124,250,0.4)',  icon: 'ℹ️' },
  warning: { bg: 'rgba(255,212,59,0.15)', border: 'rgba(255,212,59,0.4)',  icon: '⚠️' },
}

export default function Toast({ message, type }: ToastMsg) {
  const c = colors[type]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderRadius: 12,
      background: c.bg, border: `1px solid ${c.border}`,
      color: '#fff', fontSize: 13, backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'toastIn 0.35s ease-out',
      maxWidth: 320,
    }}>
      <span>{c.icon}</span>
      <span>{message}</span>
    </div>
  )
}
