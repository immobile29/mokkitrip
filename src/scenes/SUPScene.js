const W = 900
const H = 600
const PLAYER_R  = 9
const PADDLE_CD = 290   // ms between strokes — slower rhythm = harder

// Start / finish zone
const DOCK = { x: 450, y: 510, radius: 46 }

// 5 checkpoints in a wide U-circuit: lower-left → upper-left → top → upper-right → lower-right
const CHECKPOINTS = [
  { x: 100, y: 390, radius: 36, label: '1' },
  { x: 108, y: 160, radius: 36, label: '2' },
  { x: 450, y: 88,  radius: 36, label: '3' },
  { x: 792, y: 160, radius: 36, label: '4' },
  { x: 800, y: 390, radius: 36, label: '5' },
]

// 10 obstacles — faster, bigger, denser
const OBSTACLE_DEFS = [
  { x: 230, y: 310, r: 19, type: 'log',  vx:  0.30, vy:  0.16 },
  { x: 620, y: 165, r: 15, type: 'lily', vx: -0.24, vy:  0.28 },
  { x: 350, y: 390, r: 18, type: 'log',  vx:  0.32, vy: -0.20 },
  { x: 670, y: 410, r: 14, type: 'lily', vx: -0.26, vy: -0.24 },
  { x: 160, y: 230, r: 17, type: 'log',  vx:  0.20, vy:  0.34 },
  { x: 520, y: 300, r: 15, type: 'lily', vx: -0.18, vy:  0.22 },
  { x: 740, y: 300, r: 18, type: 'log',  vx: -0.28, vy:  0.18 },
  { x: 300, y: 155, r: 14, type: 'lily', vx:  0.22, vy: -0.20 },
  { x: 450, y: 350, r: 16, type: 'log',  vx: -0.20, vy:  0.26 },
  { x: 580, y: 235, r: 13, type: 'lily', vx:  0.26, vy: -0.18 },
]

// Hungarian Navy — single patrol boat, spawns after CP1
const NAVY_DEFS = [
  { x: 450, y: 140, angle: Math.PI, fireDelay: 3000 },
]
const NAVY_SPEED     = 0.52
const NAVY_FIRE_CD   = 4800   // ms between shots
const NAVY_PROJ_SPD  = 4.2
const NAVY_PROJ_R    = 6
const NAVY_TAUNT = [
  'HALT! HUNGARIAN NAVY!',
  'STOP IN THE NAME OF HUNGARY!',
  'YOU CANNOT ESCAPE THE DANUBE FLEET!',
  'THIS IS LAKE PROPERTY OF HUNGARY!',
  'PAPRIKA CANNONS ARMED!',
  'THE ADMIRAL WILL HEAR OF THIS!',
]

// Clams (will fight you)
const CLAM_DEFS = [
  { x: 320, y: 220 },
  { x: 610, y: 330 },
  { x: 175, y: 340 },
  { x: 730, y: 240 },
  { x: 450, y: 190 },
]
const CLAM_SNAP_DIST = 58
const CLAM_HIT_DIST  = 34
const CLAM_TAUNTS = [
  '"GET OUT OF MY LAKE"',
  '"SNAP SNAP SNAP"',
  '"I AM FIGHTING YOU"',
  '"CLAM RIGHTS NOW"',
  '"YOU SHALL NOT PADDLE"',
  '"THIS IS MY WATER"',
]

// Medal thresholds (seconds)
const MEDALS = [
  { secs: 45,  label: '🥇 Gold',   color: '#f1c40f' },
  { secs: 60,  label: '🥈 Silver', color: '#b0c0cc' },
  { secs: 90,  label: '🥉 Bronze', color: '#cd7f32' },
  { secs: Infinity, label: 'No medal', color: '#667788' },
]

const BOOST_CD      = 8000   // ms cooldown between boosts
const BOOST_SPEED   = 5.8    // top speed during boost (above normal max)

