import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DocumentCard from '../components/DocumentCard'
import ChatMessageComponent from '../components/ChatMessage'
import type { Document, ChatMessage } from '../types'

vi.mock('../api/documents', () => ({
  documentsApi: {
    delete: vi.fn().mockResolvedValue(undefined),
    getStreamUrl: vi.fn(() => '/api/documents/1/stream'),
  },
}))

const mockDoc: Document = {
  id: 'doc-1',
  filename: 'test.pdf',
  original_filename: 'My Document.pdf',
  file_type: 'pdf',
  file_size: 1024 * 1024,
  status: 'completed',
  summary: 'This is a test summary of the document.',
  created_at: new Date().toISOString(),
}

describe('DocumentCard', () => {
  it('renders document info', () => {
    render(<DocumentCard doc={mockDoc} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.getByText('My Document.pdf')).toBeInTheDocument()
    expect(screen.getByText('1.0 MB')).toBeInTheDocument()
    expect(screen.getByText('● completed')).toBeInTheDocument()
  })

  it('shows chat button for completed documents', () => {
    render(<DocumentCard doc={mockDoc} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument()
  })

  it('does not show chat button for pending documents', () => {
    const pendingDoc = { ...mockDoc, status: 'pending' as const }
    render(<DocumentCard doc={pendingDoc} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /chat/i })).not.toBeInTheDocument()
  })

  it('calls onChat when chat button clicked', () => {
    const onChat = vi.fn()
    render(<DocumentCard doc={mockDoc} onDelete={vi.fn()} onChat={onChat} />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    expect(onChat).toHaveBeenCalledWith(mockDoc)
  })

  it('toggles summary visibility', () => {
    render(<DocumentCard doc={mockDoc} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.queryByText('This is a test summary of the document.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/show summary/i))
    expect(screen.getByText('This is a test summary of the document.')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/hide summary/i))
    expect(screen.queryByText('This is a test summary of the document.')).not.toBeInTheDocument()
  })

  it('shows error message for failed documents', () => {
    const failedDoc = { ...mockDoc, status: 'failed' as const, error_message: 'Processing failed' }
    render(<DocumentCard doc={failedDoc} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.getByText(/processing failed/i)).toBeInTheDocument()
  })

  it('shows duration for audio/video', () => {
    const audioDoc = { ...mockDoc, file_type: 'audio' as const, duration_seconds: 125 }
    render(<DocumentCard doc={audioDoc} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.getByText('2:05')).toBeInTheDocument()
  })
})

describe('ChatMessage', () => {
  const userMsg: ChatMessage = {
    id: 'msg-1',
    role: 'user',
    content: 'What is this document about?',
    created_at: new Date().toISOString(),
  }

  const assistantMsg: ChatMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'This document is about **machine learning**.',
    created_at: new Date().toISOString(),
    timestamp_start: 30,
    timestamp_end: 60,
  }

  it('renders user message', () => {
    render(<ChatMessageComponent message={userMsg} />)
    expect(screen.getByText('What is this document about?')).toBeInTheDocument()
  })

  it('renders assistant message with markdown', () => {
    render(<ChatMessageComponent message={assistantMsg} />)
    expect(screen.getByText('machine learning')).toBeInTheDocument()
  })

  it('shows timestamp jump button for assistant messages with timestamps', () => {
    const onSeek = vi.fn()
    render(<ChatMessageComponent message={assistantMsg} onSeek={onSeek} />)
    const jumpBtn = screen.getByText(/jump to/i)
    expect(jumpBtn).toBeInTheDocument()
    fireEvent.click(jumpBtn)
    expect(onSeek).toHaveBeenCalledWith(30)
  })

  it('shows timestamp refs when provided', () => {
    const onSeek = vi.fn()
    const msgWithRefs = {
      ...assistantMsg,
      timestamp_refs: [{ start: 10, end: 20, text: 'relevant segment' }],
    }
    render(<ChatMessageComponent message={msgWithRefs} onSeek={onSeek} />)
    expect(screen.getByText(/0:10/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/0:10/))
    expect(onSeek).toHaveBeenCalledWith(10)
  })
})
