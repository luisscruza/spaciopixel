import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import './App.css'

type User = {
  id: number
  username: string
  email: string
  avatar_config: Record<string, string> | null
}

type Room = {
  id: number
  name: string
  slug: string | null
  width: number
  height: number
  max_users: number
  is_lobby: boolean
  current_user_count: number
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const TOKEN_KEY = 'spaciopixel.auth.token'

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [error, setError] = useState<string | null>(null)
  const [authPending, setAuthPending] = useState(false)
  const [roomPending, setRoomPending] = useState(false)

  useEffect(() => {
    void loadRooms()
  }, [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    localStorage.setItem(TOKEN_KEY, token)
    void bootstrapSession(token)
  }, [token])

  async function loadRooms() {
    const response = await fetch(`${API_URL}/api/rooms`)

    if (!response.ok) {
      throw new Error('Unable to load rooms')
    }

    const data = (await response.json()) as Room[]
    setRooms(data)
  }

  async function bootstrapSession(currentToken: string) {
    setIsLoading(true)
    setError(null)

    try {
      const [meResponse, roomsResponse] = await Promise.all([
        fetch(`${API_URL}/api/me`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
        }),
        fetch(`${API_URL}/api/rooms`),
      ])

      if (meResponse.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
        return
      }

      if (!meResponse.ok || !roomsResponse.ok) {
        throw new Error('Unable to load app state')
      }

      setUser((await meResponse.json()) as User)
      setRooms((await roomsResponse.json()) as Room[])
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unexpected error')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const payload = {
      email: String(formData.get('email') ?? ''),
      username: String(formData.get('username') ?? ''),
      password: String(formData.get('password') ?? ''),
      password_confirmation: String(formData.get('passwordConfirmation') ?? ''),
    }

    setAuthPending(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/auth/${authMode}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          authMode === 'login'
            ? { email: payload.email, password: payload.password }
            : payload,
        ),
      })

      const data = (await response.json()) as
        | { token: string; user: User }
        | { message?: string; errors?: Record<string, string[]> }

      if (!response.ok || !('token' in data)) {
        const apiError = 'errors' in data && data.errors
          ? Object.values(data.errors).flat().join(' ')
          : 'message' in data && data.message
            ? data.message
            : 'Authentication failed'

        throw new Error(apiError)
      }

      setToken(data.token)
      setUser(data.user)
      event.currentTarget.reset()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unexpected error')
    } finally {
      setAuthPending(false)
    }
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()

    if (!name) {
      return
    }

    setRoomPending(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message ?? 'Unable to create room')
      }

      setRooms((currentRooms) => [...currentRooms, data as Room])
      event.currentTarget.reset()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unexpected error')
    } finally {
      setRoomPending(false)
    }
  }

  async function handleLogout() {
    if (token) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    }

    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <main className="shell">
      <section className="hero-panel">
        <p className="eyebrow">SpacioPixel</p>
        <h1>Habbo-style social rooms, scaffolded and ready to build.</h1>
        <p className="lede">
          The stack is live. You can authenticate against Laravel and manage the
          first room data from this web client.
        </p>
      </section>

      {error ? <p className="notice error">{error}</p> : null}

      <section className="status-grid app-grid">
        <article className="card auth-card">
          <div className="section-header">
            <h2>{user ? 'Signed In' : authMode === 'register' ? 'Create Account' : 'Login'}</h2>
            {!user ? (
              <button className="ghost-button" onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}>
                Switch to {authMode === 'register' ? 'login' : 'register'}
              </button>
            ) : null}
          </div>

          {isLoading ? <p>Loading session...</p> : null}

          {!user ? (
            <form className="stack" onSubmit={handleAuthSubmit}>
              <label>
                <span>Email</span>
                <input name="email" type="email" required />
              </label>

              {authMode === 'register' ? (
                <label>
                  <span>Username</span>
                  <input name="username" type="text" minLength={3} maxLength={24} required />
                </label>
              ) : null}

              <label>
                <span>Password</span>
                <input name="password" type="password" minLength={8} required />
              </label>

              {authMode === 'register' ? (
                <label>
                  <span>Confirm Password</span>
                  <input name="passwordConfirmation" type="password" minLength={8} required />
                </label>
              ) : null}

              <button className="primary-button" disabled={authPending} type="submit">
                {authPending ? 'Working...' : authMode === 'register' ? 'Register' : 'Login'}
              </button>
            </form>
          ) : (
            <div className="stack">
              <p><strong>{user.username}</strong></p>
              <p>{user.email}</p>
              <button className="ghost-button" onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          )}
        </article>

        <article className="card">
          <div className="section-header">
            <h2>Lobby Rooms</h2>
            <span className="pill">{rooms.length} rooms</span>
          </div>

          <div className="room-list">
            {rooms.map((room) => (
              <div className="room-row" key={room.id}>
                <div>
                  <strong>{room.name}</strong>
                  <p>
                    {room.width}x{room.height} tiles · max {room.max_users}
                  </p>
                </div>
                <span className="pill">{room.is_lobby ? 'Lobby' : 'Room'}</span>
              </div>
            ))}
          </div>

          {user ? (
            <form className="stack create-room" onSubmit={handleCreateRoom}>
              <label>
                <span>Create Room</span>
                <input name="name" type="text" minLength={3} maxLength={40} placeholder="Pixel Loft" required />
              </label>

              <button className="primary-button" disabled={roomPending} type="submit">
                {roomPending ? 'Creating...' : 'Create Room'}
              </button>
            </form>
          ) : (
            <p className="muted">Sign in to create rooms.</p>
          )}
        </article>
      </section>
    </main>
  )
}

export default App