export class SUPScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SUPScene' })
  }

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  create() {
    // ── player state ──
    this._x      = DOCK.x
    this._y      = DOCK.y - 36
    this._angle  = -Math.PI / 2   // pointing up
    this._speed  = 0
    this._maxSpeed   = 3.0
    this._decay      = 0.960
    this._turnRate   = 0.044
    this._paddleNext = 0           // timestamp when next stroke allowed
    this._paddleSide = 1           // 1 = right arm, -1 = left arm, alternates
    this._paddleAnim = 0           // frames since last stroke (for arm visual)
    this._boostNext  = 0           // timestamp when boost is ready again

    // ── mission state ──
    this._nextCP   = 0
    this._cpDone   = [false, false, false, false, false]
    this._phase    = 'paddling'    // 'paddling' | 'return' | 'result' | 'gameover'
    this._elapsed  = 0
    this._exiting  = false
    this._hitFlash = 0             // invincibility frames after a hit
    this._lives    = 5

    // ── obstacle runtime state ──
    this._obstacles = OBSTACLE_DEFS.map(o => ({ ...o }))

    // ── Hungarian Navy state — inactive until CP1 is cleared ──
    this._navyBoats = NAVY_DEFS.map(d => ({
      x: d.x, y: d.y, angle: d.angle,
      nextFire: d.fireDelay,
      active: false,
    }))
    this._projectiles = []   // { x, y, vx, vy, life }

    // ── Clam state ──
    this._clams = CLAM_DEFS.map(d => ({
      x: d.x, y: d.y,
      open: 0,       // 0=closed, 1=fully open (animated)
      cooldown: 0,   // ms until next snap
      snapping: false,
    }))

    // ── graphics layers ──
    this._bgGfx      = this.add.graphics().setDepth(0)
    this._waveGfx    = this.add.graphics().setDepth(1)
    this._obsGfx     = this.add.graphics().setDepth(2)
    this._navyGfx    = this.add.graphics().setDepth(3)
    this._clamGfx    = this.add.graphics().setDepth(3)
    this._projGfx    = this.add.graphics().setDepth(4)
    this._cpGfx      = this.add.graphics().setDepth(3)
    this._playerGfx  = this.add.graphics().setDepth(5)

    // time-period tint
    const gs     = this.scene.get('GameScene')
    const period = gs?.timeSystem?.currentPeriod
    this._isEvening = period === 'evening'

    this._drawBackground()
    this._buildCheckpointRings()
    this._buildHUD()
    this._bindKeys()

    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  update(time, delta) {
    if (this._phase === 'result' || this._phase === 'gameover') return

    this._elapsed += delta

    // ── steering ──
    if (this._cursors.left.isDown)  this._angle -= this._turnRate
    if (this._cursors.right.isDown) this._angle += this._turnRate

    // ── paddle stroke (UP arrow) ──
    if (this._cursors.up.isDown && time >= this._paddleNext) {
      this._speed      = Math.min(this._maxSpeed, this._speed + 0.58)
      this._paddleNext = time + PADDLE_CD
      this._paddleSide = -this._paddleSide
      this._paddleAnim = 12
    }

    // ── boost (SPACE) ──
    if (Phaser.Input.Keyboard.JustDown(this._spaceKey) && time >= this._boostNext) {
      this._speed    = BOOST_SPEED
      this._boostNext = time + BOOST_CD
      this._paddleAnim = 18
      this._showFloatingText(this._x, this._y - 36, '⚡ BOOST!', '#f1c40f', 15)
    }
    if (this._paddleAnim > 0) this._paddleAnim--

    // ── physics ──
    this._speed *= this._decay
    this._x += Math.cos(this._angle) * this._speed
    this._y += Math.sin(this._angle) * this._speed

    // lake bounds (sky strip at top ~90px, dock at bottom ~520)
    this._x = Phaser.Math.Clamp(this._x, 18, W - 18)
    this._y = Phaser.Math.Clamp(this._y, 92, 520)

    // ── obstacles ──
    this._updateObstacles()
    this._checkObstacleCollision()

    // ── Hungarian Navy ──
    this._updateNavy(time, delta)
    this._updateProjectiles()

    // ── Clams ──
    this._updateClams(delta)

    // ── checkpoints / finish ──
    if (this._phase === 'paddling' && this._nextCP < 5) {
      const cp = CHECKPOINTS[this._nextCP]
      const d  = Phaser.Math.Distance.Between(this._x, this._y, cp.x, cp.y)
      if (d < cp.radius + PLAYER_R) {
        this._hitCheckpoint(this._nextCP)
      }
    } else if (this._phase === 'return') {
      const d = Phaser.Math.Distance.Between(this._x, this._y, DOCK.x, DOCK.y)
      if (d < DOCK.radius) {
        this._finishRun()
        return
      }
    }

    // ── draw ──
    this._drawWaves(time)
    this._drawObstacles()
    this._drawClams()
    this._drawNavy()
    this._drawProjectiles()
    this._drawCheckpointRings()
    this._drawDockZone()
    this._drawPlayer()
    this._updateHUD()

    if (this._hitFlash > 0) this._hitFlash--
  }

  // ── BACKGROUND ────────────────────────────────────────────────────────────

  _drawBackground() {
    const g = this._bgGfx

    // Sky strip
    const skyA = this._isEvening ? 0xd4703f : 0x87ceeb
    const skyB = this._isEvening ? 0xf0a060 : 0xbcdff0
    g.fillStyle(skyA)
    g.fillRect(0, 0, W, 90)
    g.fillStyle(skyB, 0.4)
    g.fillRect(0, 60, W, 34)

    // Sun / evening glow
    if (this._isEvening) {
      g.fillStyle(0xff8800)
      g.fillCircle(700, 58, 22)
      g.fillStyle(0xff6600, 0.25)
      g.fillCircle(700, 58, 40)
    } else {
      g.fillStyle(0xffe066)
      g.fillCircle(800, 38, 28)
      g.fillStyle(0xffd700, 0.2)
      g.fillCircle(800, 38, 44)
    }

    // Treeline silhouette
    g.fillStyle(0x1e3d18)
    for (let tx = 0; tx < W + 40; tx += 36) {
      const th = 26 + Math.sin(tx * 0.19) * 10
      g.fillEllipse(tx, 88, 46, th)
    }
    g.fillStyle(0x142814)
    g.fillRect(0, 86, W, 8)

    // Lake
    const lakeColor = this._isEvening ? 0x1a4060 : 0x1a6fa8
    g.fillStyle(lakeColor)
    g.fillRect(0, 90, W, H - 90 - 82)

    // Shore / dock bottom strip
    g.fillStyle(0x1a1a1a)
    g.fillRect(0, H - 84, W, 84)
    g.fillStyle(0x6a4020)
    g.fillRect(0, H - 82, W, 80)
    // Plank lines
    g.fillStyle(0x5a3010, 0.6)
    for (let py = H - 82; py < H; py += 18) {
      g.fillRect(0, py, W, 3)
    }
    // Water edge at top of dock
    g.fillStyle(0x000000, 0.18)
    g.fillRect(0, H - 84, W, 6)
    // "DOCK" label
    this.add.text(W / 2, H - 44, 'DOCK  🏁 START / FINISH', {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#c8a060', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4)
  }

  // ── WAVES ─────────────────────────────────────────────────────────────────

  _drawWaves(time) {
    const g = this._waveGfx
    g.clear()
    for (let wi = 0; wi < 5; wi++) {
      const wy   = 110 + wi * 80
      const alph = 0.13 - wi * 0.018
      g.lineStyle(1.4, 0xaaddee, alph)
      g.beginPath()
      for (let x = 0; x <= W; x += 8) {
        const y = wy + Math.sin(x * 0.022 + time * 0.0014 + wi * 1.9) * 5
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y)
      }
      g.strokePath()
    }
  }

  // ── OBSTACLES ─────────────────────────────────────────────────────────────

  _updateObstacles() {
    for (const o of this._obstacles) {
      o.x += o.vx
      o.y += o.vy
      if (o.x < o.r + 10 || o.x > W - o.r - 10) o.vx *= -1
      if (o.y < 100 + o.r  || o.y > H - 90 - o.r) o.vy *= -1
    }
  }

  _drawObstacles() {
    const g = this._obsGfx
    g.clear()
    for (const o of this._obstacles) {
      if (o.type === 'log') {
        // Elongated brown oval
        g.fillStyle(0x000000, 0.2)
        g.fillEllipse(o.x + 2, o.y + 2, o.r * 2.8, o.r * 1.1)
        g.fillStyle(0x7a4820)
        g.fillEllipse(o.x, o.y, o.r * 2.8, o.r * 1.1)
        g.fillStyle(0x9a6030)
        g.fillEllipse(o.x - o.r * 0.5, o.y - 1, o.r * 1.2, o.r * 0.7)
        // grain lines
        g.lineStyle(1, 0x5a3010, 0.5)
        g.lineBetween(o.x - o.r * 0.9, o.y, o.x + o.r * 0.9, o.y)
      } else {
        // Lily pad — green circle with white flower
        g.fillStyle(0x000000, 0.15)
        g.fillCircle(o.x + 1, o.y + 1, o.r)
        g.fillStyle(0x2a7a2a)
        g.fillCircle(o.x, o.y, o.r)
        g.fillStyle(0x44aa44)
        g.fillCircle(o.x - o.r * 0.2, o.y - o.r * 0.2, o.r * 0.55)
        // V-notch
        g.fillStyle(this._isEvening ? 0x1a4060 : 0x1a6fa8)
        g.fillTriangle(o.x, o.y, o.x + o.r * 0.5, o.y - o.r, o.x - o.r * 0.5, o.y - o.r)
        // Flower
        g.fillStyle(0xffffff)
        g.fillCircle(o.x, o.y, o.r * 0.22)
        g.fillStyle(0xffee88)
        g.fillCircle(o.x, o.y, o.r * 0.1)
      }
    }
  }

  _checkObstacleCollision() {
    for (const o of this._obstacles) {
      const d = Phaser.Math.Distance.Between(this._x, this._y, o.x, o.y)
      if (d < o.r + PLAYER_R + 2) {
        if (this._hitFlash <= 0) {
          // push player away
          const nx = (this._x - o.x) / d
          const ny = (this._y - o.y) / d
          this._x += nx * (o.r + PLAYER_R + 2 - d + 2)
          this._y += ny * (o.r + PLAYER_R + 2 - d + 2)
          this._loseLife('💥 OBSTACLE!', '#ff8844')
        }
      }
    }
  }

  // ── HUNGARIAN NAVY ────────────────────────────────────────────────────────

  _updateNavy(time, delta) {
    for (const boat of this._navyBoats) {
      if (!boat.active) continue
      // Chase player
      const dx = this._x - boat.x
      const dy = this._y - boat.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      boat.angle = Math.atan2(dy, dx)
      if (dist > 30) {
        boat.x += (dx / dist) * NAVY_SPEED
        boat.y += (dy / dist) * NAVY_SPEED
      }
      // Clamp to lake
      boat.x = Phaser.Math.Clamp(boat.x, 24, W - 24)
      boat.y = Phaser.Math.Clamp(boat.y, 96, 505)

      // Fire projectile
      boat.nextFire -= delta
      if (boat.nextFire <= 0) {
        boat.nextFire = NAVY_FIRE_CD
        // Lead the player slightly
        const lead = 0.4
        const tx = this._x + Math.cos(this._angle) * this._speed * 18 * lead
        const ty = this._y + Math.sin(this._angle) * this._speed * 18 * lead
        const pdx = tx - boat.x, pdy = ty - boat.y
        const pl = Math.sqrt(pdx * pdx + pdy * pdy) || 1
        this._projectiles.push({
          x: boat.x, y: boat.y,
          vx: (pdx / pl) * NAVY_PROJ_SPD,
          vy: (pdy / pl) * NAVY_PROJ_SPD,
          life: 120,
        })
        // Taunt bubble
        const taunt = Phaser.Utils.Array.GetRandom(NAVY_TAUNT)
        this._showFloatingText(boat.x, boat.y - 22, taunt, '#ee4444', 11)
      }
    }
  }

  _updateProjectiles() {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i]
      p.x += p.vx
      p.y += p.vy
      p.life--
      if (p.life <= 0 || p.x < 0 || p.x > W || p.y < 96 || p.y > 520) {
        this._projectiles.splice(i, 1)
        continue
      }
      // Hit player
      const d = Phaser.Math.Distance.Between(this._x, this._y, p.x, p.y)
      if (d < PLAYER_R + NAVY_PROJ_R) {
        this._projectiles.splice(i, 1)
        if (this._hitFlash <= 0) {
          this._loseLife('💥 CANNONBALL!', '#ff4444')
        }
      }
    }
  }

  _drawNavy() {
    const g = this._navyGfx
    g.clear()
    for (const boat of this._navyBoats) {
      if (!boat.active) continue
      const cos = Math.cos(boat.angle), sin = Math.sin(boat.angle)
      // Shadow
      g.fillStyle(0x000000, 0.2)
      g.fillEllipse(boat.x + 2, boat.y + 2, 46, 18)
      // Hull
      g.fillStyle(0x334455)
      const hull = [
        { x: boat.x + cos * 22 - sin * 8, y: boat.y + sin * 22 + cos * 8 },
        { x: boat.x + cos * 22 + sin * 8, y: boat.y + sin * 22 - cos * 8 },
        { x: boat.x - cos * 22 + sin * 8, y: boat.y - sin * 22 - cos * 8 },
        { x: boat.x - cos * 22 - sin * 8, y: boat.y - sin * 22 + cos * 8 },
      ]
      g.fillPoints(hull, true)
      // Deck
      g.fillStyle(0x4a6070)
      g.fillCircle(boat.x, boat.y, 9)
      // Hungarian flag (red/white/green stripes) on bow
      const fx = boat.x + cos * 16, fy = boat.y + sin * 16
      g.fillStyle(0xdd2020); g.fillRect(fx - 4, fy - 5, 8, 3)
      g.fillStyle(0xffffff); g.fillRect(fx - 4, fy - 2, 8, 3)
      g.fillStyle(0x228844); g.fillRect(fx - 4, fy + 1, 8, 3)
      g.lineStyle(1, 0x1a1a1a); g.strokeRect(fx - 4, fy - 5, 8, 9)
      // Cannon barrel (points toward player)
      const cx2 = boat.x + cos * 8, cy2 = boat.y + sin * 8
      g.lineStyle(3, 0x222222, 1)
      g.lineBetween(boat.x, boat.y, cx2 + cos * 10, cy2 + sin * 10)
      g.fillStyle(0x111111)
      g.fillCircle(cx2 + cos * 10, cy2 + sin * 10, 3)
    }
  }

  _drawProjectiles() {
    const g = this._projGfx
    g.clear()
    for (const p of this._projectiles) {
      // Cannonball with glow
      g.fillStyle(0xff8800, 0.4)
      g.fillCircle(p.x, p.y, NAVY_PROJ_R + 4)
      g.fillStyle(0xff4400)
      g.fillCircle(p.x, p.y, NAVY_PROJ_R)
      g.fillStyle(0xffcc00)
      g.fillCircle(p.x - 2, p.y - 2, 2)
    }
  }

  // ── CLAMS ────────────────────────────────────────────────────────────────

  _updateClams(delta) {
    for (const clam of this._clams) {
      clam.cooldown = Math.max(0, clam.cooldown - delta)

      const d = Phaser.Math.Distance.Between(this._x, this._y, clam.x, clam.y)

      if (clam.cooldown <= 0 && d < CLAM_SNAP_DIST && !clam.snapping) {
        // Start snap
        clam.snapping = true
        clam.open = 0
        const taunt = Phaser.Utils.Array.GetRandom(CLAM_TAUNTS)
        this._showFloatingText(clam.x, clam.y - 28, taunt, '#88ffaa', 10)
      }

      if (clam.snapping) {
        clam.open = Math.min(1, clam.open + 0.06)
        if (clam.open >= 1) {
          // Fully open — check hit
          if (d < CLAM_HIT_DIST && this._hitFlash <= 0) {
            this._speed  *= 0.25
            const nx = (this._x - clam.x) / (d || 1)
            const ny = (this._y - clam.y) / (d || 1)
            this._x += nx * 18
            this._y += ny * 18
            this.cameras.main.shake(200, 0.010)
            this._hitFlash = 22
            this._showFloatingText(this._x, this._y - 28, '🦪 CLAMPED!', '#88ffaa', 13)
          }
          // Start closing
          clam.snapping = false
          clam.open = 1
          clam.cooldown = 2200
        }
      } else {
        // Close gradually when not snapping
        clam.open = Math.max(0, clam.open - 0.04)
      }
    }
  }

  _drawClams() {
    const g = this._clamGfx
    g.clear()
    for (const clam of this._clams) {
      const cx = clam.x, cy = clam.y
      const openAng = clam.open * (Math.PI * 0.55)

      // Shadow
      g.fillStyle(0x000000, 0.18)
      g.fillEllipse(cx + 2, cy + 2, 32, 18)

      // Bottom shell (fixed)
      g.fillStyle(0xd4a040)
      g.fillEllipse(cx, cy + 4, 28, 12)
      g.fillStyle(0xe8c060)
      g.fillEllipse(cx - 2, cy + 2, 20, 8)
      // Shell ridges
      g.lineStyle(1, 0xb08030, 0.6)
      for (let ri = 0; ri < 3; ri++) {
        g.lineBetween(cx - 10 + ri * 8, cy + 1, cx - 10 + ri * 8, cy + 8)
      }

      // Top shell (opens upward)
      const topOff = -Math.sin(openAng) * 14
      g.fillStyle(0xd4a040)
      g.fillEllipse(cx, cy + topOff, 28, 12)
      g.fillStyle(0xe8c060)
      g.fillEllipse(cx - 2, cy + topOff - 2, 20, 8)
      g.lineStyle(1, 0xb08030, 0.6)
      for (let ri = 0; ri < 3; ri++) {
        g.lineBetween(cx - 10 + ri * 8, cy + topOff - 6, cx - 10 + ri * 8, cy + topOff + 1)
      }

      // Interior pearl / flesh when open
      if (clam.open > 0.3) {
        const alpha = (clam.open - 0.3) / 0.7
        g.fillStyle(0xff8888, alpha * 0.7)
        g.fillEllipse(cx, cy - 2, 18, 8)
        g.fillStyle(0xffffff, alpha * 0.5)
        g.fillCircle(cx + 4, cy - 1, 3)
      }

      // Angry eyes when snapping
      if (clam.snapping || clam.open > 0.5) {
        g.fillStyle(0xff2200)
        g.fillCircle(cx - 5, cy - 2, 2.5)
        g.fillCircle(cx + 5, cy - 2, 2.5)
        g.fillStyle(0xffff00)
        g.fillCircle(cx - 5, cy - 2, 1)
        g.fillCircle(cx + 5, cy - 2, 1)
      }
    }
  }

  _loseLife(label, color) {
    this._lives--
    this._speed *= 0.18
    this.cameras.main.shake(280, 0.016)
    this._hitFlash = 55   // ~0.9s invincibility
    this._showFloatingText(this._x, this._y - 36, label, color, 14)
    if (this._lives <= 0) {
      this.time.delayedCall(600, () => this._showGameOver())
    }
  }

  _showGameOver() {
    this._phase = 'gameover'
    const secs  = Math.floor(this._elapsed / 1000)
    const m     = Math.floor(secs / 60)
    const s     = secs % 60
    const cps   = this._cpDone.filter(Boolean).length

    // Dark backdrop
    const panel = this.add.graphics().setDepth(50)
    panel.fillStyle(0x000000, 0.78)
    panel.fillRect(W / 2 - 220, H / 2 - 130, 440, 260)
    panel.lineStyle(2, 0xee4444, 1)
    panel.strokeRect(W / 2 - 220, H / 2 - 130, 440, 260)

    this.add.text(W / 2, H / 2 - 100, '💀 SUNK BY THE HUNGARIAN NAVY', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ee4444',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(51)

    this.add.text(W / 2, H / 2 - 60, `Time: ${m}:${String(s).padStart(2, '0')}`, {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(51)

    this.add.text(W / 2, H / 2 - 24, `Checkpoints: ${cps} / 5`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#aabbcc',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(51)

    this.add.text(W / 2, H / 2 + 28, 'Better luck next time, sailor.', {
      fontSize: '14px', fontFamily: 'monospace', color: '#778899',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(51)

    this.add.text(W / 2, H / 2 + 80, '[ ESC ] Back to mökki', {
      fontSize: '13px', fontFamily: 'monospace', color: '#556677',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(51)
  }

  _showFloatingText(x, y, text, color, size = 12) {
    const t = this.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#00000088',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(12).setAlpha(0)
    this.tweens.add({
      targets: t,
      alpha: { from: 0, to: 1 },
      y: y - 28,
      duration: 260, hold: 1200, yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => t.destroy(),
    })
  }

  // ── CHECKPOINT RINGS ──────────────────────────────────────────────────────

  _buildCheckpointRings() {
    this._cpGraphics = []
    this._cpLabels   = []
    this._cpTweens   = []

    for (let i = 0; i < CHECKPOINTS.length; i++) {
      const cp  = CHECKPOINTS[i]
      const gfx = this.add.graphics().setDepth(3)
      const lbl = this.add.text(cp.x, cp.y, cp.label, {
        fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(4)

      this._cpGraphics.push(gfx)
      this._cpLabels.push(lbl)

      // Pulse alpha tween
      const tw = this.tweens.add({
        targets: gfx, alpha: { from: 0.5, to: 1 },
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      })
      this._cpTweens.push(tw)
    }
  }

  _drawCheckpointRings() {
    for (let i = 0; i < CHECKPOINTS.length; i++) {
      if (this._cpDone[i]) continue
      const cp  = CHECKPOINTS[i]
      const gfx = this._cpGraphics[i]
      gfx.clear()
      const isNext = i === this._nextCP
      const col  = isNext ? 0xf1c40f : 0xaaaaaa
      const fill = isNext ? 0.12 : 0.05
      const lw   = isNext ? 3 : 1.5
      gfx.fillStyle(col, fill)
      gfx.fillCircle(cp.x, cp.y, cp.radius)
      gfx.lineStyle(lw, col, 0.85)
      gfx.strokeCircle(cp.x, cp.y, cp.radius)

      // Arrow guide toward next CP
      if (isNext) {
        const dx = cp.x - this._x, dy = cp.y - this._y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > cp.radius + 30) {
          const nx = dx / dist, ny = dy / dist
          const ax = this._x + nx * 30, ay = this._y + ny * 30
          gfx.lineStyle(2, 0xf1c40f, 0.5)
          gfx.lineBetween(this._x, this._y, ax, ay)
          // arrowhead
          const perp = Math.atan2(ny, nx)
          const as = 7
          gfx.fillStyle(0xf1c40f, 0.6)
          gfx.fillTriangle(
            ax + nx * as,              ay + ny * as,
            ax - nx * as * 0.5 + ny * as * 0.5, ay - ny * as * 0.5 - nx * as * 0.5,
            ax - nx * as * 0.5 - ny * as * 0.5, ay - ny * as * 0.5 + nx * as * 0.5,
          )
        }
      }
    }

    // Dock return zone when all CPs done
    if (this._phase === 'return') {
      this._cpGfx.clear()
      this._cpGfx.lineStyle(2, 0x44ff88, 0.7)
      this._cpGfx.strokeCircle(DOCK.x, DOCK.y, DOCK.radius)
      this._cpGfx.fillStyle(0x44ff88, 0.08)
      this._cpGfx.fillCircle(DOCK.x, DOCK.y, DOCK.radius)
    } else {
      this._cpGfx.clear()
    }
  }

  _drawDockZone() {
    // Subtle start ring (always visible at dock)
    if (this._phase === 'paddling') {
      this._cpGfx.clear()
      this._cpGfx.lineStyle(1.5, 0x88aacc, 0.3)
      this._cpGfx.strokeCircle(DOCK.x, DOCK.y, DOCK.radius)
    }
  }

  _hitCheckpoint(idx) {
    this._cpDone[idx] = true
    this._nextCP++

    // Flash ring green then hide
    const gfx = this._cpGraphics[idx]
    const lbl = this._cpLabels[idx]
    this.tweens.killTweensOf(gfx)
    gfx.clear()
    gfx.fillStyle(0x44ff88, 0.35)
    gfx.fillCircle(CHECKPOINTS[idx].x, CHECKPOINTS[idx].y, CHECKPOINTS[idx].radius)
    gfx.lineStyle(3, 0x44ff88, 1)
    gfx.strokeCircle(CHECKPOINTS[idx].x, CHECKPOINTS[idx].y, CHECKPOINTS[idx].radius)

    this.tweens.add({
      targets: [gfx, lbl], alpha: 0,
      duration: 600, delay: 200,
      onComplete: () => { gfx.setVisible(false); lbl.setVisible(false) },
    })

    // Flash text
    const flash = this.add.text(CHECKPOINTS[idx].x, CHECKPOINTS[idx].y - 30, '✓', {
      fontSize: '28px', fontFamily: 'monospace', color: '#44ff88',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10).setAlpha(0)
    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 }, y: flash.y - 24,
      duration: 300, hold: 400, yoyo: true,
      onComplete: () => flash.destroy(),
    })

    // Activate Hungarian Navy after CP1
    if (idx === 0) {
      for (const boat of this._navyBoats) boat.active = true
      this._showBanner('⚠️ HUNGARIAN NAVY SPOTTED!', '#ee4444')
      this.time.delayedCall(2200, () => {
        if (this._phase !== 'result') this._showBanner('Head to checkpoint 2!', '#aaddff')
      })
    }

    if (this._nextCP >= 5) {
      this._phase = 'return'
      this._showBanner('Head back to the dock! 🏁', '#f1c40f')
    }
  }

  _showBanner(text, color) {
    const b = this.add.text(W / 2, H / 2 - 40, text, {
      fontSize: '20px', fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 4,
      backgroundColor: '#000000aa',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setDepth(12).setAlpha(0)
    this.tweens.add({
      targets: b,
      alpha: { from: 0, to: 1 },
      duration: 300, hold: 1800, yoyo: true,
      onComplete: () => b.destroy(),
    })
  }

  // ── PLAYER ────────────────────────────────────────────────────────────────

  _drawPlayer() {
    const g = this._playerGfx
    g.clear()

    const cx = this._x, cy = this._y
    const ang = this._angle

    // Hit flash overlay
    if (this._hitFlash > 0 && Math.floor(this._hitFlash / 3) % 2 === 0) {
      g.fillStyle(0xff2200, 0.55)
      g.fillCircle(cx, cy, PLAYER_R + 8)
    }

    // Board shadow
    g.fillStyle(0x000000, 0.22)
    g.fillEllipse(cx + 2, cy + 2, 54, 14)

    // Board (rotated elongated rect — approximate with transform)
    const blen = 26, bwid = 6
    const cos = Math.cos(ang), sin = Math.sin(ang)
    const pts = [
      { x: cx + cos * blen - sin * bwid, y: cy + sin * blen + cos * bwid },
      { x: cx + cos * blen + sin * bwid, y: cy + sin * blen - cos * bwid },
      { x: cx - cos * blen + sin * bwid, y: cy - sin * blen - cos * bwid },
      { x: cx - cos * blen - sin * bwid, y: cy - sin * blen + cos * bwid },
    ]
    // Board fill
    g.fillStyle(0xc89850)
    g.fillPoints(pts, true)
    // Board stripe
    g.fillStyle(0xe04030, 0.7)
    const smid = 8
    const stripe = [
      { x: cx + cos * smid - sin * bwid, y: cy + sin * smid + cos * bwid },
      { x: cx + cos * smid + sin * bwid, y: cy + sin * smid - cos * bwid },
      { x: cx - cos * smid + sin * bwid, y: cy - sin * smid - cos * bwid },
      { x: cx - cos * smid - sin * bwid, y: cy - sin * smid + cos * bwid },
    ]
    g.fillPoints(stripe, true)
    // Board outline
    g.lineStyle(1, 0x5a3010, 0.8)
    g.strokePoints(pts, true)

    // Rider (top-down: body dot + head)
    g.fillStyle(0x1a3a6a)
    g.fillCircle(cx - cos * 4, cy - sin * 4, 5.5)  // body
    g.fillStyle(0xf2c88a)
    g.fillCircle(cx - cos * 4, cy - sin * 4, 4)    // head skin
    // Red cap on head
    g.fillStyle(0xd82018)
    g.fillCircle(cx - cos * 4, cy - sin * 4, 3)

    // Paddle arm (shown briefly after stroke)
    if (this._paddleAnim > 0) {
      const ext    = this._paddleAnim > 8 ? 22 : 14
      const side   = this._paddleSide
      const perpX  = -sin * side
      const perpY  =  cos * side
      const armX   = cx + perpX * ext
      const armY   = cy + perpY * ext
      // shaft
      g.lineStyle(2.5, 0xb08040, 0.9)
      g.lineBetween(cx, cy, armX, armY)
      // blade
      g.fillStyle(0xc09050, 0.85)
      g.fillEllipse(armX, armY, 9, 14)
    }

    // Speed wake (ripples behind board)
    if (this._speed > 0.5) {
      const wakeStr = Math.min(this._speed / this._maxSpeed, 1)
      for (let wi = 0; wi < 2; wi++) {
        const wd = 12 + wi * 9
        const wx = cx - cos * wd
        const wy = cy - sin * wd
        g.lineStyle(1, 0xaaddee, (0.35 - wi * 0.12) * wakeStr)
        g.strokeCircle(wx, wy, 4 + wi * 3)
      }
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD() {
    // Timer
    this._timerText = this.add.text(14, 14, '⏱ 0:00', {
      fontSize: '16px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(20)

    // Lives display
    this._livesText = this.add.text(14, 36, '❤️ ❤️ ❤️ ❤️ ❤️', {
      fontSize: '16px', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(20)

    // CP progress
    this._cpProgressText = this.add.text(W / 2, 14, '○ → ○ → ○ → ○ → ○ → 🏁', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20)

    // Speed bar label
    this.add.text(W - 14, 14, 'SPD', {
      fontSize: '11px', fontFamily: 'monospace', color: '#667788',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(20)

    // Speed bar segments
    this._speedSegs = []
    for (let i = 0; i < 5; i++) {
      const seg = this.add.rectangle(W - 14 - i * 14, 32, 10, 8, 0x334455)
        .setScrollFactor(0).setDepth(20)
      this._speedSegs.unshift(seg)
    }

    // Boost indicator
    this._boostLabel = this.add.text(14, 58, '⚡ BOOST  READY', {
      fontSize: '13px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(20)

    // Bottom hint
    this.add.text(W / 2, H - 14, '[ ↑ ] Paddle   [ ← → ] Steer   [ SPACE ] Boost   [ ESC ] Quit', {
      fontSize: '11px', fontFamily: 'monospace', color: '#556677',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20)
  }

  _updateHUD() {
    const secs = Math.floor(this._elapsed / 1000)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    this._timerText.setText(`⏱ ${m}:${String(s).padStart(2, '0')}`)

    // CP progress dots
    const dots = ['○', '○', '○', '○', '○']
    for (let i = 0; i < 5; i++) {
      if (this._cpDone[i]) dots[i] = '●'
      else if (i === this._nextCP) dots[i] = '◉'
    }
    const ret = this._phase === 'return' ? '🏁' : '🏁'
    this._cpProgressText.setText(dots.join(' → ') + ' → ' + ret)
    this._cpProgressText.setColor(this._phase === 'return' ? '#f1c40f' : '#aaaaaa')

    // Lives
    const hearts = '❤️ '.repeat(this._lives).trim() + ' 🖤'.repeat(5 - this._lives)
    this._livesText.setText(hearts.trim())

    // Boost cooldown
    const now = this.time.now
    if (now >= this._boostNext) {
      this._boostLabel.setText('⚡ BOOST  READY').setColor('#f1c40f')
    } else {
      const secsLeft = Math.ceil((this._boostNext - now) / 1000)
      this._boostLabel.setText(`⚡ BOOST  ${secsLeft}s`).setColor('#556677')
    }

    // Speed bar
    const filled = Math.round((this._speed / this._maxSpeed) * 5)
    for (let i = 0; i < 5; i++) {
      const col = i < filled
        ? (filled >= 4 ? 0x44ff88 : filled >= 2 ? 0xf1c40f : 0xff8844)
        : 0x223344
      this._speedSegs[i].setFillStyle(col)
    }
  }

  // ── INPUT ─────────────────────────────────────────────────────────────────

  _bindKeys() {
    this._cursors  = this.input.keyboard.createCursorKeys()
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._escKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this._escKey.on('down', () => {
      if (this._phase === 'result' || this._phase === 'gameover' || this._phase === 'paddling' || this._phase === 'return') {
        this._exit()
      }
    })
  }

  // ── FINISH / RESULT ───────────────────────────────────────────────────────

  _finishRun() {
    this._phase = 'result'

    const secs   = Math.floor(this._elapsed / 1000)
    const m      = Math.floor(secs / 60)
    const s      = secs % 60
    const medal  = MEDALS.find(md => secs < md.secs)
    const timeStr = `${m}:${String(s).padStart(2, '0')}`

    // Overlay
    const px = W / 2, py = H / 2
    this.add.rectangle(px, py, 460, 230, 0x050510, 0.94).setDepth(30)
    this.add.rectangle(px, py, 460, 230, 0x000000, 0)
      .setStrokeStyle(2, 0x4a90d0, 0.8).setDepth(30)

    this.add.text(px, py - 80, `🏄 SUP BOARDING`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#4a90d0',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(31)

    this.add.text(px, py - 42, medal.label, {
      fontSize: '32px', fontFamily: 'monospace', color: medal.color,
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(31)

    this.add.text(px, py + 8, `Time: ${timeStr}`, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(31)

    const thresholds = '🥇 < 0:45   🥈 < 1:00   🥉 < 1:30'
    this.add.text(px, py + 44, thresholds, {
      fontSize: '11px', fontFamily: 'monospace', color: '#667788',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(31)

    this.add.text(px, py + 80, '[ ESC ]  Back to the mökki', {
      fontSize: '13px', fontFamily: 'monospace', color: '#888888',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(31)
  }

  // ── EXIT ──────────────────────────────────────────────────────────────────

  _exit() {
    if (this._exiting) return
    this._exiting = true
    this.scene.get('GameScene')?.events.emit('result:sup', { time: this._elapsed })
    this.cameras.main.fadeOut(350, 0, 0, 0)
    this.time.delayedCall(370, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
