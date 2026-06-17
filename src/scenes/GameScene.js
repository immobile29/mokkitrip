import { Player } from '../objects/Player.js'
import { NPC } from '../objects/NPC.js'
import { TimeSystem } from '../systems/TimeSystem.js'
import { ActivitySystem } from '../systems/ActivitySystem.js'
import { DialogueSystem } from '../systems/DialogueSystem.js'
import { CHARACTER_LIST } from '../data/characters.js'

const MAP_W = 1600
const MAP_H = 1200
const FOREST_H = 212
const LAKE_Y = 870

const ZONES = {
  forest:       { x: 60,   y: 30,   width: 280,  height: 168 },
  rape_shack:   { x: 820,  y: 35,   width: 130,  height: 110 },
  parking:      { x: 20,   y: 215,  width: 230,  height: 160 },
  cottage:      { x: 130,  y: 380,  width: 220,  height: 180 },
  huussi:       { x: 20,   y: 600,  width: 110,  height: 110 },
  molkky_field: { x: 480,  y: 450,  width: 200,  height: 140 },
  sauna:        { x: 1080, y: 250,  width: 220,  height: 180 },
  terrace:      { x: 950,  y: 430,  width: 400,  height: 250 },
  fire_pit:     { x: 960,  y: 490,  width: 100,  height: 80  },
  palju:        { x: 1240, y: 480,  width: 110,  height: 90  },
  dock:         { x: 1060, y: 850,  width: 270,  height: 100 },
  dock_left:    { x: 130,  y: 820,  width: 200,  height: 80  },
  beach:        { x: 0,    y: 860,  width: 1050, height: 80  },
}

const NPC_SPAWN = {
  jon:      { x: 1005, y: 540 },
  alwar:    { x: 600,  y: 878 },
  elliot:   { x: 240,  y: 614 },  // south of cottage door
  schmaxel: { x: 1200, y: 893 },
  mark:     { x: 1120, y: 878 },
  edu:      { x: 1100, y: 545 },
  robert:   { x: 600,  y: 520 },
  nixu:     { x: 170,  y: 614 },  // south of cottage door
  nikkebre: { x: 1165, y: 454 },  // south of sauna door
  immobile: { x: 1180, y: 888 },
  allu:     { x: 380,  y: 882 },
}

