export interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  created_at: string
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}

export type FileType = 'pdf' | 'audio' | 'video'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Document {
  id: string
  filename: string
  original_filename: string
  file_type: FileType
  file_size: number
  status: ProcessingStatus
  summary?: string
  duration_seconds?: number
  transcript_segments?: TranscriptSegment[]
  error_message?: string
  created_at: string
}

export interface TranscriptSegment {
  text: string
  start: number
  end: number
}

export interface ChatSession {
  id: string
  document_id?: string
  title: string
  created_at: string
  messages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp_start?: number
  timestamp_end?: number
  sources?: Source[]
  created_at: string
}

export interface Source {
  text: string
  score?: number
}

export interface TimestampRef {
  start: number
  end: number
  text: string
}

export interface ChatResponse {
  message_id: string
  content: string
  timestamp_refs?: TimestampRef[]
  sources?: Source[]
}
