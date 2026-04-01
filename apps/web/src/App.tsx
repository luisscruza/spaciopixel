import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import './App.css'
import { GameCanvas } from './components/GameCanvas'

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
    <main className="shell game-shell">
      <section className="client-shell">
        <div className="client-topbar">
          <div>
            <p className="eyebrow">SpacioPixel Hotel</p>
            <h1>{user ? 'Lobby Client' : 'Enter The Hotel'}</h1>
          </div>

          <div className="topbar-meta">
            <span className="status-dot" />
            <span>{user ? `${user.username} online` : 'guest session'}</span>
          </div>
        </div>

        <div className="client-stage">
          <GameCanvas authMode={authMode} rooms={rooms} user={user} />

          <div className="hud hud-left">
            {!user ? (
              <article className="panel auth-panel">
                <div className="section-header compact">
                  <div>
                    <h2>{authMode === 'register' ? 'Create Avatar' : 'Login'}</h2>
                    <p className="muted small-copy">
                      {authMode === 'register'
                        ? 'Pick a name and step into the lobby.'
                        : 'Use your hotel account to continue.'}
                    </p>
                  </div>

                  <button
                    className="ghost-button"
                    onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
                    type="button"
                  >
                    {authMode === 'register' ? 'Have an account?' : 'Need an account?'}
                  </button>
                </div>

                {isLoading ? <p className="muted">Loading session...</p> : null}

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
                    {authPending ? 'Connecting...' : authMode === 'register' ? 'Enter hotel' : 'Login'}
                  </button>
                </form>
              </article>
            ) : (
              <article className="panel auth-panel profile-panel">
                <div className="section-header compact">
                  <div>
                    <h2>{user.username}</h2>
                    <p className="muted small-copy">{user.email}</p>
                  </div>

                  <button className="ghost-button" onClick={handleLogout} type="button">
                    Exit hotel
                  </button>
                </div>

                <p className="muted">
                  Your client is authenticated. Next step is to join a live Colyseus room and render presence.
                </p>
              </article>
            )}

            {error ? <p className="notice error">{error}</p> : null}
          </div>

          <div className="hud hud-right">
            <article className="panel rooms-panel">
              <div className="section-header compact">
                <div>
                  <h2>Room Navigator</h2>
                  <p className="muted small-copy">{rooms.length} rooms indexed</p>
                </div>
                <span className="pill">Lobby</span>
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
                    <span className="pill">{room.is_lobby ? 'Public' : 'Private'}</span>
                  </div>
                ))}
              </div>

              {user ? (
                <form className="stack create-room" onSubmit={handleCreateRoom}>
                  <label>
                    <span>Create Room</span>
                    <input name="name" type="text" minLength={3} maxLength={40} placeholder="Sky Lounge" required />
                  </label>

                  <button className="primary-button" disabled={roomPending} type="submit">
                    {roomPending ? 'Building...' : 'Build Room'}
                  </button>
                </form>
              ) : (
                <p className="muted">Register inside the client to create your own room.</p>
              )}
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
