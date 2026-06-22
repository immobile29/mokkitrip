import Phaser from 'phaser'

const CANVAS_W = 900, CANVAS_H = 600
const WORLD_W  = 1800, WORLD_H = 1100

// ── Road geometry ─────────────────────────────────────────────────────────────
const ROAD_NS_X1 = 870, ROAD_NS_X2 = 960   // north-south road
const ROAD_EW_Y1 = 130, ROAD_EW_Y2 = 220   // east-west road (across top)
const ROAD_EW_X1 = 80,  ROAD_EW_X2 = 1720

// ── Destinations ──────────────────────────────────────────────────────────────
const STORE_CX = 200, STORE_CY = 175
const START_X  = 915, START_Y  = 1000
const STORE_RADIUS  = 70
const RETURN_RADIUS = 70

// ── Car physics ───────────────────────────────────────────────────────────────
const MAX_SPEED = 5.2
const DECAY     = 0.984
const TURN_RATE = 0.055
const ACCEL     = 0.22
const BRAKE     = 0.18
const CAR_W     = 22, CAR_H = 38   // half-dims: W = across, H = along movement

// ── Colours ───────────────────────────────────────────────────────────────────
const COL_GRASS   = 0x2d5a1e
const COL_ROAD    = 0x444444
const COL_MARKING = 0xffffaa
const COL_KERB    = 0xcccccc

// ── Stars (collectibles) ──────────────────────────────────────────────────────
const STAR_DEFS = [
  // North on N/S road
  { x: 915, y: 870 }, { x: 915, y: 700 }, { x: 915, y: 520 }, { x: 915, y: 350 },
  // West on E/W road to store
  { x: 750, y: 175 }, { x: 555, y: 175 }, { x: 355, y: 175 },
  // East on E/W road (return)
  { x: 1080, y: 175 }, { x: 1330, y: 175 }, { x: 1590, y: 175 },
]

// ── Obstacles ─────────────────────────────────────────────────────────────────
const MAILBOXES = [
  { x: 858, y: 450, r: 12 }, { x: 972, y: 560, r: 12 },
  { x: 858, y: 680, r: 12 }, { x: 972, y: 800, r: 12 }, { x: 858, y: 920, r: 12 },
  { x: 300, y: 118, r: 12 }, { x: 500, y: 232, r: 12 },
  { x: 680, y: 118, r: 12 }, { x: 1050, y: 232, r: 12 },
  { x: 1290, y: 118, r: 12 }, { x: 1530, y: 232, r: 12 },
]

const CONES = [
  { x: 915, y: 830, r: 10 }, { x: 915, y: 640, r: 10 },
  { x: 915, y: 448, r: 10 }, { x: 915, y: 258, r: 10 },
  { x: 480, y: 175, r: 10 }, { x: 855, y: 175, r: 10 },
  { x: 1185, y: 175, r: 10 }, { x: 1490, y: 175, r: 10 },
]

// Pedestrians support both dx (cross N/S road) and dy (cross E/W road)
const PEDESTRIANS = [
  { x: 858, y: 580, dx: 1,  minX: 858, maxX: 972, speed: 0.55, r: 14 },
  { x: 972, y: 755, dx: -1, minX: 858, maxX: 972, speed: 0.70, r: 14 },
  { x: 620,  y: 118, dy: 1,  minY: 118, maxY: 232, speed: 0.60, r: 14 },
  { x: 1255, y: 232, dy: -1, minY: 118, maxY: 232, speed: 0.65, r: 14 },
]

const RESULTS = {
  success:     { label: '🍺 MISSION ACCOMPLISHED', sub: 'Beer secured. You somehow made it.',  col: '#f1c40f' },
  nobeer:      { label: '😔 SULJETTU',              sub: 'No beer. Finnish law wins again.',    col: '#aabbcc' },
  crash:       { label: '💥 TOTALLED',              sub: 'The car is dead. And a mailbox.',     col: '#ff4444' },
  crash_moose: { label: '🦌 MOOSED',                sub: 'You hit a moose. Classic Finland.',   col: '#88cc44' },
}

export class DrunkDrivingScene extends Phaser.Scene {
  constructor() { super({ key: 'DrunkDrivingScene' }) }

  // ── LIFECYCLE ─────────────────────────────────────────────────────────────

  preload() {
    if (!this.cache.audio.has('garbo_mobile')) {
      this.load.audio('garbo_mobile', 'assets/sounds/garbo_mobile.mp3')
    }
  }

