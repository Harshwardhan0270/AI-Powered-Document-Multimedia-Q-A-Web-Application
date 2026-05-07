import api from './client'
import type { ChatSession, ChatResponse } from '../types'

export const chatApi = {
  createSession: async (documentId?: string, title?: string): Promise<ChatSession> => {
    const { data } = await api.post<ChatSession>('/chat/sessions', {
      document_id: documentId,
      title: title || 'New Chat',
    })
    return data
  },
  listSessions: async (): Promise<ChatSession[]> => {
    const { data } = await api.get<ChatSession[]>('/chat/sessions')
    return data
  },
  getSession: async (id: string): Promise<ChatSession> => {
    const { data } = await api.get<ChatSession>(`/chat/sessions/${id}`)
    return data
  },
  deleteSession: async (id: string): Promise<void> => {
    await api.delete(`/chat/sessions/${id}`)
  },
  ask: async (sessionId: string, message: string): Promise<ChatResponse> => {
    const { data } = await api.post<ChatResponse>('/chat/ask', { session_id: sessionId, message })
    return data
  },
  askStream: (
    sessionId: string,
    message: string,
    onChunk: (c: string) => void,
    onDone: () => void,
    onError: (e: string) => void
  ) => {
    const token = localStorage.getItem('access_token')
    const es = new EventSource(
      `/api/chat/ask/stream?session_id=${sessionId}&message=${encodeURIComponent(message)}&token=${token}`
    )
    es.onmessage = (e) => {
      const d = JSON.parse(e.data)
      if (d.chunk) onChunk(d.chunk)
      if (d.done) { onDone(); es.close() }
      if (d.error) { onError(d.error); es.close() }
    }
    es.onerror = () => { onError('Stream error'); es.close() }
    return () => es.close()
  },
}
