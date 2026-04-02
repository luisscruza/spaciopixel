import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Client as ColyseusClient } from 'colyseus.js'

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

type PresencePlayer = {
  sessionId: string
  userId: number
  username: string
  avatarConfig: Record<string, string> | null
  x: number
  y: number
}

type PathStep = {
  x: number
  y: number
}

type RealtimeRoom = {
  leave: () => Promise<number>
  onLeave: (callback: (code: number, reason?: string) => void) => void
  onMessage: <T>(type: string, callback: (message: T) => void) => void
  send: (type: string, message?: unknown) => void
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const TOKEN_KEY = 'spaciopixel.auth.token'
const REALTIME_URL = import.meta.env.VITE_REALTIME_URL ?? 'ws://localhost:2567'

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [error, setError] = useState<string | null>(null)
  const [authPending, setAuthPending] = useState(false)
  const [roomPending, setRoomPending] = useState(false)
  const [presencePlayers, setPresencePlayers] = useState<PresencePlayer[]>([])
  const [movementPaths, setMovementPaths] = useState<Record<string, PathStep[]>>({})
  const [movementMsPerTile, setMovementMsPerTile] = useState(200)
  const [activeMenu, setActiveMenu] = useState<'navigator' | 'account' | null>(null)
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null)
  const realtimeRoomRef = useRef<RealtimeRoom | null>(null)

  useEffect(() => {
    void loadRooms()
  }, [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setPresencePlayers([])
      setActiveMenu(null)
      setActiveRoomId(null)
      setIsLoading(false)
      return
    }

    localStorage.setItem(TOKEN_KEY, token)
    void bootstrapSession(token)
  }, [token])

  useEffect(() => {
    const selectedRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms.find((room) => room.is_lobby) ?? null

    if (!token || !user || !selectedRoom) {
      setPresencePlayers([])
      setMovementPaths({})
      return
    }

    const client = new ColyseusClient(REALTIME_URL)
    let joinedRoom: RealtimeRoom | null = null
    let cancelled = false

    const connect = async () => {
      try {
        setError(null)

        const tokenResponse = await fetch(`${API_URL}/api/realtime/token`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ room_name: selectedRoom.slug ?? 'lobby' }),
        })

        if (!tokenResponse.ok) {
          throw new Error('Unable to acquire realtime token')
        }

        const tokenData = (await tokenResponse.json()) as { token: string }
        const room = selectedRoom.is_lobby
          ? await client.joinOrCreate('lobby', { token: tokenData.token })
          : await client.joinOrCreate('room', {
              token: tokenData.token,
              roomKey: selectedRoom.slug ?? `room-${selectedRoom.id}`,
            })

        if (cancelled) {
          void room.leave()
          return
        }

        joinedRoom = room as RealtimeRoom
        realtimeRoomRef.current = joinedRoom
        setError(null)

        room.onMessage<{ players: PresencePlayer[] }>('presence_snapshot', (message) => {
          setPresencePlayers(message.players)
          setMovementPaths({})
          setError(null)
        })

        room.onMessage<PresencePlayer>('presence_joined', (message) => {
          setPresencePlayers((currentPlayers) => {
            const nextPlayers = currentPlayers.filter((player) => player.sessionId !== message.sessionId)
            nextPlayers.push(message)
            return nextPlayers
          })
        })

        room.onMessage<{ sessionId: string }>('presence_left', (message) => {
          setPresencePlayers((currentPlayers) => currentPlayers.filter((player) => player.sessionId !== message.sessionId))
          setMovementPaths((currentPaths) => {
            const nextPaths = { ...currentPaths }
            delete nextPaths[message.sessionId]
            return nextPaths
          })
        })

        room.onMessage<{ msPerTile: number; sessionId: string; path: PathStep[] }>('presence_path', (message) => {
          const destination = message.path[message.path.length - 1]

          if (!destination) {
            return
          }

          setMovementMsPerTile(message.msPerTile)

          setPresencePlayers((currentPlayers) => currentPlayers.map((player) => (
            player.sessionId === message.sessionId
              ? { ...player, x: destination.x, y: destination.y }
              : player
          )))
          setMovementPaths((currentPaths) => ({
            ...currentPaths,
            [message.sessionId]: message.path,
          }))
        })

        room.onLeave(() => {
          setPresencePlayers([])
        })

        room.send('presence_sync')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unexpected realtime error')
      }
    }

    void connect()

    return () => {
      cancelled = true
      setPresencePlayers([])
      setMovementPaths({})
      realtimeRoomRef.current = null

      if (joinedRoom) {
        void joinedRoom.leave()
      }
    }
  }, [activeRoomId, rooms, token, user])

  async function loadRooms() {
    const response = await fetch(`${API_URL}/api/rooms`)

    if (!response.ok) {
      throw new Error('Unable to load rooms')
    }

    const data = (await response.json()) as Room[]
    setRooms(data)
    setActiveRoomId((currentActiveRoomId) => currentActiveRoomId ?? data.find((room) => room.is_lobby)?.id ?? null)
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
      const nextRooms = (await roomsResponse.json()) as Room[]
      setRooms(nextRooms)
      setActiveRoomId((currentActiveRoomId) => currentActiveRoomId ?? nextRooms.find((room) => room.is_lobby)?.id ?? null)
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
      setActiveMenu(null)
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
      setActiveRoomId((data as Room).id)
      setActiveMenu(null)
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
    setActiveMenu(null)
  }

  function toggleMenu(menu: 'navigator' | 'account') {
    setActiveMenu((currentMenu) => currentMenu === menu ? null : menu)
  }

  const handleTileSelect = useCallback((x: number, y: number) => {
    realtimeRoomRef.current?.send('move_to', { x, y })
  }, [])

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms.find((room) => room.is_lobby) ?? null

  return (
    <main className="shell game-shell">
      <section className="client-shell">
        <div className="client-topbar">
          <div>
            <p className="eyebrow">SpacioPixel Hotel</p>
            <h1>{user ? activeRoom?.name ?? 'Lobby Client' : 'Enter The Hotel'}</h1>
          </div>

          <div className="topbar-meta">
            <span className="status-dot" />
            <span>{user ? `${user.username} online` : 'guest session'}</span>
          </div>
        </div>

        <div className="client-stage">
          <GameCanvas
            activeRoomName={activeRoom?.name ?? 'Lobby'}
            authMode={authMode}
            movementMsPerTile={movementMsPerTile}
            movementPaths={movementPaths}
            onTileSelect={handleTileSelect}
            presencePlayers={presencePlayers}
            rooms={rooms}
            user={user}
          />

          {!user ? (
            <div className="hud hud-left">
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
            </div>
          ) : (
            <>
              <div className="sidebar-rail">
                <button
                  className={`rail-button${activeMenu === 'navigator' ? ' active' : ''}`}
                  onClick={() => toggleMenu('navigator')}
                  type="button"
                >
                  <span className="rail-icon">R</span>
                  <span className="rail-label">Rooms</span>
                </button>

                <button
                  className={`rail-button${activeMenu === 'account' ? ' active' : ''}`}
                  onClick={() => toggleMenu('account')}
                  type="button"
                >
                  <span className="rail-icon">U</span>
                  <span className="rail-label">You</span>
                </button>

                <button className="rail-button" onClick={handleLogout} type="button">
                  <span className="rail-icon">X</span>
                  <span className="rail-label">Exit</span>
                </button>
              </div>

              <div className="hud hud-left compact-hud">
                {activeMenu === 'navigator' ? (
                  <article className="panel rooms-panel">
                    <div className="section-header compact">
                      <div>
                        <h2>Navigator</h2>
                        <p className="muted small-copy">{rooms.length} rooms · {presencePlayers.length} online · {activeRoom?.name ?? 'Lobby'}</p>
                      </div>
                      <span className="pill">{activeRoom?.is_lobby ? 'Lobby' : 'Room'}</span>
                    </div>

                    <div className="room-list">
                      {rooms.map((room) => (
                        <button
                          className={`room-row room-row-button${room.id === activeRoomId ? ' active' : ''}`}
                          key={room.id}
                          onClick={() => {
                            setActiveRoomId(room.id)
                            setActiveMenu(null)
                          }}
                          type="button"
                        >
                          <div>
                            <strong>{room.name}</strong>
                            <p>{room.width}x{room.height} · {room.max_users} max</p>
                          </div>
                          <span className="pill">{room.id === activeRoomId ? 'Here' : room.is_lobby ? 'Open' : 'Room'}</span>
                        </button>
                      ))}
                    </div>

                    <form className="stack create-room" onSubmit={handleCreateRoom}>
                      <label>
                        <span>Create Room</span>
                        <input name="name" type="text" minLength={3} maxLength={40} placeholder="Sky Lounge" required />
                      </label>

                      <button className="primary-button" disabled={roomPending} type="submit">
                        {roomPending ? 'Building...' : 'Build'}
                      </button>
                    </form>
                  </article>
                ) : activeMenu === 'account' ? (
                  <article className="panel auth-panel profile-panel">
                    <div className="section-header compact">
                      <div>
                        <h2>{user.username}</h2>
                        <p className="muted small-copy">{user.email}</p>
                      </div>
                    </div>

                    <p className="muted">Connected to the live lobby.</p>
                    <div className="mini-stats">
                      <span className="pill">{presencePlayers.length} avatars</span>
                      <span className="pill">{activeRoom?.name ?? 'Lobby'}</span>
                      <span className="pill">drag to pan</span>
                    </div>
                  </article>
                ) : null}

                {error ? <p className="notice error">{error}</p> : null}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
