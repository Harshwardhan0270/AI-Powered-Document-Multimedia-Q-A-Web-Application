import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import * as authApi from '../api/auth'

vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(() => null),
    isAuthenticated: vi.fn(() => false),
    getMe: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const renderWithProviders = (ui: React.ReactElement) =>
  render(<MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>)

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders login form', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error on failed login', async () => {
    const { authApi: api } = await import('../api/auth')
    vi.mocked(api.login).mockRejectedValueOnce({
      response: { data: { detail: 'Incorrect email or password' } },
    })

    renderWithProviders(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument()
    })
  })

  it('calls login with correct credentials', async () => {
    const { authApi: api } = await import('../api/auth')
    vi.mocked(api.login).mockResolvedValueOnce({
      access_token: 'token123',
      token_type: 'bearer',
      user: { id: '1', email: 'test@test.com', username: 'test', is_active: true, created_at: '' },
    })

    renderWithProviders(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('test@test.com', 'password123')
    })
  })

  it('has link to register page', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Register')).toBeInTheDocument()
  })
})

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders register form', () => {
    renderWithProviders(<RegisterPage />)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('johndoe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows error on failed registration', async () => {
    const { authApi: api } = await import('../api/auth')
    vi.mocked(api.register).mockRejectedValueOnce({
      response: { data: { detail: 'Email already registered' } },
    })

    renderWithProviders(<RegisterPage />)
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'existing@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('johndoe'), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
  })
})
