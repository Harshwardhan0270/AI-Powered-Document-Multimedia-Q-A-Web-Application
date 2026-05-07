import api from './client'
import type { Document } from '../types'

export const documentsApi = {
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<Document> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<Document>('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    })
    return data
  },
  list: async (): Promise<Document[]> => {
    const { data } = await api.get<Document[]>('/documents/')
    return data
  },
  get: async (id: string): Promise<Document> => {
    const { data } = await api.get<Document>(`/documents/${id}`)
    return data
  },
  getStatus: async (id: string): Promise<Document> => {
    const { data } = await api.get<Document>(`/documents/${id}/status`)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`)
  },
  getStreamUrl: (id: string): string => {
    const token = localStorage.getItem('access_token')
    return `/api/documents/${id}/stream?token=${token}`
  },
}