// Door trigger zones (auto-enter when player walks through)
const DOOR_TRIGGERS = {
  cottage:    { x: 212, y: 556, w: 46, h: 22, roomId: 'cottage_living',  label: 'Cottage'  },
  sauna:      { x: 1162, y: 426, w: 52, h: 22, roomId: 'sauna_lobby',    label: 'Sauna'    },
  rape_shack: { x: 862, y: 141, w: 40, h: 22, roomId: 'rape_shack',      label: 'Shack'    },
  huussi:     { x: 50,  y: 706, w: 42, h: 22, roomId: 'huussi',          label: 'Huussi'   },
}
// How many extra pixels south the approach-prompt zone extends past each trigger
const DOOR_APPROACH_SOUTH = 90

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    // Water collision: restrict to LAKE_Y so player cannot walk on water
    this.physics.world.setBounds(0, 0, MAP_W, LAKE_Y)
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H)

    this._createParticleTexture()
    this._buildMap()
    this._addWaterSparkles()
    this._buildParticleEmitters()

    this.player = new Player(this, 720, 400)
    this.cameras.main.startFollow(this.player.getPhysicsBody(), true, 0.1, 0.1)

    this.timeSystem = new TimeSystem(this)
    this.dialogueSystem = new DialogueSystem(this)
    this.dialogueSystem.create()

    this.activitySystem = new ActivitySystem(this, this.timeSystem)
    Object.entries(ZONES).forEach(([id, rect]) => this.activitySystem.registerZone(id, rect))

    this._buildNPCs()
    this._buildColliders()
    this._buildHUD()
    this._buildAmbientOverlay()
    this._setupInput()

    this.timeSystem.onPeriodChange(() => this._onPeriodChange())

    this._inTransition = false
    this._nearDoorRoomId = null
    // Reposition player when returning from a room
    this.events.on('wake', () => {
      this._inTransition = false
      this.cameras.main.fadeIn(240, 0, 0, 0)
    })
  }

  // ── COLLIDERS & DOOR TRIGGERS ────────────────────────────────────────────

  _buildColliders() {
    const walls = []
    const addWall = (x, y, w, h) => {
      const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0, 0)
      this.physics.add.existing(r, true)
      walls.push(r)
    }
    const addBuilding = (bx, by, bw, bh, doorRelX, doorW) => {
      const T = 10
      addWall(bx,                    by,           bw,                      T)   // N
      addWall(bx,                    by,           T,                       bh)  // W
      addWall(bx + bw - T,           by,           T,                       bh)  // E
      addWall(bx,                    by + bh - T,  doorRelX,                T)   // S-left
      const rStart = bx + doorRelX + doorW
      addWall(rStart,                by + bh - T,  bx + bw - rStart,        T)   // S-right
    }

    addBuilding(ZONES.cottage.x,    ZONES.cottage.y,    ZONES.cottage.width,    ZONES.cottage.height,    88, 36)
    addBuilding(ZONES.sauna.x,      ZONES.sauna.y,      ZONES.sauna.width,      ZONES.sauna.height,      88, 42)
    addBuilding(ZONES.rape_shack.x, ZONES.rape_shack.y, ZONES.rape_shack.width, ZONES.rape_shack.height, 48, 28)
    addBuilding(ZONES.huussi.x,     ZONES.huussi.y,     ZONES.huussi.width,     ZONES.huussi.height,     36, 30)

    this.physics.add.collider(this.player.getPhysicsBody(), walls)
    this._walls = walls
  }

  _checkDoorTriggers() {
    if (this._inTransition || this.dialogueSystem.isOpen) {
      this._doorPrompt.setVisible(false)
      this._nearDoorRoomId = null
      return
    }
    const px = this.player.x
    const py = this.player.y
    for (const trigger of Object.values(DOOR_TRIGGERS)) {
      const inTrigger =
        px >= trigger.x && px <= trigger.x + trigger.w &&
        py >= trigger.y && py <= trigger.y + trigger.h
      if (inTrigger) {
        this._doorPrompt.setVisible(false)
        this._nearDoorRoomId = null
        this._enterRoom(trigger.roomId)
        return
      }
      const inApproach =
        px >= trigger.x - 20 && px <= trigger.x + trigger.w + 20 &&
        py >= trigger.y && py <= trigger.y + trigger.h + DOOR_APPROACH_SOUTH
      if (inApproach) {
        this._doorPrompt.setText(`↑  Enter ${trigger.label}  [or press E]`)
        this._doorPrompt.setVisible(true)
        this._nearDoorRoomId = trigger.roomId
        return
      }
    }
    this._doorPrompt.setVisible(false)
    this._nearDoorRoomId = null
  }

  _enterRoom(roomId) {
    this._inTransition = true
    this.cameras.main.fadeOut(200, 0, 0, 0)
    this.time.delayedCall(220, () => {
      this.scene.launch('RoomScene', { roomId })
      this.scene.sleep()
    })
  }

  // ── HELPERS ─────────────────────────────────────────────────────────────

  _drawBuilding(g, bx, by, bw, bh, roofColor, wallColor) {
    const rh = Math.round(bh * 0.32)
    // shadow
    g.fillStyle(0x000000, 0.22)
    g.fillRect(bx + 6, by + 6, bw, bh)
    // wall
    g.fillStyle(wallColor)
    g.fillRect(bx, by + rh, bw, bh - rh)
    // roof
    g.fillStyle(roofColor)
    g.fillRect(bx, by, bw, rh + 3)
    // roof-wall shadow strip
    g.fillStyle(0x000000, 0.28)
    g.fillRect(bx, by + rh, bw, 5)
    // right-side wall shading
    g.fillStyle(0x000000, 0.1)
    g.fillRect(bx + bw - 7, by + rh + 5, 7, bh - rh - 5)
    // outline
    g.lineStyle(2, 0x1a1a1a, 1)
    g.strokeRect(bx, by, bw, bh)
    g.lineBetween(bx, by + rh, bx + bw, by + rh)
    g.lineStyle(0, 0, 0)
  }

  _drawWindow(g, wx, wy, ww, wh) {
    // frame
    g.fillStyle(0x1a1a1a)
    g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4)
    // glass
    g.fillStyle(0x7ac8f0)
    g.fillRect(wx, wy, ww, wh)
    // cross dividers
    g.fillStyle(0x1a1a1a)
    g.fillRect(wx + Math.floor(ww / 2) - 1, wy, 2, wh)
    g.fillRect(wx, wy + Math.floor(wh / 2) - 1, ww, 2)
    // reflection
    g.fillStyle(0xffffff, 0.55)
    g.fillRect(wx + 2, wy + 2, 6, 4)
  }

  _drawDoor(g, dx, dy, dw, dh) {
    // frame
    g.fillStyle(0x1a1a1a)
    g.fillRect(dx - 2, dy - 2, dw + 4, dh + 2)
    // door
    g.fillStyle(0x5a2810)
    g.fillRect(dx, dy, dw, dh)
    // door panels
    g.fillStyle(0x3a1808)
    g.fillRect(dx + 3, dy + 3, dw - 6, Math.floor(dh * 0.42))
    g.fillRect(dx + 3, dy + Math.floor(dh * 0.48), dw - 6, Math.floor(dh * 0.42))
    // knob
    g.fillStyle(0xe0b030)
    g.fillCircle(dx + dw - 6, dy + Math.floor(dh / 2), 3)
  }

  _drawTree(g, tx, ty, scale = 1) {
    const r = Math.round(15 * scale)
    const th = Math.round(13 * scale)
    // ground shadow
    g.fillStyle(0x000000, 0.14)
    g.fillEllipse(tx + 4, ty + r * 0.5, r * 2.4, r * 0.85)
    // trunk
    g.fillStyle(0x1a1a1a)
    g.fillRect(tx - 4, ty - 2, 9, th + 2)
    g.fillStyle(0x7a5030)
    g.fillRect(tx - 3, ty - 1, 7, th)
    // canopy shadow/outline
    g.fillStyle(0x1a3a1a)
    g.fillCircle(tx, ty - Math.round(r * 0.4), r + 2)
    // main canopy
    g.fillStyle(0x2a8a2a)
    g.fillCircle(tx, ty - Math.round(r * 0.4), r)
    // upper layer
    g.fillStyle(0x3aaa3a)
    g.fillCircle(tx - Math.round(r * 0.2), ty - Math.round(r * 0.65), Math.round(r * 0.68))
    // highlight
    g.fillStyle(0x5acc5a)
    g.fillCircle(tx - Math.round(r * 0.32), ty - Math.round(r * 0.88), Math.round(r * 0.34))
  }

  _drawForestTree(g, tx, ty) {
    g.fillStyle(0x142814)
    g.fillCircle(tx, ty, 22)
    g.fillStyle(0x1e4a1e)
    g.fillCircle(tx - 4, ty - 5, 18)
    g.fillStyle(0x2a6a2a)
    g.fillCircle(tx - 6, ty - 9, 12)
  }

  _drawCar(g, cx, cy, color) {
    g.fillStyle(0x000000, 0.2)
    g.fillRoundedRect(cx + 3, cy + 3, 62, 26, 4)
    g.fillStyle(0x1a1a1a)
    g.fillRoundedRect(cx - 1, cy - 1, 64, 28, 5)
    g.fillStyle(color)
    g.fillRoundedRect(cx, cy, 62, 26, 4)
    g.fillStyle(0x88ccee)
    g.fillRoundedRect(cx + 8, cy + 4, 16, 11, 2)
    g.fillRoundedRect(cx + 28, cy + 4, 18, 11, 2)
    g.fillStyle(0xffee88, 0.8)
    g.fillRect(cx, cy + 9, 5, 7)
    g.fillRect(cx + 57, cy + 9, 5, 7)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(cx + 11, cy + 26, 6)
    g.fillCircle(cx + 51, cy + 26, 6)
    g.fillStyle(0x555555)
    g.fillCircle(cx + 11, cy + 26, 3)
    g.fillCircle(cx + 51, cy + 26, 3)
  }

  // ── MAP BUILD ────────────────────────────────────────────────────────────

  _buildMap() {
    const g = this.add.graphics()

    // ── GRASS TILE GRID ──────────────────────────────────────────────
    for (let tx = 0; tx < MAP_W; tx += 32) {
      for (let ty = 0; ty < MAP_H; ty += 32) {
        const alt = ((tx / 32 + ty / 32) & 1) === 1
        g.fillStyle(alt ? 0x6cbf46 : 0x78cc52)
        g.fillRect(tx, ty, 32, 32)
      }
    }

    // Grass detail dots on open lawn
    g.fillStyle(0x90d860, 0.55)
    ;[
      [320,380],[370,420],[410,370],[460,445],[530,380],[550,465],
      [590,400],[640,455],[680,390],[720,448],[760,505],[810,432],
      [840,510],[875,452],[910,402],[930,484],[365,308],[710,308],
      [770,345],[825,382],[868,308],[755,385],
    ].forEach(([fx, fy]) => {
      g.fillRect(fx, fy, 4, 4)
      g.fillRect(fx + 12, fy + 7, 3, 3)
    })
    // Yellow wildflowers
    g.fillStyle(0xffe066, 0.9)
    ;[
      [345,355],[535,332],[692,295],[770,365],[885,325],
      [448,508],[615,472],[718,545],[842,494],
      [385,605],[512,582],[635,625],
    ].forEach(([fx, fy]) => g.fillCircle(fx, fy, 2.5))

    // ── LAKE ─────────────────────────────────────────────────────────
    g.fillStyle(0x1e70c8)
    g.fillRect(0, LAKE_Y, MAP_W, MAP_H - LAKE_Y)
    // Deep water at far bottom
    g.fillStyle(0x1458a0)
    g.fillRect(0, MAP_H - 70, MAP_W, 70)
    // Mid-tone band
    g.fillStyle(0x2880d8)
    g.fillRect(0, LAKE_Y, MAP_W, 60)
    // Animated wave layers (scroll leftward, seamlessly looped)
    ;[
      { color: 0x50a8f8, alpha: 1.0,  yBase: LAKE_Y + 18, rw: 70, rh: 5, stride: 115, dur: 3800 },
      { color: 0x50a8f8, alpha: 0.7,  yBase: LAKE_Y + 36, rw: 52, rh: 4, stride: 115, dur: 5400 },
      { color: 0x3090e8, alpha: 0.45, yBase: LAKE_Y + 52, rw: 36, rh: 3, stride: 115, dur: 7200 },
    ].forEach(({ color, alpha, yBase, rw, rh, stride, dur }) => {
      const gw = this.add.graphics().setDepth(1)
      gw.fillStyle(color, alpha)
      for (let wx = -stride; wx < MAP_W + stride; wx += stride) {
        gw.fillRoundedRect(wx, yBase, rw, rh, 2)
        gw.fillRoundedRect(wx + rw + 30, yBase, Math.round(rw * 0.55), rh, 2)
      }
      this.tweens.add({ targets: gw, x: -stride, duration: dur, repeat: -1, ease: 'Linear' })
    })

    // ── BEACH STRIP ───────────────────────────────────────────────────
    g.fillStyle(0xe0cc5e)
    g.fillRect(0, LAKE_Y - 34, MAP_W, 38)
    // Sand texture
    g.fillStyle(0xc8b24a, 0.45)
    for (let sx = 8; sx < MAP_W; sx += 20) {
      for (let sy = LAKE_Y - 32; sy < LAKE_Y - 4; sy += 11) {
        if ((sx + sy) % 30 < 15) g.fillRect(sx, sy, 3, 2)
      }
    }
    // Animated beach foam at waterline
    ;[
      { x: 90,   w: 44, h: 6, dur: 2200, delay: 0    },
      { x: 260,  w: 30, h: 5, dur: 1900, delay: 360  },
      { x: 460,  w: 50, h: 6, dur: 2600, delay: 720  },
      { x: 680,  w: 36, h: 5, dur: 1800, delay: 180  },
      { x: 880,  w: 48, h: 6, dur: 2400, delay: 540  },
      { x: 1100, w: 32, h: 5, dur: 2000, delay: 900  },
      { x: 1280, w: 42, h: 6, dur: 2300, delay: 270  },
      { x: 1480, w: 26, h: 4, dur: 1700, delay: 630  },
    ].forEach(({ x, w, h, dur, delay }) => {
      const foam = this.add.graphics().setDepth(1)
      foam.fillStyle(0xf0f8ff, 1)
      foam.fillEllipse(0, 0, w, h)
      foam.x = x; foam.y = LAKE_Y - 4
      this.tweens.add({ targets: foam, alpha: { from: 0.1, to: 0.42 }, yoyo: true, repeat: -1, duration: dur, delay, ease: 'Sine.easeInOut' })
    })

    // Shoreline pebble strip at the water's edge — visible water boundary
    g.fillStyle(0x7a6a50, 0.85)
    for (let sx = 0; sx < MAP_W; sx += 8) {
      const sz = 1.5 + ((sx * 7 + 13) % 3)
      g.fillCircle(sx + ((sx * 11) % 5) - 2, LAKE_Y - 3, sz)
    }
    g.fillStyle(0x5a5040, 0.6)
    for (let sx = 3; sx < MAP_W; sx += 13) {
      g.fillCircle(sx + ((sx * 3) % 7) - 3, LAKE_Y - 7, 2)
    }

    // ── FOREST DARK GROUND ────────────────────────────────────────────
    g.fillStyle(0x142014)
    g.fillRect(0, 0, MAP_W, FOREST_H)

    // ── ROAD (parking → top-left exit) ────────────────────────────────
    g.fillStyle(0x888878)
    g.fillPoints([
      { x: 20,  y: 222 },
      { x: 116, y: 222 },
      { x: 68,  y: 0   },
      { x: 0,   y: 0   },
    ], true)
    // Road center dashes
    g.fillStyle(0xddddbb, 0.6)
    g.fillRect(42, 175, 14, 26)
    g.fillRect(32, 122, 14, 22)
    g.fillRect(22, 72,  14, 18)
    // Road edge
    g.lineStyle(1, 0xffffff, 0.25)
    g.lineBetween(20, 222, 68, 0)
    g.lineBetween(116, 222, 68, 0)
    g.lineStyle(0, 0, 0)

    // ── PARKING ───────────────────────────────────────────────────────
    const pk = ZONES.parking
    g.fillStyle(0x000000, 0.18)
    g.fillRect(pk.x + 5, pk.y + 5, pk.width, pk.height)
    g.fillStyle(0x686860)
    g.fillRect(pk.x, pk.y, pk.width, pk.height)
    // Space dividers
    g.lineStyle(2, 0xffffff, 0.28)
    for (let lx = pk.x + 62; lx < pk.x + pk.width - 10; lx += 66) {
      g.lineBetween(lx, pk.y + 8, lx, pk.y + pk.height - 8)
    }
    g.lineStyle(0, 0, 0)
    // Cars
    this._drawCar(g, pk.x + 10, pk.y + 18, 0x2244aa)
    this._drawCar(g, pk.x + 84, pk.y + 18, 0xaa2222)
    this._drawCar(g, pk.x + 148, pk.y + 106, 0x227744)

    // ── PATHS ─────────────────────────────────────────────────────────
    // Cottage → left dock
    g.fillStyle(0xd0a860)
    g.fillRect(ZONES.cottage.x + 82, ZONES.cottage.y + ZONES.cottage.height, 48, 262)
    g.fillStyle(0xb89048, 0.35)
    g.fillRect(ZONES.cottage.x + 82, ZONES.cottage.y + ZONES.cottage.height, 4, 262)
    g.fillRect(ZONES.cottage.x + 126, ZONES.cottage.y + ZONES.cottage.height, 4, 262)
    // Terrace → right dock
    const pathCX = ZONES.terrace.x + Math.floor(ZONES.terrace.width / 2)
    const pathLen = ZONES.dock.y - (ZONES.terrace.y + ZONES.terrace.height)
    g.fillStyle(0xd0a860)
    g.fillRect(pathCX - 24, ZONES.terrace.y + ZONES.terrace.height, 48, pathLen)

    // ── TERRACE (large wood deck) ──────────────────────────────────────
    const tr = ZONES.terrace
    g.fillStyle(0x000000, 0.18)
    g.fillRect(tr.x + 6, tr.y + 6, tr.width, tr.height)
    g.fillStyle(0xc49050)
    g.fillRect(tr.x, tr.y, tr.width, tr.height)
    // Plank lines
    g.lineStyle(1, 0xa07030, 0.45)
    for (let pl = tr.y + 14; pl < tr.y + tr.height; pl += 18) {
      g.lineBetween(tr.x + 6, pl, tr.x + tr.width - 6, pl)
    }
    g.lineStyle(0, 0, 0)
    // Railing
    g.lineStyle(3, 0x6a4010, 0.9)
    g.strokeRect(tr.x, tr.y, tr.width, tr.height)
    g.lineStyle(0, 0, 0)
    g.fillStyle(0x6a4010)
    for (let px = tr.x + 16; px < tr.x + tr.width; px += 36) {
      g.fillRect(px - 3, tr.y, 6, 14)
      g.fillRect(px - 3, tr.y + tr.height - 14, 6, 14)
    }

    // ── GRILL ─────────────────────────────────────────────────────────
    const grillX = ZONES.fire_pit.x + 50
    const grillY = ZONES.fire_pit.y + 40
    g.fillStyle(0x000000, 0.2)
    g.fillCircle(grillX + 3, grillY + 3, 26)
    g.fillStyle(0x282828)
    g.fillCircle(grillX, grillY, 26)
    g.fillStyle(0x383838)
    g.fillCircle(grillX, grillY, 22)
    // Grill grate
    g.lineStyle(2, 0x1a1a1a, 0.8)
    g.lineBetween(grillX - 16, grillY, grillX + 16, grillY)
    g.lineBetween(grillX, grillY - 16, grillX, grillY + 16)
    g.lineBetween(grillX - 11, grillY - 11, grillX + 11, grillY + 11)
    g.lineBetween(grillX + 11, grillY - 11, grillX - 11, grillY + 11)
    g.lineStyle(0, 0, 0)
    // Legs
    g.fillStyle(0x1a1a1a)
    g.fillRect(grillX - 18, grillY + 22, 5, 22)
    g.fillRect(grillX + 13, grillY + 22, 5, 22)

    // ── PALJU (hot tub) ───────────────────────────────────────────────
    const paljuX = ZONES.palju.x + 55
    const paljuY = ZONES.palju.y + 45
    g.fillStyle(0x000000, 0.2)
    g.fillCircle(paljuX + 4, paljuY + 4, 42)
    g.fillStyle(0x6a3a18)
    g.fillCircle(paljuX, paljuY, 42)
    // Water
    g.fillStyle(0x30a8c0)
    g.fillCircle(paljuX, paljuY, 34)
    // Water shimmer
    g.fillStyle(0x58d0e8, 0.65)
    g.fillCircle(paljuX - 8,  paljuY - 14, 8)
    g.fillCircle(paljuX + 14, paljuY - 10, 6)
    // Barrel bands
    g.lineStyle(2, 0x3a1808, 0.85)
    g.strokeCircle(paljuX, paljuY, 42)
    g.strokeCircle(paljuX, paljuY, 38)
    g.lineStyle(0, 0, 0)

    // ── BUILDINGS ─────────────────────────────────────────────────────

    // Rape Shack (freaky red exterior)
    this._drawBuilding(g,
      ZONES.rape_shack.x, ZONES.rape_shack.y,
      ZONES.rape_shack.width, ZONES.rape_shack.height,
      0x8a0808, 0xcc1010)
    this._drawWindow(g, ZONES.rape_shack.x + 12, ZONES.rape_shack.y + 28, 26, 20)
    this._drawDoor(g,   ZONES.rape_shack.x + 48, ZONES.rape_shack.y + 60, 28, 50)
    // Creepy details
    const rx = ZONES.rape_shack.x, ry = ZONES.rape_shack.y
    g.lineStyle(1.5, 0x440000, 0.8)
    g.lineBetween(rx + 18, ry + 48, rx + 28, ry + 66)
    g.lineBetween(rx + 22, ry + 44, rx + 32, ry + 62)
    g.lineBetween(rx + 90, ry + 38, rx + 102, ry + 58)
    g.lineBetween(rx + 86, ry + 42, rx + 98, ry + 62)
    g.lineStyle(0, 0, 0)
    // Blood drips below window
    g.fillStyle(0x880000, 0.6)
    g.fillRect(rx + 15, ry + 48, 3, 14)
    g.fillRect(rx + 21, ry + 48, 2, 10)
    g.fillRect(rx + 28, ry + 48, 3, 18)
    // Warning sign above door
    g.fillStyle(0xf1c40f)
    g.fillRect(rx + 44, ry + 42, 36, 14)
    g.fillStyle(0x1a1a1a)
    g.fillRect(rx + 46, ry + 44, 32, 10)
    this.add.text(rx + 62, ry + 49, '⚠ STAY OUT', {
      fontSize: '6px', color: '#f1c40f', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4)
    // Barbed wire band along roof edge
    g.lineStyle(1, 0x555555, 0.9)
    for (let bx = rx; bx < rx + ZONES.rape_shack.width - 6; bx += 8) {
      g.lineBetween(bx, ry + 4, bx + 4, ry + 10)
      g.lineBetween(bx + 4, ry + 4, bx, ry + 10)
    }
    g.lineStyle(0, 0, 0)

    // Main Cottage
    this._drawBuilding(g,
      ZONES.cottage.x, ZONES.cottage.y,
      ZONES.cottage.width, ZONES.cottage.height,
      0xb82018, 0xf0e898)
    this._drawWindow(g, ZONES.cottage.x + 18,  ZONES.cottage.y + 30, 42, 32)
    this._drawWindow(g, ZONES.cottage.x + 158, ZONES.cottage.y + 30, 42, 32)
    this._drawDoor(g,   ZONES.cottage.x + 88,  ZONES.cottage.y + 112, 36, 68)

    // Huussi (outhouse)
    this._drawBuilding(g,
      ZONES.huussi.x, ZONES.huussi.y,
      ZONES.huussi.width, ZONES.huussi.height,
      0x3a2008, 0x6a4020)
    this._drawDoor(g, ZONES.huussi.x + 36, ZONES.huussi.y + 55, 30, 55)
    // Crescent moon symbol
    g.fillStyle(0xf1c40f)
    g.fillCircle(ZONES.huussi.x + 56, ZONES.huussi.y + 22, 9)
    g.fillStyle(0x3a2008)
    g.fillCircle(ZONES.huussi.x + 61, ZONES.huussi.y + 19, 7)

    // Sauna
    this._drawBuilding(g,
      ZONES.sauna.x, ZONES.sauna.y,
      ZONES.sauna.width, ZONES.sauna.height,
      0x4a2a10, 0x8a5030)
    this._drawWindow(g, ZONES.sauna.x + 16, ZONES.sauna.y + 28, 42, 32)
    this._drawWindow(g, ZONES.sauna.x + ZONES.sauna.width - 62, ZONES.sauna.y + 28, 42, 32)
    this._drawDoor(g,   ZONES.sauna.x + 88, ZONES.sauna.y + ZONES.sauna.height - 52, 42, 52)
    // Chimney
    g.fillStyle(0x1a1a1a)
    g.fillRect(ZONES.sauna.x + ZONES.sauna.width - 46, ZONES.sauna.y - 8, 20, 26)
    g.fillStyle(0x555555)
    g.fillRect(ZONES.sauna.x + ZONES.sauna.width - 44, ZONES.sauna.y - 6, 16, 22)

    // ── DOCKS (depth 2 — above wave layers at depth 1) ────────────────
    const gDock = this.add.graphics().setDepth(2)
    // Right dock
    gDock.fillStyle(0x1a1a1a)
    gDock.fillRect(ZONES.dock.x - 2, ZONES.dock.y - 2, ZONES.dock.width + 4, ZONES.dock.height + 4)
    gDock.fillStyle(0x7a5030)
    gDock.fillRect(ZONES.dock.x, ZONES.dock.y, ZONES.dock.width, ZONES.dock.height)
    gDock.lineStyle(1, 0x5a3818, 0.55)
    for (let dl = ZONES.dock.y + 16; dl < ZONES.dock.y + ZONES.dock.height; dl += 16) {
      gDock.lineBetween(ZONES.dock.x + 4, dl, ZONES.dock.x + ZONES.dock.width - 4, dl)
    }
    gDock.lineStyle(0, 0, 0)
    gDock.fillStyle(0x4a2810)
    gDock.fillRect(ZONES.dock.x, ZONES.dock.y + ZONES.dock.height - 6, ZONES.dock.width, 6)
    // Metal ladder into water
    gDock.fillStyle(0x888888)
    gDock.fillRect(ZONES.dock.x + 20, ZONES.dock.y + ZONES.dock.height - 2, 4, 18)
    gDock.fillRect(ZONES.dock.x + 28, ZONES.dock.y + ZONES.dock.height - 2, 4, 18)
    gDock.fillRect(ZONES.dock.x + 18, ZONES.dock.y + ZONES.dock.height + 8, 18, 3)

    // Left dock
    gDock.fillStyle(0x1a1a1a)
    gDock.fillRect(ZONES.dock_left.x - 2, ZONES.dock_left.y - 2, ZONES.dock_left.width + 4, ZONES.dock_left.height + 4)
    gDock.fillStyle(0x7a5030)
    gDock.fillRect(ZONES.dock_left.x, ZONES.dock_left.y, ZONES.dock_left.width, ZONES.dock_left.height)
    gDock.lineStyle(1, 0x5a3818, 0.55)
    for (let dl = ZONES.dock_left.y + 16; dl < ZONES.dock_left.y + ZONES.dock_left.height; dl += 16) {
      gDock.lineBetween(ZONES.dock_left.x + 4, dl, ZONES.dock_left.x + ZONES.dock_left.width - 4, dl)
    }
    gDock.lineStyle(0, 0, 0)
    // Rowboat
    gDock.fillStyle(0x1a1a1a)
    gDock.fillEllipse(ZONES.dock_left.x + 100, ZONES.dock_left.y + 46, 90, 34)
    gDock.fillStyle(0x8b4a18)
    gDock.fillEllipse(ZONES.dock_left.x + 100, ZONES.dock_left.y + 46, 84, 28)
    gDock.fillStyle(0xc08040)
    gDock.fillEllipse(ZONES.dock_left.x + 100, ZONES.dock_left.y + 46, 72, 18)
    // Oars
    gDock.lineStyle(2, 0xa06030, 1)
    gDock.lineBetween(ZONES.dock_left.x + 80, ZONES.dock_left.y + 38, ZONES.dock_left.x + 58, ZONES.dock_left.y + 60)
    gDock.lineBetween(ZONES.dock_left.x + 120, ZONES.dock_left.y + 38, ZONES.dock_left.x + 142, ZONES.dock_left.y + 60)
    gDock.lineStyle(0, 0, 0)

    // ── MÖLKKY FIELD ──────────────────────────────────────────────────
    g.fillStyle(0x000000, 0.12)
    g.fillRect(ZONES.molkky_field.x + 4, ZONES.molkky_field.y + 4,
      ZONES.molkky_field.width, ZONES.molkky_field.height)
    g.fillStyle(0xd4b86a)
    g.fillRect(ZONES.molkky_field.x, ZONES.molkky_field.y,
      ZONES.molkky_field.width, ZONES.molkky_field.height)
    g.lineStyle(2, 0xb09850, 1)
    g.strokeRect(ZONES.molkky_field.x, ZONES.molkky_field.y,
      ZONES.molkky_field.width, ZONES.molkky_field.height)
    g.lineStyle(0, 0, 0)
    // Pins
    const mBase = { x: ZONES.molkky_field.x + 55, y: ZONES.molkky_field.y + 55 }
    const pinLayout = [
      [0,0],[22,-20],[44,0],[66,-20],[88,0],[110,-20],
      [11,20],[33,0],[55,20],[77,0],
      [22,40],[44,20],[66,40],
    ]
    pinLayout.forEach(([px, py]) => {
      g.fillStyle(0x7a4820)
      g.fillCircle(mBase.x + px, mBase.y + py, 5)
      g.fillStyle(0xb86a30)
      g.fillCircle(mBase.x + px - 1, mBase.y + py - 1, 3)
    })

    // ── DARTBOARD ─────────────────────────────────────────────────────
    const dartX = ZONES.huussi.x + ZONES.huussi.width + 30
    const dartY = ZONES.huussi.y + 46
    g.fillStyle(0x4a2a08)
    g.fillRect(dartX - 3, dartY + 18, 6, 32)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(dartX, dartY, 21)
    g.fillStyle(0xd82a18)
    g.fillCircle(dartX, dartY, 17)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(dartX, dartY, 13)
    g.fillStyle(0xd82a18)
    g.fillCircle(dartX, dartY, 9)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(dartX, dartY, 5)
    g.fillStyle(0xf0d020)
    g.fillCircle(dartX, dartY, 3)
    g.lineStyle(1, 0x333333, 0.5)
    g.lineBetween(dartX - 17, dartY, dartX + 17, dartY)
    g.lineBetween(dartX, dartY - 17, dartX, dartY + 17)
    g.lineStyle(0, 0, 0)

    // ── FOREST TREE CANOPIES ──────────────────────────────────────────
    for (let tx = 10; tx < MAP_W; tx += 44) {
      for (let ty = 14; ty < FOREST_H - 6; ty += 44) {
        const jx = ((tx * 17 + ty * 7) % 22) - 11
        const jy = ((tx * 11 + ty * 13) % 22) - 11
        this._drawForestTree(g, tx + jx, ty + jy)
      }
    }
    // Forest fringe
    for (let fx = 4; fx < MAP_W; fx += 38) {
      const fy = FOREST_H - 6 + ((fx * 7) % 20) - 10
      this._drawForestTree(g, fx, fy)
    }

    // ── SCATTERED TREES ───────────────────────────────────────────────
    ;[
      [1382, 188, 1.0], [1448, 92,  1.1], [1502, 158, 0.9],
      [1548, 68,  1.0], [1562, 232, 1.2],
      [1392, 362, 1.0], [1428, 462, 0.9], [1462, 562, 1.1],
      [1492, 662, 1.0], [1512, 762, 0.9],
      [56,   762, 1.0], [88,   740, 0.9], [110,  782, 1.1],
      [422,  412, 1.0], [442,  514, 0.9], [427,  614, 1.1],
      [96,   538, 1.0], [114,  580, 0.9],
      [682,  260, 1.0], [762,  224, 1.1], [842,  264, 0.9],
      [352,  344, 1.0], [384,  398, 0.9],
    ].forEach(([tx, ty, scale]) => this._drawTree(g, tx, ty, scale))

    // ── LABELS ────────────────────────────────────────────────────────
    const lStyle = {
      fontSize: '15px', color: '#f8f4e8',
      fontStyle: 'bold',
      stroke: '#1a0a00', strokeThickness: 5,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
      backgroundColor: '#00000055',
      padding: { x: 7, y: 3 },
    }
    const sStyle = {
      fontSize: '13px', color: '#eeeedd',
      fontStyle: 'bold',
      stroke: '#1a1a00', strokeThickness: 4,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true },
      backgroundColor: '#00000044',
      padding: { x: 5, y: 2 },
    }
    ;[
      [ZONES.cottage.x + 110,  ZONES.cottage.y - 18,          'COTTAGE 🏠',     lStyle],
      [ZONES.sauna.x + 110,    ZONES.sauna.y - 18,            'SAUNA 🧖',       lStyle],
      [ZONES.rape_shack.x + 65, ZONES.rape_shack.y - 58,     'RAPE SHACK 🛏️',  lStyle],
      [ZONES.huussi.x + 55,   ZONES.huussi.y - 16,           'HUUSSI 🚽',      sStyle],
      [dartX,                  ZONES.huussi.y + 78,           'DARTS 🎯',       sStyle],
      [ZONES.molkky_field.x + 100, ZONES.molkky_field.y - 16,'MÖLKKY 🪵',      sStyle],
      [grillX,                 ZONES.fire_pit.y - 16,         'GRILL 🔥',       sStyle],
      [paljuX,                 ZONES.palju.y - 16,            'PALJU 🛁',       sStyle],
      [ZONES.dock.x + 135,     ZONES.dock.y - 16,             'DOCK 🏊 🏄',    lStyle],
      [ZONES.dock_left.x + 100, ZONES.dock_left.y - 16,      'DOCK 🚣',        lStyle],
      [pk.x + 115,             pk.y - 16,                     'PARKING 🚗',     sStyle],
    ].forEach(([x, y, text, style]) => {
      this.add.text(x, y, text, style).setOrigin(0.5).setDepth(5)
    })
  }

  _addWaterSparkles() {
    for (let i = 0; i < 18; i++) {
      const sx = 30 + Math.random() * (MAP_W - 60)
      const sy = LAKE_Y + 18 + Math.random() * (MAP_H - LAKE_Y - 50)
      const sp = this.add.graphics().setDepth(2)
      const sz = 1.5 + Math.random() * 2.5
      sp.fillStyle(0xffffff)
      sp.fillCircle(0, 0, sz)
      sp.x = sx
      sp.y = sy
      this.tweens.add({
        targets: sp,
        alpha: { from: 0, to: 0.65 },
        yoyo: true,
        repeat: -1,
        duration: 700 + Math.random() * 1400,
        delay: Math.random() * 3000,
        ease: 'Sine.easeInOut',
      })
    }
  }

  // ── NPCS / HUD / INPUT ───────────────────────────────────────────────────

  _buildNPCs() {
    this.npcs = CHARACTER_LIST.map(char => {
      const pos = NPC_SPAWN[char.id] ?? { x: 700, y: 400 }
      return new NPC(this, pos.x, pos.y, char)
    })
  }

  _buildHUD() {
    const { width } = this.scale

    this._hudBg = this.add
      .rectangle(width / 2, 22, 360, 42, 0x08081a, 0.92)
      .setScrollFactor(0).setDepth(15)
      .setStrokeStyle(1.5, 0x4a90d0, 0.85)

    this._timeText = this.add
      .text(width / 2, 22, '', {
        fontSize: '16px', color: '#f1c40f', fontStyle: 'bold',
        stroke: '#8b6914', strokeThickness: 2,
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(16)

    this._promptText = this.add
      .text(width / 2, 78, '', {
        fontSize: '14px', color: '#f0f8ff',
        backgroundColor: '#00000099',
        padding: { x: 14, y: 8 },
        stroke: '#000000', strokeThickness: 2,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(16).setVisible(false)

    this._doorPrompt = this.add
      .text(width / 2, 110, '', {
        fontSize: '14px', color: '#a8d8f8',
        backgroundColor: '#00000099',
        padding: { x: 14, y: 8 },
        stroke: '#000000', strokeThickness: 2,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(16).setVisible(false)

    this.activitySystem.setPromptText(this._promptText)

    this._statusText = this.add
      .text(16, 52, '', {
        fontSize: '13px', color: '#e74c3c',
        backgroundColor: '#00000088',
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0).setDepth(16).setVisible(false)
  }

  _buildAmbientOverlay() {
    this._lightRT = this.add.renderTexture(0, 0, 900, 600)
      .setScrollFactor(0).setDepth(20).setOrigin(0, 0)
    this._lightBrush = this.make.graphics({ x: 0, y: 0, add: false })
    this._overlayColor  = 0x000020
    this._overlayAlpha  = 0
    this._alphaStart    = 0
    this._alphaTarget   = 0
    this._alphaTransitionAt = 0
    this._alphaDuration = 2000
    this._currentPeriod = this.timeSystem.currentPeriod
    this._buildStaticLights()
  }

  _buildStaticLights() {
    this._staticLights = [
      { wx: ZONES.cottage.x + 39,                      wy: ZONES.cottage.y + 46,          radius: 65, color: 0xf0a020 },
      { wx: ZONES.cottage.x + 179,                     wy: ZONES.cottage.y + 46,          radius: 65, color: 0xf0a020 },
      { wx: ZONES.sauna.x + 37,                        wy: ZONES.sauna.y + 44,            radius: 55, color: 0xf09020 },
      { wx: ZONES.sauna.x + ZONES.sauna.width - 41,    wy: ZONES.sauna.y + 44,            radius: 55, color: 0xf09020 },
      { wx: ZONES.rape_shack.x + 25,                   wy: ZONES.rape_shack.y + 38,       radius: 45, color: 0xf08020 },
      { wx: ZONES.fire_pit.x + 50,                     wy: ZONES.fire_pit.y + 40,         radius: 80, color: 0xe05010 },
      { wx: ZONES.palju.x + 55,                        wy: ZONES.palju.y + 45,            radius: 65, color: 0x40b0d0 },
    ]
  }

  _setupInput() {
    this._eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this._eKey.on('down', () => this._onInteract())
  }

  _onInteract() {
    if (this.dialogueSystem.isOpen) {
      this.dialogueSystem.tryInteract()
      return
    }
    for (const npc of this.npcs) {
      if (npc.isNearPlayer(this.player.x, this.player.y)) {
        this.dialogueSystem.open(npc.data, this.timeSystem.currentPeriod)
        return
      }
    }
    if (this._nearDoorRoomId && !this._inTransition) {
      this._enterRoom(this._nearDoorRoomId)
      return
    }
    this.activitySystem.tryActivate()
  }

  _onPeriodChange() {
    this._currentPeriod = this.timeSystem.currentPeriod
    const configs = {
      day:        { color: 0x000020, alpha: 0    },
      evening:    { color: 0xe07018, alpha: 0.17 },
      night:      { color: 0x0a0520, alpha: 0.75 },
      late_night: { color: 0x050312, alpha: 0.87 },
    }
    const cfg = configs[this._currentPeriod] ?? configs.day
    this._overlayColor      = cfg.color
    this._alphaStart        = this._overlayAlpha
    this._alphaTarget       = cfg.alpha
    this._alphaTransitionAt = this.time.now
    this._alphaDuration     = 2000
  }

  _updateLighting() {
    // Smoothly interpolate overlay alpha toward target using sine ease
    const elapsed = this.time.now - this._alphaTransitionAt
    const t = Math.min(1, elapsed / this._alphaDuration)
    const eased = 0.5 - Math.cos(t * Math.PI) / 2
    this._overlayAlpha = this._alphaStart + (this._alphaTarget - this._alphaStart) * eased

    if (this._overlayAlpha <= 0.01) { this._lightRT.setVisible(false); return }
    this._lightRT.setVisible(true)
    this._lightRT.clear()
    const { scrollX, scrollY } = this.cameras.main
    this._lightRT.fill(this._overlayColor, this._overlayAlpha)

    // Only show torch and static light halos when dark enough to matter
    if (this._overlayAlpha > 0.25) {
      const torchR = this._currentPeriod === 'late_night' ? 110 : 160
      this._eraseLight(this.player.x - scrollX, this.player.y - scrollY, torchR)
      for (const sl of this._staticLights) {
        const sx = sl.wx - scrollX, sy = sl.wy - scrollY
        if (sx < -sl.radius * 2 || sx > 900 + sl.radius * 2) continue
        if (sy < -sl.radius * 2 || sy > 600 + sl.radius * 2) continue
        this._eraseLight(sx, sy, sl.radius)
      }
    }
  }

  _eraseLight(vx, vy, radius) {
    const g = this._lightBrush
    g.clear()
    for (let i = 0; i < 8; i++) {
      const t = i / 7
      g.fillStyle(0xffffff, t * t)
      g.fillCircle(vx, vy, radius * (1 - t * 0.75))
    }
    this._lightRT.erase(g, 0, 0)
  }

  _createParticleTexture() {
    const g = this.make.graphics({ add: false })
    g.fillStyle(0xffffff, 1)
    g.fillCircle(4, 4, 4)
    g.generateTexture('spark', 8, 8)
    g.destroy()
  }

  _buildParticleEmitters() {
    const grillX  = ZONES.fire_pit.x + 50, grillY  = ZONES.fire_pit.y + 40
    const paljuX  = ZONES.palju.x + 55,    paljuY  = ZONES.palju.y + 45
    const chimneyX = ZONES.sauna.x + ZONES.sauna.width - 36
    const chimneyY = ZONES.sauna.y - 10

    this.add.particles(grillX, grillY, 'spark', {
      speed: { min: 20, max: 50 }, angle: { min: 255, max: 285 },
      lifespan: { min: 500, max: 800 },
      scale: { start: 1.2, end: 0.1 }, alpha: { start: 0.9, end: 0 },
      tint: [ 0xff2200, 0xff6600, 0xffaa00, 0xffee44 ],
      blendMode: Phaser.BlendModes.ADD, frequency: 40, quantity: 2, depth: 4,
    })

    this.add.particles(grillX, grillY, 'spark', {
      speed: { min: 60, max: 120 }, angle: { min: 245, max: 295 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 0.6, end: 0 }, alpha: { start: 1.0, end: 0 },
      tint: [ 0xffffff, 0xffee88 ],
      blendMode: Phaser.BlendModes.ADD, frequency: 220, quantity: 1, depth: 5,
    })

    this.add.particles(chimneyX, chimneyY, 'spark', {
      speed: { min: 6, max: 18 }, angle: { min: 250, max: 290 },
      lifespan: { min: 1600, max: 2400 },
      scale: { start: 1.5, end: 4.0 }, alpha: { start: 0.45, end: 0 },
      tint: [ 0x999999, 0xaaaaaa, 0xbbbbbb ],
      blendMode: Phaser.BlendModes.NORMAL, frequency: 180, quantity: 1, depth: 8,
    })

    this.add.particles(paljuX, paljuY - 15, 'spark', {
      speed: { min: 8, max: 22 }, angle: { min: 240, max: 300 },
      lifespan: { min: 1200, max: 1800 },
      scale: { start: 1.2, end: 3.5 }, alpha: { start: 0.4, end: 0 },
      tint: [ 0xd0eeff, 0xe8f8ff, 0xffffff ],
      blendMode: Phaser.BlendModes.SCREEN, frequency: 160, quantity: 1, depth: 4,
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 50, 18) },
    })
  }

  update(time, delta) {
    if (!this.dialogueSystem.isOpen) {
      this.player.update()
      this._checkDoorTriggers()
    }

    this.timeSystem.update(delta)
    this.activitySystem.update(this.player.x, this.player.y)
    this.dialogueSystem.update(delta)

    this.npcs.forEach(npc =>
      npc.update(time, this.player.x, this.player.y, this.dialogueSystem)
    )

    // Y-depth sort: entities further south render in front of those further north
    this.player._gfx.setDepth(4 + this.player.y * 0.003)
    if (this.player._shadow) this.player._shadow.setDepth(3 + this.player.y * 0.003)
    this.npcs.forEach(npc => {
      npc._gfx.setDepth(4 + npc.y * 0.003)
      if (npc._shadow) npc._shadow.setDepth(3 + npc.y * 0.003)
      npc._nameTag.setDepth(5 + npc.y * 0.003)
      npc._exclamation.setDepth(6 + npc.y * 0.003)
    })

    this._updateLighting()

    this._timeText.setText(
      `🕐 ${this.timeSystem.getDisplayTime()}  •  ${this.timeSystem.getPeriodLabel()}`
    )

    const drunk = this.player.drunkLevel
    const high  = this.player.highLevel
    if (drunk > 0 || high > 0) {
      const parts = []
      if (drunk > 0) parts.push(`🍺 ${'█'.repeat(drunk)}`)
      if (high  > 0) parts.push(`🌿 ${'█'.repeat(high)}`)
      this._statusText.setText(parts.join('  ')).setVisible(true)
    } else {
      this._statusText.setVisible(false)
    }

    if (drunk > 5) {
      this.cameras.main.setAngle(Math.sin(time / 180) * (drunk - 4))
    } else {
      this.cameras.main.setAngle(0)
    }
  }
}
