import crypto from 'node:crypto'
import http from 'node:http'
import process from 'node:process'

import { Client, Room, Server, matchMaker } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const MOVEMENT_MS_PER_TILE = Number(process.env.MOVEMENT_MS_PER_TILE ?? 200)

type JoinPayload = {
  user_id: number
  username: string
  avatar_config: Record<string, string> | null
  room_name: string
  exp: number
}

type PresencePlayer = {
  sessionId: string
  userId: number
  username: string
  avatarConfig: Record<string, string> | null
  direction: string
  state: 'idle' | 'walking'
  x: number
  y: number
}

type RoomOptions = {
  roomKey?: string
}

class BasePresenceRoom extends Room<never, { roomKey: string }, unknown, JoinPayload> {
  private players = new Map<string, PresencePlayer>()

  private getSpawnPosition() {
    const taken = new Set(Array.from(this.players.values()).map((player) => `${player.x}:${player.y}`))
    const candidates = [
      { x: 7, y: 6 },
      { x: 6, y: 6 },
      { x: 7, y: 5 },
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 6, y: 4 },
      { x: 5, y: 4 },
      { x: 4, y: 4 },
    ]

    return candidates.find((candidate) => !taken.has(`${candidate.x}:${candidate.y}`)) ?? { x: 0, y: 0 }
  }

  private isOccupied(x: number, y: number, exceptSessionId?: string) {
    return Array.from(this.players.values()).some((player) => {
      if (player.sessionId === exceptSessionId) {
        return false
      }

      return player.x === x && player.y === y
    })
  }

  private tileHeight(_x: number, _y: number) {
    return 0
  }

  private isWalkableTile(x: number, y: number, exceptSessionId?: string) {
    if (x < 0 || x >= 8 || y < 0 || y >= 8) {
      return false
    }

    return !this.isOccupied(x, y, exceptSessionId)
  }

  private directionForStep(fromX: number, fromY: number, toX: number, toY: number) {
    const dx = Math.sign(toX - fromX)
    const dy = Math.sign(toY - fromY)
    const key = `${dx},${dy}`

    return {
      '-1,-1': 'nw',
      '0,-1': 'n',
      '1,-1': 'ne',
      '-1,0': 'w',
      '1,0': 'e',
      '-1,1': 'sw',
      '0,1': 's',
      '1,1': 'se',
    }[key] ?? 's'
  }

  private heuristic(x: number, y: number, targetX: number, targetY: number) {
    const dx = Math.abs(targetX - x)
    const dy = Math.abs(targetY - y)
    const diagonal = Math.min(dx, dy)
    const straight = Math.max(dx, dy) - diagonal

    return diagonal * 1.4 + straight
  }

  private findPath(startX: number, startY: number, targetX: number, targetY: number, exceptSessionId: string) {
    const startKey = `${startX}:${startY}`
    const targetKey = `${targetX}:${targetY}`
    const open = new Set<string>([startKey])
    const closed = new Set<string>()
    const cameFrom = new Map<string, string>()
    const gScore = new Map<string, number>([[startKey, 0]])
    const fScore = new Map<string, number>([[startKey, this.heuristic(startX, startY, targetX, targetY)]])
    const parseKey = (key: string) => {
      const [x, y] = key.split(':').map(Number)
      return { x, y }
    }

    while (open.size > 0) {
      const currentKey = Array.from(open).sort((left, right) => (fScore.get(left) ?? Infinity) - (fScore.get(right) ?? Infinity))[0]
      const current = parseKey(currentKey)
      open.delete(currentKey)
      closed.add(currentKey)

      if (currentKey === targetKey) {
        const path: Array<{ x: number; y: number }> = []
        let cursorKey: string | undefined = currentKey

        while (cursorKey) {
          path.unshift(parseKey(cursorKey))
          cursorKey = cameFrom.get(cursorKey)
        }

        return path.length > 0 ? path : [{ x: startX, y: startY }]
      }

      const neighbors = [
        { dx: -1, dy: -1, cost: 1.4 },
        { dx: 0, dy: -1, cost: 1 },
        { dx: 1, dy: -1, cost: 1.4 },
        { dx: -1, dy: 0, cost: 1 },
        { dx: 1, dy: 0, cost: 1 },
        { dx: -1, dy: 1, cost: 1.4 },
        { dx: 0, dy: 1, cost: 1 },
        { dx: 1, dy: 1, cost: 1.4 },
      ]

      for (const neighbor of neighbors) {
        const nextX = current.x + neighbor.dx
        const nextY = current.y + neighbor.dy
        const nextKey = `${nextX}:${nextY}`

        if (closed.has(nextKey)) {
          continue
        }

        if (!this.isWalkableTile(nextX, nextY, exceptSessionId) && nextKey !== targetKey) {
          continue
        }

        if (neighbor.dx !== 0 && neighbor.dy !== 0) {
          const sideAOpen = this.isWalkableTile(current.x + neighbor.dx, current.y, exceptSessionId)
          const sideBOpen = this.isWalkableTile(current.x, current.y + neighbor.dy, exceptSessionId)

          if (!sideAOpen || !sideBOpen) {
            continue
          }
        }

        const currentHeight = this.tileHeight(current.x, current.y)
        const nextHeight = this.tileHeight(nextX, nextY)

        if (Math.abs(nextHeight - currentHeight) > 1) {
          continue
        }

        const tentativeG = (gScore.get(currentKey) ?? Infinity) + neighbor.cost
        const existingG = gScore.get(nextKey)

        if (existingG === undefined || tentativeG < existingG) {
          cameFrom.set(nextKey, currentKey)
          gScore.set(nextKey, tentativeG)
          fScore.set(nextKey, tentativeG + this.heuristic(nextX, nextY, targetX, targetY))
          open.add(nextKey)
        }
      }
    }

    return []
  }

  onCreate(options: RoomOptions = {}) {
    this.maxClients = 40
    const roomKey = options.roomKey ?? 'lobby'

    this.roomId = roomKey
    this.autoDispose = roomKey === 'lobby' ? false : true
    void this.setMetadata({ roomKey })

    this.onMessage('ping', (client) => {
      client.send('pong', {
        roomId: this.roomId,
        timestamp: Date.now(),
      })
    })

    this.onMessage('presence_sync', (client) => {
      client.send('presence_snapshot', {
        players: Array.from(this.players.values()),
      })
    })

    this.onMessage('move_to', (client, message: { x?: number; y?: number }) => {
      const player = this.players.get(client.sessionId)

      if (!player) {
        return
      }

      const x = Number(message.x)
      const y = Number(message.y)

      if (!Number.isInteger(x) || !Number.isInteger(y)) {
        return
      }

      if (!this.isWalkableTile(x, y, client.sessionId)) {
        return
      }

      const path = this.findPath(player.x, player.y, x, y, client.sessionId)

      if (path.length < 2) {
        return
      }

      player.x = x
      player.y = y
      player.direction = this.directionForStep(path[path.length - 2].x, path[path.length - 2].y, x, y)
      player.state = 'walking'

      this.broadcast('presence_path', {
        msPerTile: MOVEMENT_MS_PER_TILE,
        sessionId: client.sessionId,
        path: path.slice(1),
      })

      player.state = 'idle'
    })
  }

  onAuth(_client: Client, options: { token?: string }) {
    if (!options.token) {
      throw new Error('Missing realtime token')
    }

    const payload = verifyRealtimeToken(options.token)

    if (payload.room_name !== this.roomId) {
      throw new Error('Realtime token does not match requested room')
    }

    return payload
  }

  onJoin(client: Client, _options: unknown, auth: JoinPayload) {
    const spawn = this.getSpawnPosition()
    const player: PresencePlayer = {
      sessionId: client.sessionId,
      userId: auth.user_id,
      username: auth.username,
      avatarConfig: auth.avatar_config ?? null,
      direction: 'sw',
      state: 'idle',
      x: spawn.x,
      y: spawn.y,
    }

    this.players.set(client.sessionId, player)
    this.broadcast('presence_joined', player, { except: client })
  }

  onLeave(client: Client) {
    const player = this.players.get(client.sessionId)

    if (!player) {
      return
    }

    this.players.delete(client.sessionId)
    this.broadcast('presence_left', {
      sessionId: client.sessionId,
    })
  }
}

class LobbyRoom extends BasePresenceRoom {}

class SocialRoom extends BasePresenceRoom {}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  return Buffer.from(padded, 'base64').toString('utf8')
}

function verifyRealtimeToken(token: string): JoinPayload {
  const [encodedPayload, signature] = token.split('.')

  if (!encodedPayload || !signature) {
    throw new Error('Malformed realtime token')
  }

  const configuredKey = process.env.REALTIME_TOKEN_SECRET || 'spaciopixel-realtime-secret'
  const signingKey = configuredKey.startsWith('base64:')
    ? Buffer.from(configuredKey.slice(7), 'base64')
    : configuredKey
  const expectedSignature = crypto.createHmac('sha256', signingKey).update(encodedPayload).digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid realtime token signature')
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JoinPayload

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Realtime token expired')
  }

  return payload
}

const port = Number(process.env.PORT ?? 2567)
const app = express()

app.use(cors())
app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

const server = http.createServer(app)
const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
})

gameServer.define('lobby', LobbyRoom)
gameServer.define('room', SocialRoom).filterBy(['roomKey'])

void matchMaker.createRoom('lobby', {})

server.listen(port, () => {
  console.log(`SpacioPixel realtime listening on :${port}`)
})
