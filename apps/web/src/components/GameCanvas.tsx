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

type GameCanvasProps = {
  authMode: 'login' | 'register'
  user: User | null
  rooms: Room[]
}

type ResizableApplication = Application & {
  _cancelResize?: () => void
}

const CANVAS_HEIGHT = 620

export function GameCanvas({ authMode, user, rooms }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    let app: Application | null = null
    let mounted = true

    const render = async () => {
      const width = Math.max(host.clientWidth, 320)

      app = new Application()
      await app.init({
        width,
        height: CANVAS_HEIGHT,
        antialias: true,
        autoDensity: true,
        background: 0x08111f,
        resolution: window.devicePixelRatio || 1,
      })

      if (!mounted) {
        const disposableApp = app as ResizableApplication
        disposableApp._cancelResize ??= () => undefined
        disposableApp.destroy(true, { children: true })
        return
      }

      host.replaceChildren(app.canvas)

      const root = new Container()
      app.stage.addChild(root)

      const sky = new Graphics()
      sky.rect(0, 0, width, CANVAS_HEIGHT).fill(0x08111f)
      root.addChild(sky)

      const haze = new Graphics()
      haze.circle(width * 0.24, 120, 220).fill({ color: 0x26c1ff, alpha: 0.12 })
      haze.circle(width * 0.78, 160, 180).fill({ color: 0xff61d8, alpha: 0.09 })
      root.addChild(haze)

      const stars = Array.from({ length: 28 }, (_, index) => {
        const star = new Graphics()
        const x = ((index * 131) % (width - 40)) + 20
        const y = ((index * 71) % 150) + 24
        const radius = index % 3 === 0 ? 2.4 : 1.5

        star.circle(0, 0, radius).fill(0xffffff)
        star.x = x
        star.y = y
        star.alpha = 0.35 + (index % 5) * 0.1
        root.addChild(star)

        return star
      })

      const glowLine = new Graphics()
      glowLine.roundRect(42, 68, width - 84, 12, 6).fill({ color: 0x7dd3fc, alpha: 0.1 })
      root.addChild(glowLine)

      const sceneFrame = new Graphics()
      sceneFrame.roundRect(38, 38, width - 76, CANVAS_HEIGHT - 112, 28).fill({ color: 0x0e1a2e, alpha: 0.88 })
      sceneFrame.roundRect(38, 38, width - 76, CANVAS_HEIGHT - 112, 28).stroke({ color: 0x2e436b, width: 2 })
      root.addChild(sceneFrame)

      const frameLabel = new Text({
        text: user ? `Hotel client: ${user.username}` : authMode === 'register' ? 'Create your avatar' : 'Welcome back',
        style: {
          fill: 0xf4f7ff,
          fontSize: 18,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '700',
        },
      })
      frameLabel.x = 60
      frameLabel.y = 60
      root.addChild(frameLabel)

      const subLabel = new Text({
        text: user
          ? 'Lobby online. Pick a room and walk in.'
          : 'Login and registration live directly inside the game frame.',
        style: {
          fill: 0x91a1c7,
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
        },
      })
      subLabel.x = 60
      subLabel.y = 86
      root.addChild(subLabel)

      const isoOriginX = width * 0.66
      const isoOriginY = 326
      const tileW = 56
      const tileH = 28
      const gridW = 8
      const gridH = 8

      const floor = new Graphics()
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          const px = isoOriginX + (x - y) * (tileW / 2)
          const py = isoOriginY + (x + y) * (tileH / 2)
          const color = (x + y) % 2 === 0 ? 0x26415f : 0x223754

          floor
            .moveTo(px, py)
            .lineTo(px + tileW / 2, py + tileH / 2)
            .lineTo(px, py + tileH)
            .lineTo(px - tileW / 2, py + tileH / 2)
            .closePath()
            .fill(color)
            .stroke({ color: 0x3f6086, width: 1 })
        }
      }
      root.addChild(floor)

      const walls = new Graphics()
      walls
        .moveTo(isoOriginX, isoOriginY)
        .lineTo(isoOriginX - gridH * tileW / 2, isoOriginY + gridH * tileH / 2)
        .lineTo(isoOriginX - gridH * tileW / 2, isoOriginY + gridH * tileH / 2 - 134)
        .lineTo(isoOriginX, isoOriginY - 134)
        .closePath()
        .fill({ color: 0x15243d, alpha: 0.92 })
      walls
        .moveTo(isoOriginX, isoOriginY)
        .lineTo(isoOriginX + gridW * tileW / 2, isoOriginY + gridW * tileH / 2)
        .lineTo(isoOriginX + gridW * tileW / 2, isoOriginY + gridW * tileH / 2 - 134)
        .lineTo(isoOriginX, isoOriginY - 134)
        .closePath()
        .fill({ color: 0x1a2d4d, alpha: 0.94 })
      root.addChild(walls)

      const desk = new Graphics()
      desk.roundRect(0, 0, 88, 26, 10).fill(0x8b5d34)
      desk.roundRect(0, 18, 88, 12, 8).fill(0x5a371a)
      desk.x = isoOriginX - 44
      desk.y = isoOriginY + 86
      root.addChild(desk)

      const screen = new Graphics()
      screen.roundRect(0, 0, 84, 54, 12).fill(0x0a0f18)
      screen.roundRect(6, 6, 72, 42, 10).fill({ color: 0x67e8f9, alpha: 0.42 })
      screen.x = 92
      screen.y = 118
      root.addChild(screen)

      const speech = new Graphics()
      speech.roundRect(0, 0, 170, 46, 18).fill({ color: 0xe8f5ff, alpha: 0.94 })
      speech.poly([26, 46, 46, 46, 35, 62]).fill({ color: 0xe8f5ff, alpha: 0.94 })
      speech.x = width - 256
      speech.y = 144
      root.addChild(speech)

      const speechText = new Text({
        text: user ? 'Lobby is warm. Rooms are live.' : 'Enter the hotel and claim your name.',
        style: {
          fill: 0x10203d,
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '700',
        },
      })
      speechText.x = speech.x + 16
      speechText.y = speech.y + 15
      root.addChild(speechText)

      const marquee = new Text({
        text: rooms.length > 0
          ? rooms.slice(0, 4).map((room) => room.is_lobby ? 'Lobby' : room.name).join('   •   ')
          : 'Lobby   •   Pixel Loft',
        style: {
          fill: 0x7dd3fc,
          fontSize: 12,
          fontFamily: 'IBM Plex Mono, monospace',
          letterSpacing: 1.2,
        },
      })
      marquee.x = 60
      marquee.y = CANVAS_HEIGHT - 86
      root.addChild(marquee)

      const createAvatar = (x: number, y: number, tint: number, label: string) => {
        const avatar = new Container()

        const shadow = new Graphics()
        shadow.ellipse(0, 0, 18, 8).fill({ color: 0x04070d, alpha: 0.32 })
        shadow.y = 42
        avatar.addChild(shadow)

        const body = new Graphics()
        body.circle(0, -10, 11).fill(0xffdfbf)
        body.roundRect(-13, 0, 26, 34, 12).fill(tint)
        body.roundRect(-16, 6, 6, 22, 6).fill(tint)
        body.roundRect(10, 6, 6, 22, 6).fill(tint)
        body.roundRect(-10, 30, 7, 18, 5).fill(0x1e293b)
        body.roundRect(3, 30, 7, 18, 5).fill(0x1e293b)
        avatar.addChild(body)

        const nameplate = new Text({
          text: label,
          style: {
            fill: 0xf8fbff,
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            fontWeight: '700',
            stroke: { color: 0x09101f, width: 3 },
          },
        })
        nameplate.anchor.set(0.5)
        nameplate.y = -34
        avatar.addChild(nameplate)

        avatar.x = x
        avatar.y = y
        root.addChild(avatar)

        return avatar
      }

      const avatars = [
        createAvatar(isoOriginX - 28, isoOriginY + 44, 0x8b5cf6, user?.username ?? 'Guest'),
        createAvatar(isoOriginX + 58, isoOriginY + 82, 0x14b8a6, 'Guide'),
        createAvatar(isoOriginX - 124, isoOriginY + 82, 0xf97316, 'Builder'),
      ]

      app.ticker.add((ticker) => {
        const t = ticker.lastTime / 900

        stars.forEach((star, index) => {
          star.alpha = 0.28 + ((Math.sin(t + index) + 1) / 2) * 0.65
        })

        avatars.forEach((avatar, index) => {
          avatar.y += Math.sin(t + index * 0.7) * 0.12
        })

        marquee.x = 60 - ((ticker.lastTime / 28) % Math.max(marquee.width + 120, 1))
      })
    }

    void render()

    return () => {
      mounted = false
      if (app) {
        const disposableApp = app as ResizableApplication
        disposableApp._cancelResize ??= () => undefined
        disposableApp.destroy(true, { children: true })
      }
      host.replaceChildren()
    }
  }, [authMode, rooms, user])

  return <div className="game-canvas" ref={hostRef} />
}
