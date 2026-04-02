import { useEffect, useRef } from 'react'

import { Application, Container, Graphics, Text } from 'pixi.js'

type User = {
  username: string
}

type Room = {
  id: number
  name: string
  is_lobby: boolean
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

type GameCanvasProps = {
  activeRoomName: string
  authMode: 'login' | 'register'
  movementMsPerTile: number
  movementPaths: Record<string, PathStep[]>
  onTileSelect: (x: number, y: number) => void
  presencePlayers: PresencePlayer[]
  user: User | null
  rooms: Room[]
}

type ResizableApplication = Application & {
  _cancelResize?: () => void
}

type AvatarSprite = {
  body: Graphics
  container: Container
  currentX: number
  currentY: number
  label: Text
  pathQueue: Array<{ x: number; y: number }>
  stepDurationMs: number
  stepElapsedMs: number
  stepStartX: number
  stepStartY: number
  shadow: Graphics
  targetX: number
  targetY: number
}

type SceneRefs = {
  app: Application | null
  avatarLayer: Container | null
  avatars: Map<string, AvatarSprite>
  frameLabel: Text | null
  hoverTile: Graphics | null
  marquee: Text | null
  scene: Container | null
  speechText: Text | null
  stars: Graphics[]
  subtitle: Text | null
  targetTile: Graphics | null
}

const CANVAS_HEIGHT = 620
const GRID_SIZE = 8
const TILE_W = 56
const TILE_H = 28
const AVATAR_TINTS = [0x8b5cf6, 0x14b8a6, 0xf97316, 0xec4899, 0x22c55e, 0xfacc15]

function safeDestroy(app: Application | null) {
  if (!app) {
    return
  }

  try {
    const disposableApp = app as ResizableApplication
    disposableApp._cancelResize ??= () => undefined
    disposableApp.destroy(true, { children: true })
  } catch {
    // Ignore Pixi teardown noise during dev reloads.
  }
}

function tintForPlayer(index: number, sessionId: string) {
  let hash = 0

  for (const char of sessionId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return AVATAR_TINTS[(hash + index) % AVATAR_TINTS.length]
}

export function GameCanvas({ activeRoomName, authMode, movementMsPerTile, movementPaths, onTileSelect, presencePlayers, user, rooms }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const sceneRefs = useRef<SceneRefs>({
    app: null,
    avatarLayer: null,
    avatars: new Map(),
    frameLabel: null,
    hoverTile: null,
    marquee: null,
    scene: null,
    speechText: null,
    stars: [],
    subtitle: null,
    targetTile: null,
  })
  const onTileSelectRef = useRef(onTileSelect)
  const userRef = useRef(user)
  const latestPlayersRef = useRef(presencePlayers)

  onTileSelectRef.current = onTileSelect
  userRef.current = user
  latestPlayersRef.current = presencePlayers

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    let mounted = true
    let detachEvents: (() => void) | undefined

    const render = async () => {
      const width = Math.max(host.clientWidth, 320)
      const isoOriginX = width * 0.66
      const isoOriginY = 326

      const isoToScreen = (x: number, y: number) => ({
        x: isoOriginX + (x - y) * (TILE_W / 2),
        y: isoOriginY + (x + y) * (TILE_H / 2),
      })

      const screenToTile = (screenX: number, screenY: number) => {
        const localX = screenX - isoOriginX
        const localY = screenY - isoOriginY

        return {
          x: Math.round((localX / (TILE_W / 2) + localY / (TILE_H / 2)) / 2),
          y: Math.round((localY / (TILE_H / 2) - localX / (TILE_W / 2)) / 2),
        }
      }

      const app = new Application()
      await app.init({
        width,
        height: CANVAS_HEIGHT,
        antialias: true,
        autoDensity: true,
        background: 0x08111f,
        resolution: window.devicePixelRatio || 1,
      })

      if (!mounted) {
        safeDestroy(app)
        return
      }

      sceneRefs.current.app = app
      host.replaceChildren(app.canvas)

      const root = new Container()
      const scene = new Container()
      const avatarLayer = new Container()
      sceneRefs.current.scene = scene
      sceneRefs.current.avatarLayer = avatarLayer
      root.addChild(scene)
      app.stage.addChild(root)

      let dragActive = false
      let dragMoved = false
      let dragStartX = 0
      let dragStartY = 0
      let sceneStartX = 0
      let sceneStartY = 0

      const clampScene = () => {
        scene.x = Math.min(140, Math.max(-140, scene.x))
        scene.y = Math.min(90, Math.max(-90, scene.y))
      }

      const sky = new Graphics()
      sky.rect(0, 0, width, CANVAS_HEIGHT).fill(0x08111f)
      scene.addChild(sky)

      const haze = new Graphics()
      haze.circle(width * 0.24, 120, 220).fill({ color: 0x26c1ff, alpha: 0.12 })
      haze.circle(width * 0.78, 160, 180).fill({ color: 0xff61d8, alpha: 0.09 })
      scene.addChild(haze)

      sceneRefs.current.stars = Array.from({ length: 28 }, (_, index) => {
        const star = new Graphics()
        const x = ((index * 131) % (width - 40)) + 20
        const y = ((index * 71) % 150) + 24
        const radius = index % 3 === 0 ? 2.4 : 1.5

        star.circle(0, 0, radius).fill(0xffffff)
        star.x = x
        star.y = y
        star.alpha = 0.35 + (index % 5) * 0.1
        scene.addChild(star)
        return star
      })

      const glowLine = new Graphics()
      glowLine.roundRect(42, 68, width - 84, 12, 6).fill({ color: 0x7dd3fc, alpha: 0.1 })
      scene.addChild(glowLine)

      const sceneFrame = new Graphics()
      sceneFrame.roundRect(38, 38, width - 76, CANVAS_HEIGHT - 112, 28).fill({ color: 0x0e1a2e, alpha: 0.88 })
      sceneFrame.roundRect(38, 38, width - 76, CANVAS_HEIGHT - 112, 28).stroke({ color: 0x2e436b, width: 2 })
      scene.addChild(sceneFrame)

      const frameLabel = new Text({
        text: '',
        style: {
          fill: 0xf4f7ff,
          fontSize: 18,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '700',
        },
      })
      frameLabel.x = 60
      frameLabel.y = 60
      scene.addChild(frameLabel)
      sceneRefs.current.frameLabel = frameLabel

      const subtitle = new Text({
        text: '',
        style: {
          fill: 0x91a1c7,
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
        },
      })
      subtitle.x = 60
      subtitle.y = 86
      scene.addChild(subtitle)
      sceneRefs.current.subtitle = subtitle

      const floor = new Graphics()
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const { x: px, y: py } = isoToScreen(x, y)
          const color = (x + y) % 2 === 0 ? 0x26415f : 0x223754

          floor
            .moveTo(px, py)
            .lineTo(px + TILE_W / 2, py + TILE_H / 2)
            .lineTo(px, py + TILE_H)
            .lineTo(px - TILE_W / 2, py + TILE_H / 2)
            .closePath()
            .fill(color)
            .stroke({ color: 0x3f6086, width: 1 })
        }
      }
      scene.addChild(floor)

      const drawTileOutline = (graphic: Graphics, x: number, y: number, color: number, alpha: number) => {
        const position = isoToScreen(x, y)

        graphic.clear()
        graphic
          .moveTo(position.x, position.y)
          .lineTo(position.x + TILE_W / 2, position.y + TILE_H / 2)
          .lineTo(position.x, position.y + TILE_H)
          .lineTo(position.x - TILE_W / 2, position.y + TILE_H / 2)
          .closePath()
          .stroke({ color, width: 2, alpha })
      }

      const hoverTile = new Graphics()
      scene.addChild(hoverTile)
      sceneRefs.current.hoverTile = hoverTile

      const targetTile = new Graphics()
      scene.addChild(targetTile)
      sceneRefs.current.targetTile = targetTile

      const walls = new Graphics()
      walls
        .moveTo(isoOriginX, isoOriginY)
        .lineTo(isoOriginX - GRID_SIZE * TILE_W / 2, isoOriginY + GRID_SIZE * TILE_H / 2)
        .lineTo(isoOriginX - GRID_SIZE * TILE_W / 2, isoOriginY + GRID_SIZE * TILE_H / 2 - 134)
        .lineTo(isoOriginX, isoOriginY - 134)
        .closePath()
        .fill({ color: 0x15243d, alpha: 0.92 })
      walls
        .moveTo(isoOriginX, isoOriginY)
        .lineTo(isoOriginX + GRID_SIZE * TILE_W / 2, isoOriginY + GRID_SIZE * TILE_H / 2)
        .lineTo(isoOriginX + GRID_SIZE * TILE_W / 2, isoOriginY + GRID_SIZE * TILE_H / 2 - 134)
        .lineTo(isoOriginX, isoOriginY - 134)
        .closePath()
        .fill({ color: 0x1a2d4d, alpha: 0.94 })
      scene.addChild(walls)

      const desk = new Graphics()
      desk.roundRect(0, 0, 88, 26, 10).fill(0x8b5d34)
      desk.roundRect(0, 18, 88, 12, 8).fill(0x5a371a)
      desk.x = isoOriginX - 44
      desk.y = isoOriginY + 86
      scene.addChild(desk)

      const doorTile = isoToScreen(7, 6)
      const door = new Graphics()
      door.poly([
        doorTile.x,
        doorTile.y,
        doorTile.x + TILE_W / 2,
        doorTile.y + TILE_H / 2,
        doorTile.x,
        doorTile.y + TILE_H,
        doorTile.x - TILE_W / 2,
        doorTile.y + TILE_H / 2,
      ]).fill({ color: 0x67e8f9, alpha: 0.18 }).stroke({ color: 0x67e8f9, width: 1.5, alpha: 0.42 })
      scene.addChild(door)

      const speech = new Graphics()
      speech.roundRect(0, 0, 170, 46, 18).fill({ color: 0xe8f5ff, alpha: 0.94 })
      speech.poly([26, 46, 46, 46, 35, 62]).fill({ color: 0xe8f5ff, alpha: 0.94 })
      speech.x = width - 256
      speech.y = 144
      scene.addChild(speech)

      const speechText = new Text({
        text: '',
        style: {
          fill: 0x10203d,
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '700',
        },
      })
      speechText.x = speech.x + 16
      speechText.y = speech.y + 15
      scene.addChild(speechText)
      sceneRefs.current.speechText = speechText

      const marquee = new Text({
        text: '',
        style: {
          fill: 0x7dd3fc,
          fontSize: 12,
          fontFamily: 'IBM Plex Mono, monospace',
          letterSpacing: 1.2,
        },
      })
      marquee.x = 60
      marquee.y = CANVAS_HEIGHT - 86
      scene.addChild(marquee)
      sceneRefs.current.marquee = marquee

      const panHint = new Text({
        text: 'Drag scene · click tile to walk',
        style: {
          fill: 0xb9caef,
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '600',
        },
      })
      panHint.x = width - 198
      panHint.y = CANVAS_HEIGHT - 84
      scene.addChild(panHint)

      scene.addChild(avatarLayer)

      const createAvatar = (labelText: string, tint: number) => {
        const container = new Container()

        const shadow = new Graphics()
        shadow.ellipse(0, 0, 18, 8).fill({ color: 0x04070d, alpha: 0.32 })
        shadow.y = 42
        container.addChild(shadow)

        const body = new Graphics()
        body.circle(0, -10, 11).fill(0xffdfbf)
        body.roundRect(-13, 0, 26, 34, 12).fill(tint)
        body.roundRect(-16, 6, 6, 22, 6).fill(tint)
        body.roundRect(10, 6, 6, 22, 6).fill(tint)
        body.roundRect(-10, 30, 7, 18, 5).fill(0x1e293b)
        body.roundRect(3, 30, 7, 18, 5).fill(0x1e293b)
        container.addChild(body)

        const label = new Text({
          text: labelText,
          style: {
            fill: 0xf8fbff,
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            fontWeight: '700',
            stroke: { color: 0x09101f, width: 3 },
          },
        })
        label.anchor.set(0.5)
        label.y = -34
        container.addChild(label)

        avatarLayer.addChild(container)

        return {
          body,
          container,
          currentX: 0,
          currentY: 0,
          label,
          pathQueue: [],
          stepDurationMs: movementMsPerTile,
          stepElapsedMs: 0,
          stepStartX: 0,
          stepStartY: 0,
          shadow,
          targetX: 0,
          targetY: 0,
        }
      }

      app.ticker.add((ticker) => {
        const t = ticker.lastTime / 900

        sceneRefs.current.stars.forEach((star, index) => {
          star.alpha = 0.28 + ((Math.sin(t + index) + 1) / 2) * 0.65
        })

        if (sceneRefs.current.marquee) {
          sceneRefs.current.marquee.x = 60 - ((ticker.lastTime / 28) % Math.max(sceneRefs.current.marquee.width + 120, 1))
        }

        for (const avatar of sceneRefs.current.avatars.values()) {
          if (
            avatar.pathQueue.length > 0
            && avatar.stepElapsedMs >= avatar.stepDurationMs
          ) {
            const nextStep = avatar.pathQueue.shift()

            if (nextStep) {
              avatar.stepStartX = avatar.currentX
              avatar.stepStartY = avatar.currentY
              avatar.stepElapsedMs = 0
              avatar.targetX = nextStep.x
              avatar.targetY = nextStep.y
            }
          }

          const moving = Math.abs(avatar.targetX - avatar.currentX) + Math.abs(avatar.targetY - avatar.currentY) > 0.1

          if (moving) {
            avatar.stepElapsedMs = Math.min(avatar.stepElapsedMs + ticker.deltaMS, avatar.stepDurationMs)
            const progress = Math.min(avatar.stepElapsedMs / avatar.stepDurationMs, 1)
            avatar.currentX = avatar.stepStartX + (avatar.targetX - avatar.stepStartX) * progress
            avatar.currentY = avatar.stepStartY + (avatar.targetY - avatar.stepStartY) * progress
          }

          const bob = moving ? Math.sin(ticker.lastTime / 90 + avatar.targetX / 30) * 3 : 0

          avatar.container.x = avatar.currentX
          avatar.container.y = avatar.currentY + bob
          avatar.shadow.alpha = moving ? 0.22 : 0.32
          avatar.body.scale.y = moving ? 0.98 : 1
        }
      })

      const pointerDown = (event: PointerEvent) => {
        dragActive = true
        dragMoved = false
        dragStartX = event.clientX
        dragStartY = event.clientY
        sceneStartX = scene.x
        sceneStartY = scene.y
      }

      const pointerMove = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect()
        const tile = screenToTile(event.clientX - rect.left - scene.x, event.clientY - rect.top - scene.y)

        if (tile.x >= 0 && tile.x < GRID_SIZE && tile.y >= 0 && tile.y < GRID_SIZE) {
          drawTileOutline(hoverTile, tile.x, tile.y, 0x7dd3fc, 0.85)
        } else {
          hoverTile.clear()
        }

        if (!dragActive) {
          return
        }

        const deltaX = event.clientX - dragStartX
        const deltaY = event.clientY - dragStartY

        if (Math.abs(deltaX) + Math.abs(deltaY) > 6) {
          dragMoved = true
        }

        scene.x = sceneStartX + deltaX
        scene.y = sceneStartY + deltaY
        clampScene()
      }

      const pointerUp = (event: PointerEvent) => {
        if (!dragActive) {
          return
        }

        dragActive = false

        if (dragMoved || !userRef.current) {
          return
        }

        const rect = host.getBoundingClientRect()
        const tile = screenToTile(event.clientX - rect.left - scene.x, event.clientY - rect.top - scene.y)

        if (tile.x < 0 || tile.x >= GRID_SIZE || tile.y < 0 || tile.y >= GRID_SIZE) {
          return
        }

        drawTileOutline(targetTile, tile.x, tile.y, 0xf8fafc, 1)

        onTileSelectRef.current(tile.x, tile.y)
      }

      const pointerLeave = () => {
        hoverTile.clear()
      }

      host.addEventListener('pointerdown', pointerDown)
      host.addEventListener('pointerleave', pointerLeave)
      window.addEventListener('pointermove', pointerMove)
      window.addEventListener('pointerup', pointerUp)

      detachEvents = () => {
        host.removeEventListener('pointerdown', pointerDown)
        host.removeEventListener('pointerleave', pointerLeave)
        window.removeEventListener('pointermove', pointerMove)
        window.removeEventListener('pointerup', pointerUp)
      }

      const initialPlayers = latestPlayersRef.current.length > 0
        ? latestPlayersRef.current
        : [
            { sessionId: 'guest', userId: 0, username: userRef.current?.username ?? 'Guest', avatarConfig: null, x: 3, y: 2 },
            { sessionId: 'guide', userId: -1, username: 'Guide', avatarConfig: null, x: 5, y: 3 },
            { sessionId: 'builder', userId: -2, username: 'Builder', avatarConfig: null, x: 2, y: 4 },
          ]

      for (const [index, player] of initialPlayers.entries()) {
        const avatar = createAvatar(player.username, tintForPlayer(index, player.sessionId))
        const position = isoToScreen(player.x, player.y)
        avatar.currentX = position.x
        avatar.currentY = position.y - 18
        avatar.targetX = position.x
        avatar.targetY = position.y - 18
        avatar.container.x = avatar.currentX
        avatar.container.y = avatar.currentY
        sceneRefs.current.avatars.set(player.sessionId, avatar)
      }
    }

    void render()

    return () => {
      mounted = false
      detachEvents?.()
      safeDestroy(sceneRefs.current.app)
      sceneRefs.current = {
        app: null,
        avatarLayer: null,
        avatars: new Map(),
        frameLabel: null,
        hoverTile: null,
        marquee: null,
        scene: null,
        speechText: null,
        stars: [],
        subtitle: null,
        targetTile: null,
      }
      host.replaceChildren()
    }
  }, [])

  useEffect(() => {
    const refs = sceneRefs.current
    const avatarLayer = refs.avatarLayer

    if (!refs.app || !refs.scene || !avatarLayer) {
      return
    }

    if (refs.frameLabel) {
      refs.frameLabel.text = user ? `${activeRoomName} · ${user.username}` : authMode === 'register' ? 'Create your avatar' : 'Welcome back'
    }

    if (refs.subtitle) {
      refs.subtitle.text = user
        ? 'Click a tile to walk. Drag to pan the room.'
        : 'Login and registration live directly inside the game frame.'
    }

    if (refs.speechText) {
      refs.speechText.text = user ? `${activeRoomName} is open. Walk in.` : 'Enter the hotel and claim your name.'
    }

    if (refs.marquee) {
      refs.marquee.text = rooms.length > 0
        ? rooms.slice(0, 4).map((room) => room.is_lobby ? 'Lobby' : room.name).join('   •   ')
        : 'Lobby   •   Pixel Loft'
    }

    const players = presencePlayers.length > 0
      ? presencePlayers.slice(0, 10)
      : [
          { sessionId: 'guest', userId: 0, username: user?.username ?? 'Guest', avatarConfig: null, x: 3, y: 2 },
          { sessionId: 'guide', userId: -1, username: 'Guide', avatarConfig: null, x: 5, y: 3 },
          { sessionId: 'builder', userId: -2, username: 'Builder', avatarConfig: null, x: 2, y: 4 },
        ]

    const width = refs.app.canvas.width / (window.devicePixelRatio || 1)
    const isoOriginX = width * 0.66
    const isoOriginY = 326
    const isoToScreen = (x: number, y: number) => ({
      x: isoOriginX + (x - y) * (TILE_W / 2),
      y: isoOriginY + (x + y) * (TILE_H / 2),
    })

    const activeSessionIds = new Set(players.map((player) => player.sessionId))

    for (const [sessionId, avatar] of refs.avatars.entries()) {
      if (!activeSessionIds.has(sessionId)) {
        avatarLayer.removeChild(avatar.container)
        avatar.container.destroy({ children: true })
        refs.avatars.delete(sessionId)
      }
    }

    for (const [index, player] of players.entries()) {
      let avatar = refs.avatars.get(player.sessionId)

      if (!avatar) {
        const container = new Container()

        const shadow = new Graphics()
        shadow.ellipse(0, 0, 18, 8).fill({ color: 0x04070d, alpha: 0.32 })
        shadow.y = 42
        container.addChild(shadow)

        const body = new Graphics()
        const tint = tintForPlayer(index, player.sessionId)
        body.circle(0, -10, 11).fill(0xffdfbf)
        body.roundRect(-13, 0, 26, 34, 12).fill(tint)
        body.roundRect(-16, 6, 6, 22, 6).fill(tint)
        body.roundRect(10, 6, 6, 22, 6).fill(tint)
        body.roundRect(-10, 30, 7, 18, 5).fill(0x1e293b)
        body.roundRect(3, 30, 7, 18, 5).fill(0x1e293b)
        container.addChild(body)

        const label = new Text({
          text: player.username,
          style: {
            fill: 0xf8fbff,
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            fontWeight: '700',
            stroke: { color: 0x09101f, width: 3 },
          },
        })
        label.anchor.set(0.5)
        label.y = -34
        container.addChild(label)
        avatarLayer.addChild(container)

        const position = isoToScreen(player.x, player.y)
        avatar = {
          body,
          container,
          currentX: position.x,
          currentY: position.y - 18,
          label,
          pathQueue: [],
          stepDurationMs: movementMsPerTile,
          stepElapsedMs: movementMsPerTile,
          stepStartX: position.x,
          stepStartY: position.y - 18,
          shadow,
          targetX: position.x,
          targetY: position.y - 18,
        }
        container.x = avatar.currentX
        container.y = avatar.currentY
        refs.avatars.set(player.sessionId, avatar)
      }

      const nextPosition = isoToScreen(player.x, player.y)
      avatar.label.text = player.username
      avatar.stepDurationMs = movementMsPerTile
      avatar.targetX = nextPosition.x
      avatar.targetY = nextPosition.y - 18

      if (avatar.pathQueue.length === 0 && Math.abs(avatar.currentX - avatar.targetX) < 0.1 && Math.abs(avatar.currentY - avatar.targetY) < 0.1) {
        avatar.currentX = avatar.targetX
        avatar.currentY = avatar.targetY
        avatar.stepStartX = avatar.targetX
        avatar.stepStartY = avatar.targetY
        avatar.stepElapsedMs = avatar.stepDurationMs
      }
    }
    const pathEntries = Object.entries(movementPaths)

    for (const [sessionId, steps] of pathEntries) {
      const avatar = refs.avatars.get(sessionId)

      if (!avatar || steps.length === 0) {
        continue
      }

      avatar.pathQueue = steps.map((step) => {
        const position = isoToScreen(step.x, step.y)

        return {
          x: position.x,
          y: position.y - 18,
        }
      })

      const nextStep = avatar.pathQueue.shift()

      if (nextStep) {
        avatar.stepDurationMs = movementMsPerTile
        avatar.stepElapsedMs = 0
        avatar.stepStartX = avatar.currentX
        avatar.stepStartY = avatar.currentY
        avatar.targetX = nextStep.x
        avatar.targetY = nextStep.y
      }
    }
  }, [activeRoomName, authMode, movementMsPerTile, movementPaths, presencePlayers, rooms, user])

  return <div className="game-canvas" ref={hostRef} />
}
