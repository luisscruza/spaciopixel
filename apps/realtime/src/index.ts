import http from 'node:http'
import process from 'node:process'

import { Room, Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

class LobbyRoom extends Room {
  onCreate() {
    this.maxClients = 40

    this.onMessage('ping', (client) => {
      client.send('pong', {
        roomId: this.roomId,
        timestamp: Date.now(),
      })
    })
  }
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

server.listen(port, () => {
  console.log(`SpacioPixel realtime listening on :${port}`)
})