  create(data) {
    this._drunkLevel = data?.drunkLevel ?? 3
    this._gameHour   = data?.gameHour   ?? 18

    // Car state
    this._x        = START_X
    this._y        = START_Y
    this._angle    = -Math.PI / 2   // pointing up
    this._speed    = 0
    this._wobbleTimer = 0
    this._invTimer    = 0
    this._hp          = 3
    this._crashed     = false
    this._crashReason = 'crash'

    // Phase
    this._phase    = 'to_store'
    this._gotBeer  = false
    this._exiting  = false

    // Collectibles
    this._stars    = STAR_DEFS.map(s => ({ ...s, collected: false }))
    this._starsCollected = 0

    // Obstacles (mutable copies)
    this._mailboxes   = MAILBOXES.map(m => ({ ...m, alive: true }))
    this._cones       = CONES.map(c => ({ ...c, alive: true }))
    this._pedestrians = PEDESTRIANS.map(p => ({ ...p }))

    // Moose (spawns on return leg, walks west)
    this._moose = { active: false, x: 0, y: 175, speedX: -0.5, r: 22 }

    // Oncoming car (spawns on return leg, drives west on E/W road)
    this._oncoming = { active: false, x: 0, y: 150, speedX: -4.0, r: 18, beeped: false }

    // Graphics layers (all world-space)
    this._bgGfx   = this.add.graphics().setDepth(0)
    this._roadGfx = this.add.graphics().setDepth(1)
    this._obsGfx  = this.add.graphics().setDepth(2)
    this._carGfx  = this.add.graphics().setDepth(3)

    // Overlays (screen-space, scrollFactor=0)
    this._drunkOverlay = this.add.graphics().setScrollFactor(0).setDepth(9)

    // HUD texts (screen-space)
    this._hpText = this.add.text(14, 10, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(11)

    this._clockText = this.add.text(CANVAS_W - 14, 10, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(11)

    this._speedText = this.add.text(14, 36, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aabbcc',
      stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(11)

    this._navText = this.add.text(CANVAS_W - 14, 34, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#88ddff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(11)

    this._starsText = this.add.text(14, 56, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(11)

    this.add.text(CANVAS_W / 2, CANVAS_H - 12,
      '[ ↑ ] Gas   [ ↓ ] Brake   [ ← → ] Steer   [ ESC ] Quit', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(11)

    // Camera setup — invisible rectangle as follow target
    this._camTarget = this.add.rectangle(START_X, START_Y, 2, 2, 0, 0).setAlpha(0)
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H)
    this.cameras.main.startFollow(this._camTarget, true, 0.12, 0.12)

    this._ts = this.scene.get('GameScene')?.timeSystem ?? null

    this._drawBackground()
    this._drawRoads()
    this._drawStore()
    this._bindKeys()

    this.cameras.main.fadeIn(300, 0, 0, 0)

    this._music = this.sound.add('garbo_mobile', { loop: true, volume: 0.55 })
    this._music.play()
  }

  update(_time, delta) {
    if (this._phase === 'result' || this._phase === 'at_store') return

    this._updateCar(delta)
    this._updateObstacles()
    this._checkDestination()
    this._updateHUD()
    this._redraw()

    // Keep camera target on car
    this._camTarget.setPosition(this._x, this._y)
  }

  // ── BACKGROUND ────────────────────────────────────────────────────────────

  _drawBackground() {
    const g = this._bgGfx
    g.clear()

    const hr  = this._liveHour()
    const sky = hr < 16 ? 0x87ceeb : hr < 21 ? 0xff8c42 : 0x1a1a2e
    g.fillStyle(sky);      g.fillRect(0, 0, WORLD_W, 80)
    g.fillStyle(COL_GRASS); g.fillRect(0, 80, WORLD_W, WORLD_H)

    // Sparse grass detail
    g.fillStyle(0x246018, 0.35)
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 30; col++) {
        const gx = col * 62 + (row % 4) * 14
        const gy = 100 + row * 42 + (col % 5) * 7
        if (gy < WORLD_H && gx < WORLD_W) g.fillRect(gx, gy, 6, 3)
      }
    }

    this._drawTrees(g)
  }

  _drawTrees(g) {
    // Trees flanking the N/S road
    for (let ty = 150; ty < WORLD_H - 60; ty += 140) {
      this._drawTree(g, 832, ty)
      this._drawTree(g, 998, ty + 70)
    }
    // Trees flanking the E/W road
    for (let tx = 100; tx < WORLD_W - 60; tx += 170) {
      if (tx < ROAD_NS_X1 - 40 || tx > ROAD_NS_X2 + 40) {
        this._drawTree(g, tx, 82)
        this._drawTree(g, tx + 85, 258)
      }
    }
    // Scatter trees in the open grass areas (deterministic)
    const scatter = [
      [200, 380], [420, 500], [660, 720], [150, 850], [1100, 400],
      [1400, 600], [1650, 350], [350, 650], [1200, 800], [700, 900],
      [1500, 750], [80, 620], [1720, 500], [500, 300], [1300, 300],
      [1700, 800], [100, 950], [1750, 100], [400, 100], [1100, 100],
    ]
    for (const [tx, ty] of scatter) {
      if (ty > 80 && ty < WORLD_H - 30) this._drawTree(g, tx, ty)
    }
  }

  _drawTree(g, tx, ty) {
    g.fillStyle(0x000000, 0.15); g.fillCircle(tx + 3, ty + 3, 18)
    g.fillStyle(0x1a4a10);       g.fillCircle(tx, ty, 18)
    g.fillStyle(0x2a6018, 0.6);  g.fillCircle(tx - 4, ty - 4, 10)
    g.fillStyle(0x5a3010);       g.fillRect(tx - 3, ty + 14, 6, 10)
  }

  _drawRoads() {
    const g = this._roadGfx
    g.clear()

    // N/S road (full height)
    g.fillStyle(COL_ROAD)
    g.fillRect(ROAD_NS_X1, 80, ROAD_NS_X2 - ROAD_NS_X1, WORLD_H - 80)

    // E/W road (full width)
    g.fillRect(ROAD_EW_X1, ROAD_EW_Y1, ROAD_EW_X2 - ROAD_EW_X1, ROAD_EW_Y2 - ROAD_EW_Y1)

    // Kerb lines
    g.lineStyle(2, COL_KERB, 0.5)
    g.lineBetween(ROAD_NS_X1, 80, ROAD_NS_X1, WORLD_H)
    g.lineBetween(ROAD_NS_X2, 80, ROAD_NS_X2, WORLD_H)
    g.lineBetween(ROAD_EW_X1, ROAD_EW_Y1, ROAD_EW_X2, ROAD_EW_Y1)
    g.lineBetween(ROAD_EW_X1, ROAD_EW_Y2, ROAD_EW_X2, ROAD_EW_Y2)

    // N/S centre dashes
    g.lineStyle(2, COL_MARKING, 0.6)
    for (let y = 100; y < WORLD_H; y += 50) {
      g.lineBetween(915, y, 915, y + 26)
    }
    // E/W centre dashes
    for (let x = ROAD_EW_X1 + 30; x < ROAD_EW_X2 - 20; x += 50) {
      g.lineBetween(x, 175, x + 26, 175)
    }

    // Pedestrian crossing markings (zebra)
    g.fillStyle(0xffffff, 0.3)
    for (let stripe = 0; stripe < 5; stripe++) {
      g.fillRect(ROAD_NS_X1, 572 + stripe * 8, ROAD_NS_X2 - ROAD_NS_X1, 5)
      g.fillRect(ROAD_NS_X1, 748 + stripe * 8, ROAD_NS_X2 - ROAD_NS_X1, 5)
      g.fillRect(612 + stripe * 8, ROAD_EW_Y1, 5, ROAD_EW_Y2 - ROAD_EW_Y1)
      g.fillRect(1248 + stripe * 8, ROAD_EW_Y1, 5, ROAD_EW_Y2 - ROAD_EW_Y1)
    }
  }

  _drawStore() {
    const sg = this.add.graphics().setDepth(1)
    const sx = STORE_CX - 70, sy = STORE_CY - 58

    sg.fillStyle(0x2244aa); sg.fillRect(sx, sy, 140, 95)
    sg.fillStyle(0x3355cc, 0.5); sg.fillRect(sx + 6, sy + 6, 128, 32)

    sg.fillStyle(0xee2222); sg.fillRect(sx + 12, sy + 10, 116, 24)
    sg.lineStyle(1, 0xaa0000); sg.strokeRect(sx + 12, sy + 10, 116, 24)

    sg.fillStyle(0x88aadd)
    sg.fillRect(sx + 52, sy + 54, 36, 40)
    sg.lineStyle(1, 0x446699); sg.strokeRect(sx + 52, sy + 54, 36, 40)
    sg.fillRect(sx + 9, sy + 50, 30, 26); sg.strokeRect(sx + 9, sy + 50, 30, 26)
    sg.fillRect(sx + 101, sy + 50, 30, 26); sg.strokeRect(sx + 101, sy + 50, 30, 26)

    this.add.text(STORE_CX, sy + 22, 'ALKO  SALE', {
      fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      stroke: '#550000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2)

    this.add.text(STORE_CX, sy + 100, '🕗 08-21  Mon-Sat', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(2)
  }

  // ── CAR UPDATE ────────────────────────────────────────────────────────────

  _updateCar(delta) {
    if (this._crashed) return

    if (this._keys.left.isDown)  this._angle -= TURN_RATE
    if (this._keys.right.isDown) this._angle += TURN_RATE

    if (this._keys.up.isDown) {
      this._speed = Math.min(MAX_SPEED, this._speed + ACCEL)
    } else if (this._keys.down.isDown) {
      this._speed = Math.max(0, this._speed - BRAKE)
    }

    this._speed *= DECAY

    if (this._drunkLevel >= 2) {
      this._wobbleTimer--
      if (this._wobbleTimer <= 0) {
        this._angle += (Math.random() - 0.5) * 0.055 * this._drunkLevel
        this._wobbleTimer = Math.floor(25 + Math.random() * 20)
      }
    }

    this._x += Math.cos(this._angle) * this._speed
    this._y += Math.sin(this._angle) * this._speed

    this._x = Phaser.Math.Clamp(this._x, 18, WORLD_W - 18)
    this._y = Phaser.Math.Clamp(this._y, 85, WORLD_H - 18)

    if (this._invTimer > 0) this._invTimer -= delta
  }

  // ── OBSTACLES ─────────────────────────────────────────────────────────────

  _updateObstacles() {
    // Stars
    for (const s of this._stars) {
      if (s.collected) continue
      if (this._dist(s.x, s.y) < 22) {
        s.collected = true
        this._starsCollected++
        this._showFloat(s.x, s.y - 30, '⭐ +1', '#f1c40f', 16)
      }
    }

    if (this._invTimer > 0) return

    // Mailboxes
    for (const m of this._mailboxes) {
      if (!m.alive) continue
      if (this._dist(m.x, m.y) < m.r + 14) {
        m.alive = false
        this._hit(1, m.x, m.y)
        this._knockAway(m)
      }
    }

    // Cones
    for (const c of this._cones) {
      if (!c.alive) continue
      if (this._dist(c.x, c.y) < c.r + 13) {
        c.alive = false
        this._hit(1, c.x, c.y)
      }
    }

    // Pedestrians
    for (const p of this._pedestrians) {
      if (p.dx !== undefined) {
        p.x += p.dx * p.speed
        if (p.x >= p.maxX) { p.x = p.maxX; p.dx = -1 }
        if (p.x <= p.minX) { p.x = p.minX; p.dx = 1 }
      } else if (p.dy !== undefined) {
        p.y += p.dy * p.speed
        if (p.y >= p.maxY) { p.y = p.maxY; p.dy = -1 }
        if (p.y <= p.minY) { p.y = p.minY; p.dy = 1 }
      }
      if (this._dist(p.x, p.y) < p.r + 13) {
        this._hit(1, p.x, p.y)
        this._showFloat(p.x, p.y - 36, '😱', '#ffffff', 22)
      }
    }

    // Moose (return leg)
    if (this._moose.active) {
      this._moose.x += this._moose.speedX
      if (this._moose.x < -100) this._moose.active = false
      if (this._dist(this._moose.x, this._moose.y) < this._moose.r + 14) {
        this._hit(2, this._moose.x, this._moose.y, 'crash_moose')
      }
    }

    // Oncoming car (return leg)
    if (this._oncoming.active) {
      this._oncoming.x += this._oncoming.speedX
      if (this._oncoming.x < -100) this._oncoming.active = false

      if (!this._oncoming.beeped && this._dist(this._oncoming.x, this._oncoming.y) < 220) {
        this._oncoming.beeped = true
        this._showFloat(this._oncoming.x, this._oncoming.y - 30, '📯 BEEP!', '#ffff00', 15)
      }
      if (this._dist(this._oncoming.x, this._oncoming.y) < this._oncoming.r + 14) {
        this._hit(2, this._oncoming.x, this._oncoming.y)
        this._oncoming.active = false
      }
    }
  }

  _dist(ox, oy) {
    return Phaser.Math.Distance.Between(this._x, this._y, ox, oy)
  }

  _hit(damage, ox, oy, reason = 'crash') {
    if (this._invTimer > 0 || this._crashed) return
    this._hp = Math.max(0, this._hp - damage)
    this._invTimer = 1500
    this.cameras.main.shake(280, 0.014)
    this._showFloat(this._x, this._y - 40, `💥 -${damage} HP`, '#ff4444', 15)
    if (this._hp <= 0) {
      this._crashReason = reason
      this._triggerCrash()
    }
  }

  _knockAway(obj) {
    const angle = Math.atan2(obj.y - this._y, obj.x - this._x)
    this.tweens.add({
      targets: obj,
      x: obj.x + Math.cos(angle) * 55,
      y: obj.y + Math.sin(angle) * 55,
      duration: 400, ease: 'Cubic.easeOut',
    })
  }

  _triggerCrash() {
    this._crashed = true
    this._speed = 0
    this.cameras.main.shake(500, 0.022)
    let spins = 0
    this.time.addEvent({
      delay: 40, repeat: 18, callback: () => {
        this._angle += 0.35
        if (++spins >= 18) {
          this.time.delayedCall(600, () => this._showResult(this._crashReason))
        }
      },
    })
  }

  // ── DESTINATION CHECK ─────────────────────────────────────────────────────

  _checkDestination() {
    if (this._phase === 'to_store') {
      if (this._dist(STORE_CX, STORE_CY) < STORE_RADIUS) {
        this._phase = 'at_store'
        this._speed = 0
        const hr = this._liveHour()
        this._gotBeer = hr < 21
        this._showStorePanel(this._gotBeer, hr)
      }
    } else if (this._phase === 'to_mokki') {
      if (this._dist(START_X, START_Y) < RETURN_RADIUS) {
        this._showResult(this._gotBeer ? 'success' : 'nobeer')
      }
    }
  }

  _showStorePanel(open, hr) {
    const toDestroy = []

    const dim = this.add.graphics().setScrollFactor(0).setDepth(20)
    dim.fillStyle(0x000000, 0.7); dim.fillRect(0, 0, CANVAS_W, CANVAS_H)
    toDestroy.push(dim)

    const pw = 480, ph = 220, px = (CANVAS_W - pw) / 2, py = (CANVAS_H - ph) / 2
    const bg = this.add.graphics().setScrollFactor(0).setDepth(21)
    bg.fillStyle(0x060612, 0.97); bg.fillRoundedRect(px, py, pw, ph, 12)
    bg.lineStyle(2, open ? 0x44cc44 : 0xcc4444); bg.strokeRoundedRect(px, py, pw, ph, 12)
    toDestroy.push(bg)

    if (open) {
      toDestroy.push(this.add.text(CANVAS_W / 2, py + 60, '🍺  TERVETULOA!', {
        fontSize: '26px', fontFamily: 'monospace', color: '#f1c40f',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(22))
      toDestroy.push(this.add.text(CANVAS_W / 2, py + 115, "Here's your Karhu.\nNow drive home safely. 🍺", {
        fontSize: '15px', fontFamily: 'monospace', color: '#aabbcc',
        stroke: '#000', strokeThickness: 2, align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(22))
    } else {
      toDestroy.push(this.add.text(CANVAS_W / 2, py + 60, '🔒  SULJETTU', {
        fontSize: '26px', fontFamily: 'monospace', color: '#cc4444',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(22))
      toDestroy.push(this.add.text(CANVAS_W / 2, py + 115, `Finnish law. Beer sales ended at 21:00.\nCurrent time: ${hr}:00`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#aabbcc',
        stroke: '#000', strokeThickness: 2, align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(22))
    }

    this.time.delayedCall(2600, () => {
      for (const obj of toDestroy) obj.destroy()
      this._phase = 'to_mokki'
      this._spawnReturnThreats()
    })
  }

  _spawnReturnThreats() {
    // Moose walks west across E/W road (head-on encounter)
    this._moose.active = true
    this._moose.x = ROAD_EW_X2 + 80
    this._moose.y = 152 + Math.random() * 28

    // Warn player ahead of moose arrival
    this.time.delayedCall(800, () => {
      if (this._phase === 'to_mokki') {
        this._showFloat(this._x, this._y - 50, '⚠️ MOOSE AHEAD!', '#ffcc00', 16)
      }
    })

    // Oncoming car comes from the east driving west, north lane
    this._oncoming.active = true
    this._oncoming.x = ROAD_EW_X2 + 60
    this._oncoming.y = 148
    this._oncoming.beeped = false
  }

  _liveHour() {
    return this._ts?.gameHour ?? this._gameHour
  }

  // ── DRAWING ───────────────────────────────────────────────────────────────

  _redraw() {
    this._obsGfx.clear()
    this._carGfx.clear()
    this._drunkOverlay.clear()

    this._drawStars()
    this._drawObstacles()
    this._drawMoose()
    this._drawOncoming()
    this._drawCar()
    this._drawDrunkOverlay()
  }

  _drawStars() {
    const g = this._obsGfx
    const t = Date.now() / 400
    for (const s of this._stars) {
      if (s.collected) continue
      const pulse = 0.8 + 0.2 * Math.sin(t + s.x)
      const r = 12 * pulse
      g.fillStyle(0xf1c40f, 0.25); g.fillCircle(s.x, s.y, r + 6)
      g.fillStyle(0xf1c40f)
      // 5-point star
      const pts = []
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI / 5) - Math.PI / 2
        const rad = i % 2 === 0 ? r : r * 0.42
        pts.push({ x: s.x + Math.cos(ang) * rad, y: s.y + Math.sin(ang) * rad })
      }
      g.fillPoints(pts, true)
      g.fillStyle(0xffffff, 0.5); g.fillCircle(s.x - 2, s.y - 3, 3)
    }
  }

  _drawCar() {
    const g = this._carGfx
    const cx = this._x, cy = this._y

    if (this._invTimer > 0 && Math.floor(this._invTimer / 120) % 2 === 0) return

    // Add π/2 so the car's long axis (CAR_H) aligns with movement direction
    const ang = this._angle + Math.PI / 2
    const cos = Math.cos(ang), sin = Math.sin(ang)

    const pt = (lx, ly) => ({
      x: cx + cos * lx - sin * ly,
      y: cy + sin * lx + cos * ly,
    })

    // Shadow
    g.fillStyle(0x000000, 0.2)
    g.fillEllipse(cx + 3, cy + 4, CAR_H * 2, CAR_W * 2)

    // Body
    g.fillStyle(this._crashed ? 0x553322 : 0xcc2222)
    g.fillPoints([pt(-CAR_W, -CAR_H), pt(CAR_W, -CAR_H), pt(CAR_W, CAR_H), pt(-CAR_W, CAR_H)], true)

    // Windshield (front = negative Y local = positive movement direction)
    g.fillStyle(0x88aacc, 0.8)
    g.fillPoints([pt(-CAR_W + 3, -CAR_H + 4), pt(CAR_W - 3, -CAR_H + 4),
                  pt(CAR_W - 5, -CAR_H + 14), pt(-CAR_W + 5, -CAR_H + 14)], true)

    // Rear window
    g.fillPoints([pt(-CAR_W + 4, CAR_H - 14), pt(CAR_W - 4, CAR_H - 14),
                  pt(CAR_W - 5, CAR_H - 4), pt(-CAR_W + 5, CAR_H - 4)], true)

    // Headlights (front)
    g.fillStyle(0xffffcc)
    const fl = pt(-CAR_W + 3, -CAR_H + 2)
    const fr = pt( CAR_W - 3, -CAR_H + 2)
    g.fillCircle(fl.x, fl.y, 4)
    g.fillCircle(fr.x, fr.y, 4)

    // Tail lights (rear)
    g.fillStyle(0xff2200)
    const tl = pt(-CAR_W + 3, CAR_H - 2)
    const tr = pt( CAR_W - 3, CAR_H - 2)
    g.fillCircle(tl.x, tl.y, 3)
    g.fillCircle(tr.x, tr.y, 3)

    // Beer on roof when returning with beer
    if (this._gotBeer && this._phase === 'to_mokki') {
      const roof = pt(0, -CAR_H - 8)
      g.fillStyle(0xf1c40f); g.fillCircle(roof.x, roof.y, 7)
      g.fillStyle(0xaa8800); g.fillCircle(roof.x, roof.y, 4)
    }
  }

  _drawObstacles() {
    const g = this._obsGfx

    for (const m of this._mailboxes) {
      if (!m.alive) continue
      g.fillStyle(0x000000, 0.18); g.fillRect(m.x - 7, m.y - 8, 16, 18)
      g.fillStyle(0x3366aa);       g.fillRect(m.x - 7, m.y - 8, 16, 18)
      g.fillStyle(0x4488cc);       g.fillRect(m.x - 5, m.y - 6, 10, 8)
      g.fillStyle(0x222222);       g.fillRect(m.x - 1, m.y + 8,  2, 6)
    }

    for (const c of this._cones) {
      if (!c.alive) continue
      g.fillStyle(0x000000, 0.15); g.fillCircle(c.x + 2, c.y + 2, 10)
      g.fillStyle(0xff6600)
      g.fillTriangle(c.x, c.y - 14, c.x - 9, c.y + 6, c.x + 9, c.y + 6)
      g.fillStyle(0xffffff, 0.7); g.fillRect(c.x - 7, c.y - 4, 14, 4)
      g.fillStyle(0xdddddd);       g.fillEllipse(c.x, c.y + 6, 18, 6)
    }

    for (const p of this._pedestrians) {
      g.fillStyle(0x000000, 0.15); g.fillCircle(p.x + 2, p.y + 2, p.r)
      g.fillStyle(0xf2c88a);       g.fillCircle(p.x, p.y - 8, 9)
      g.fillStyle(0x3388cc);       g.fillRoundedRect(p.x - 6, p.y + 2, 12, 16, 3)
    }
  }

  _drawMoose() {
    if (!this._moose.active) return
    const g = this._obsGfx
    const mx = this._moose.x, my = this._moose.y
    const d = this._moose.speedX >= 0 ? 1 : -1  // 1 = going right, -1 = going left

    g.fillStyle(0x000000, 0.2); g.fillEllipse(mx, my + 4, 60, 22)
    g.fillStyle(0x4a3020); g.fillEllipse(mx, my, 56, 20)
    g.fillStyle(0x4a3020); g.fillEllipse(mx + d * 30, my - 8, 22, 16)
    g.fillStyle(0x6a4830); g.fillEllipse(mx + d * 40, my - 6, 14, 10)

    g.lineStyle(3, 0x5a3820)
    g.lineBetween(mx + d * 24, my - 14, mx + d * 18, my - 30)
    g.lineBetween(mx + d * 18, my - 24, mx + d * 12, my - 30)
    g.lineBetween(mx + d * 18, my - 24, mx + d * 24, my - 30)
    g.lineBetween(mx + d * 32, my - 14, mx + d * 36, my - 30)
    g.lineBetween(mx + d * 36, my - 24, mx + d * 30, my - 30)
    g.lineBetween(mx + d * 36, my - 24, mx + d * 42, my - 30)

    g.fillStyle(0x111111); g.fillCircle(mx + d * 36, my - 10, 2.5)
    g.fillStyle(0x3a2818)
    for (let li = 0; li < 4; li++) g.fillRect(mx - 18 + li * 12, my + 8, 4, 12)
  }

  _drawOncoming() {
    if (!this._oncoming.active) return
    const g = this._obsGfx
    const ox = this._oncoming.x, oy = this._oncoming.y

    // Car driving west — draw it as a horizontal car (rotated 90°)
    g.fillStyle(0x000000, 0.2); g.fillEllipse(ox, oy + 2, 52, 30)
    g.fillStyle(0x227744); g.fillRect(ox - 24, oy - 13, 48, 26)
    g.fillStyle(0x88aacc, 0.8)
    g.fillRect(ox - 20, oy - 10, 16, 20)
    g.fillRect(ox + 4,  oy - 10, 16, 20)
    // Left-side headlights (west-facing = left side)
    g.fillStyle(0xffffcc)
    g.fillCircle(ox - 22, oy - 9,  3)
    g.fillCircle(ox - 22, oy + 9,  3)
    // Right-side tail lights
    g.fillStyle(0xff2200)
    g.fillCircle(ox + 22, oy - 9,  2.5)
    g.fillCircle(ox + 22, oy + 9,  2.5)
  }

  _drawDrunkOverlay() {
    if (this._drunkLevel < 3) return
    const g = this._drunkOverlay
    const alpha  = Math.min(0.28, (this._drunkLevel - 2) * 0.04)
    const pulse  = 0.5 + 0.5 * Math.sin(Date.now() / 600)
    g.fillStyle(0xff8800, alpha * (0.7 + pulse * 0.3))
    g.fillRect(0, 0, CANVAS_W, CANVAS_H)
    g.fillStyle(0x000000, 0.18 + pulse * 0.08)
    g.fillRect(0, 0, 60, CANVAS_H)
    g.fillRect(CANVAS_W - 60, 0, 60, CANVAS_H)
    g.fillRect(0, 0, CANVAS_W, 40)
    g.fillRect(0, CANVAS_H - 40, CANVAS_W, 40)
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    this._hpText.setText('🚗'.repeat(this._hp) + '💀'.repeat(3 - this._hp))

    const hr = this._liveHour()
    this._clockText
      .setText(`🕐 ${String(hr % 24).padStart(2, '0')}:00`)
      .setColor(hr >= 20 ? '#ff4444' : '#f1c40f')

    const spdPct = this._speed / MAX_SPEED
    const filled = Math.round(spdPct * 6)
    this._speedText.setText(`SPD [${'█'.repeat(filled)}${'░'.repeat(6 - filled)}]`)

    this._starsText.setText(`⭐ ${this._starsCollected} / ${STAR_DEFS.length}`)

    const [tx, ty] = this._phase === 'to_store'
      ? [STORE_CX, STORE_CY]
      : [START_X, START_Y]
    const navAng = Math.atan2(ty - this._y, tx - this._x)
    const dist   = Math.round(Phaser.Math.Distance.Between(this._x, this._y, tx, ty))
    const dirs   = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗']
    const dirIdx = Math.round(((navAng + Math.PI) / (Math.PI * 2)) * 8) % 8
    const label  = this._phase === 'to_store' ? 'SALE' : 'MÖKKI'
    this._navText.setText(`${label} ${dirs[dirIdx]}  ${dist}m`)
  }

  // ── RESULT ────────────────────────────────────────────────────────────────

  _showResult(key) {
    if (this._phase === 'result') return
    this._phase = 'result'
    const r = RESULTS[key]

    this.time.delayedCall(400, () => {
      const dim = this.add.graphics().setScrollFactor(0).setDepth(30)
      dim.fillStyle(0x000000, 0.72); dim.fillRect(0, 0, CANVAS_W, CANVAS_H)

      const pw = 520, ph = 300, px = (CANVAS_W - pw) / 2, py = (CANVAS_H - ph) / 2
      const bg = this.add.graphics().setScrollFactor(0).setDepth(31)
      bg.fillStyle(0x060612, 0.97); bg.fillRoundedRect(px, py, pw, ph, 14)
      bg.lineStyle(2, 0x2a3a4a);    bg.strokeRoundedRect(px, py, pw, ph, 14)

      this.add.text(CANVAS_W / 2, py + 72, r.label, {
        fontSize: '26px', fontFamily: 'monospace', color: r.col,
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(32)

      this.add.text(CANVAS_W / 2, py + 130, r.sub, {
        fontSize: '15px', fontFamily: 'monospace', color: '#99aabb',
        stroke: '#000', strokeThickness: 2, align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(32)

      this.add.text(CANVAS_W / 2, py + 170, `Stars collected: ${this._starsCollected} / ${STAR_DEFS.length}`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#f1c40f',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(32)

      this.add.text(CANVAS_W / 2, py + ph - 26, '[ ESC / ENTER ]  Back to mökki', {
        fontSize: '12px', fontFamily: 'monospace', color: '#445566',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(32)

      this.scene.get('GameScene')?.events.emit('result:drunkdriving', { outcome: key, stars: this._starsCollected })
    })
  }

  // ── UTILITIES ─────────────────────────────────────────────────────────────

  _showFloat(x, y, text, color, size = 13) {
    const t = this.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(8).setAlpha(0)
    this.tweens.add({
      targets: t, alpha: { from: 0, to: 1 }, y: y - 28,
      duration: 220, hold: 1100, yoyo: true,
      onComplete: () => t.destroy(),
    })
  }

  // ── KEYS ──────────────────────────────────────────────────────────────────

  _bindKeys() {
    this._keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    })
    this._keys.esc.on('down',   () => this._exit())
    this._keys.enter.on('down', () => { if (this._phase === 'result') this._exit() })
  }

  // ── EXIT ──────────────────────────────────────────────────────────────────

  _exit() {
    if (this._exiting) return
    this._exiting = true
    this._music?.stop()
    this.cameras.main.fadeOut(350, 0, 0, 0)
    this.time.delayedCall(370, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
