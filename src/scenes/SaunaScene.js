import Phaser from 'phaser'
import { CHARACTERS } from '../data/characters.js'

const W = 900
const H = 600

const HEAD = {
  nikkebre: { x: 450, y: 150 },
  jon:      { x: 255, y: 238 },
  edu:      { x: 645, y: 238 },
  player:   { x: 450, y: 440 },
}

const BUCKET_X = 762
const BUCKET_Y = 168
const CAN_HOME   = { x: 756, y: 186 }
const CAN_PLAYER = { x: 466, y: 412 }

// Bench seat tops (depth 2 — behind bodies)
const TOP_SEAT_Y  = 172
const MID_SEAT_Y  = 256
const LOW_SEAT_Y  = 454

// Bench front lips (depth 4 — in front of bodies, occludes lower body)
const TOP_LIP_Y   = 190
const TOP_LIP_H   = 46
const MID_LIP_Y   = 276
const MID_LIP_H   = 46
const LOW_LIP_Y   = 474

const BENCH_X = 50
const BENCH_W = 800

const KIUAS_X = 56
const KIUAS_Y = 456

const GLOW_CX = 94
const GLOW_CY = 528

const MIN_SIP_MS = 500
const MAX_SIP_MS = 3000
const MAX_BEERS  = 5

const NPC_LINES = {
  nikkebre: [
    '"This is the third löyly. Maybe fourth."',
    '"Optimal temperature is 80. Don\'t touch the dial."',
    '"I\'ve been on this bench since... yeah."',
    '"Proper sauna sweat cures everything. Science."',
    '"Löyly time."',
    '"*deep steam breath*"',
  ],
  jon: [
    '"The acoustics in here are incredible."',
    '"Someone say when it\'s too hot. I\'ll never say it\'s too hot."',
    '"We need a speaker in the sauna. I\'m making this happen."',
    '"This is peak mökki existence."',
    '"I could live on this bench forever."',
  ],
  edu: [
    '"I\'ve lost track of how much I\'m sweating."',
    '"Everything hurts. But in a good way."',
    '"In Spain we don\'t do this. We\'re missing out."',
    '"The heat is hitting differently after those beers."',
    '"Can you actually melt? Asking for a friend."',
  ],
}

const DRUNK_LINES = {
  nikkebre: '"Maybe cool down for a sec. You look a bit..."',
  jon:      '"Bro, are you okay? That\'s not all sweat."',
  edu:      '"I think you might actually be dying. Drink water."',
}

export class SaunaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SaunaScene' })
  }

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  preload() {
    if (!this.cache.audio.has('so_damn_hot')) {
      this.load.audio('so_damn_hot', 'assets/sounds/so_damn_hot.mp3')
    }
  }

  create() {
    this._phase        = 'sitting'
    this._beersLeft    = MAX_BEERS
    this._goodSips     = 0
    this._isHolding    = false
    this._holdStartMs  = 0
    this._inCooldown   = false
    this._commentTimer = null

    this._bgGfx         = this.add.graphics().setDepth(0)
    this._benchBackGfx  = this.add.graphics().setDepth(2)
    this._bodyGfx       = this.add.graphics().setDepth(3)
    this._benchFrontGfx = this.add.graphics().setDepth(4)
    this._headGfx       = this.add.graphics().setDepth(5)
    this._kiuasGfx      = this.add.graphics().setDepth(6)
    this._canGfx        = this.add.graphics().setDepth(8)

    this._drawBackground()
    this._drawBenchSeats()
    this._drawBustBodies()
    this._drawBenchFront()
    this._drawBustHeads()
    this._drawKiuas()
    this._buildTexts()
    this._startSteam()
    this._bindKeys()

    this.cameras.main.fadeIn(400, 0, 0, 0)
    this._scheduleNextComment()

    this._music = this.sound.add('so_damn_hot', { loop: true, volume: 0.55 })
    this._music.play()
  }

  update(time, _delta) {
    if (this._phase !== 'drinking') return

    if (this._isHolding && !this._inCooldown) {
      if (time - this._holdStartMs >= MAX_SIP_MS) {
        this._isHolding = false
        this._releaseSip('chug')
        return
      }
    }

    this._canGfx.clear()
    this._drawCan(CAN_PLAYER.x, CAN_PLAYER.y, this._isHolding, time)
  }

  // ── BACKGROUND ────────────────────────────────────────────────────────────

  _drawBackground() {
    const g = this._bgGfx

    // Full canvas dark wood base
    g.fillStyle(0x0e0804)
    g.fillRect(0, 0, W, H)

    // Ceiling planks (top 65px)
    for (let i = 0; i < 5; i++) {
      g.fillStyle(i % 2 === 0 ? 0x2a1608 : 0x201006)
      g.fillRect(0, i * 13, W, 13)
    }
    g.lineStyle(1, 0x0a0602, 0.65)
    for (let i = 1; i <= 5; i++) {
      g.beginPath()
      g.moveTo(0, i * 13)
      g.lineTo(W, i * 13)
      g.strokePath()
    }

    // Back wall (vertical slats from ceiling to top bench)
    g.fillStyle(0x190d06)
    g.fillRect(0, 65, W, TOP_SEAT_Y - 65)
    g.lineStyle(1, 0x0e0804, 0.4)
    for (let x = 65; x < W; x += 18) {
      g.beginPath()
      g.moveTo(x, 65)
      g.lineTo(x, TOP_SEAT_Y)
      g.strokePath()
    }

    // Floor strip between top-bench lip and mid-bench seat
    const fY1 = TOP_LIP_Y + TOP_LIP_H
    const fH1 = MID_SEAT_Y - fY1
    if (fH1 > 0) {
      g.fillStyle(0x140c04)
      g.fillRect(0, fY1, W, fH1)
      g.lineStyle(1, 0x0a0602, 0.4)
      for (let py = fY1 + 7; py < fY1 + fH1; py += 13) {
        g.beginPath()
        g.moveTo(0, py)
        g.lineTo(W, py)
        g.strokePath()
      }
    }

    // Floor strip between mid-bench lip and low-bench seat
    const fY2 = MID_LIP_Y + MID_LIP_H
    const fH2 = LOW_SEAT_Y - fY2
    if (fH2 > 0) {
      g.fillStyle(0x140c04)
      g.fillRect(0, fY2, W, fH2)
      g.lineStyle(1, 0x0a0602, 0.4)
      for (let py = fY2 + 7; py < fY2 + fH2; py += 13) {
        g.beginPath()
        g.moveTo(0, py)
        g.lineTo(W, py)
        g.strokePath()
      }
    }

    // Warm kiuas glow (bottom-left amber halo)
    for (let i = 8; i > 0; i--) {
      g.fillStyle(0xc84000, 0.006 + i * 0.004)
      g.fillEllipse(GLOW_CX, GLOW_CY, 240 + i * 58, 180 + i * 42)
    }
  }

  // ── BENCH SEATS (depth 2 — behind bodies) ─────────────────────────────────

  _drawBenchSeats() {
    const g = this._benchBackGfx
    const seats = [
      [TOP_SEAT_Y, 22],
      [MID_SEAT_Y, 22],
      [LOW_SEAT_Y, 24],
    ]
    for (const [sy, sh] of seats) {
      g.fillStyle(0x6a3c18)
      g.fillRect(BENCH_X, sy, BENCH_W, sh)
      g.fillStyle(0x7e4820, 0.5)
      g.fillRect(BENCH_X, sy, BENCH_W, 5)
      g.lineStyle(1, 0x4a2810, 0.55)
      for (let x = BENCH_X + 20; x < BENCH_X + BENCH_W; x += 22) {
        g.beginPath()
        g.moveTo(x, sy)
        g.lineTo(x, sy + sh)
        g.strokePath()
      }
    }
  }

  // ── BUST BODIES (depth 3) ─────────────────────────────────────────────────

  _drawBustBodies() {
    const g = this._bodyGfx
    this._drawBody(g, HEAD.nikkebre, CHARACTERS.NIKKEBRE)
    this._drawBody(g, HEAD.jon,      CHARACTERS.JON)
    this._drawBody(g, HEAD.edu,      CHARACTERS.EDU)
    const pp = HEAD.player
    g.fillStyle(0x3070d0)
    g.fillRoundedRect(pp.x - 22, pp.y + 16, 44, 30, { tl: 4, tr: 4, bl: 8, br: 8 })
  }

  _drawBody(g, pos, charData) {
    const chubby = charData.isChubby
    const r  = chubby ? 24 : 20
    const bw = chubby ? 56 : 44
    g.fillStyle(charData.bodyColor)
    g.fillRoundedRect(pos.x - bw / 2, pos.y + r - 4, bw, 30, { tl: 4, tr: 4, bl: 8, br: 8 })
  }

  // ── BENCH FRONT LIPS (depth 4 — occludes lower bodies) ────────────────────

  _drawBenchFront() {
    const g = this._benchFrontGfx

    // Top bench front face
    g.fillStyle(0x4a2808)
    g.fillRect(BENCH_X, TOP_LIP_Y, BENCH_W, TOP_LIP_H)
    g.fillStyle(0x000000, 0.2)
    g.fillRect(BENCH_X, TOP_LIP_Y + TOP_LIP_H - 5, BENCH_W, 5)

    // Middle bench front face
    g.fillStyle(0x4a2808)
    g.fillRect(BENCH_X, MID_LIP_Y, BENCH_W, MID_LIP_H)
    g.fillStyle(0x000000, 0.2)
    g.fillRect(BENCH_X, MID_LIP_Y + MID_LIP_H - 5, BENCH_W, 5)

    // Lower bench front face + floor to screen bottom
    g.fillStyle(0x3a1e06)
    g.fillRect(BENCH_X, LOW_LIP_Y, BENCH_W, H - LOW_LIP_Y)
    // Side strips (outside bench)
    g.fillStyle(0x140c04)
    g.fillRect(0, LOW_LIP_Y, BENCH_X, H - LOW_LIP_Y)
    g.fillRect(BENCH_X + BENCH_W, LOW_LIP_Y, W - BENCH_X - BENCH_W, H - LOW_LIP_Y)
  }

  // ── BUST HEADS (depth 5) ──────────────────────────────────────────────────

  _drawBustHeads() {
    const g = this._headGfx
    this._drawHead(g, HEAD.nikkebre, CHARACTERS.NIKKEBRE)
    this._drawHead(g, HEAD.jon,      CHARACTERS.JON)
    this._drawHead(g, HEAD.edu,      CHARACTERS.EDU)
    this._drawPlayerHead(g, HEAD.player)
    this._drawBucketGfx(g)

    const ns = { fontSize: '11px', fontFamily: 'monospace', color: '#d8d8d8', stroke: '#000', strokeThickness: 3 }
    this.add.text(HEAD.nikkebre.x, HEAD.nikkebre.y - 34, 'Nikkebre', ns).setOrigin(0.5, 1).setDepth(6)
    this.add.text(HEAD.jon.x,      HEAD.jon.y      - 30, 'Jon',      ns).setOrigin(0.5, 1).setDepth(6)
    this.add.text(HEAD.edu.x,      HEAD.edu.y      - 30, 'Edu',      ns).setOrigin(0.5, 1).setDepth(6)
    this.add.text(HEAD.player.x,   HEAD.player.y   - 30, 'You',      ns).setOrigin(0.5, 1).setDepth(6)
  }

  _drawHead(g, pos, charData) {
    const chubby = charData.isChubby
    const r    = chubby ? 24 : 20
    const skin = charData.isYellow ? 0xf0c030 : 0xf2c88a
    const cx = pos.x, cy = pos.y

    g.fillStyle(0x000000, 0.18)
    g.fillCircle(cx + 2, cy + 2, r)
    g.fillStyle(skin)
    g.fillCircle(cx, cy, r)

    g.fillStyle(charData.color)
    g.fillEllipse(cx, cy - r * 0.48, r * 1.9, r * 0.85)

    const eyeS = r * 0.36
    const eyeY = cy + 2
    g.fillStyle(0x111111)
    g.fillCircle(cx - eyeS, eyeY, chubby ? 3.5 : 2.8)
    g.fillCircle(cx + eyeS, eyeY, chubby ? 3.5 : 2.8)

    if (charData.id === 'nikkebre') {
      g.fillStyle(skin, 0.68)
      g.fillEllipse(cx - eyeS, eyeY - 1.5, 7.5, 3.5)
      g.fillEllipse(cx + eyeS, eyeY - 1.5, 7.5, 3.5)
    }

    g.fillStyle(0xffffff, 0.55)
    g.fillCircle(cx - eyeS - 1, eyeY - 1, 1)
    g.fillCircle(cx + eyeS - 1, eyeY - 1, 1)

    g.lineStyle(1.5, 0x1a1a1a, 0.45)
    g.strokeCircle(cx, cy, r)
  }

  _drawPlayerHead(g, pos) {
    const r  = 20
    const cx = pos.x, cy = pos.y

    g.fillStyle(0x000000, 0.18)
    g.fillCircle(cx + 2, cy + 2, r)
    g.fillStyle(0xf2c88a)
    g.fillCircle(cx, cy, r)

    g.fillStyle(0xd82018)
    g.fillEllipse(cx, cy - r * 0.52, r * 2.2, r * 0.76)
    g.fillRoundedRect(cx - r * 0.82, cy - r - 3, r * 1.64, r * 0.6, 3)

    g.fillStyle(0x111111)
    g.fillCircle(cx - 6, cy + 3, 2.5)
    g.fillCircle(cx + 6, cy + 3, 2.5)
    g.fillStyle(0xffffff, 0.55)
    g.fillCircle(cx - 7, cy + 2, 1)
    g.fillCircle(cx + 5, cy + 2, 1)

    g.lineStyle(1.5, 0x1a1a1a, 0.45)
    g.strokeCircle(cx, cy, r)
  }

  // ── BEER BUCKET ───────────────────────────────────────────────────────────

  _drawBucketGfx(g) {
    const x = BUCKET_X, y = BUCKET_Y

    // Wooden body
    g.fillStyle(0x7a4820)
    g.fillRoundedRect(x - 24, y - 10, 48, 42, 5)
    g.fillStyle(0x9a5c28, 0.45)
    g.fillRoundedRect(x - 20, y - 8, 40, 14, 4)

    // Metal hoop rings
    g.lineStyle(2.5, 0x888888, 0.85)
    g.strokeEllipse(x, y + 4, 48, 14)
    g.strokeEllipse(x, y + 24, 48, 14)

    // Dark interior
    g.fillStyle(0x120804)
    g.fillEllipse(x, y - 6, 38, 10)

    // Two cans visible in bucket
    g.fillStyle(0xbbbbbb)
    g.fillRoundedRect(x - 10, y - 20, 12, 22, 2)
    g.fillStyle(0xcc3300)
    g.fillRect(x - 10, y - 13, 12, 9)
    g.fillStyle(0xbbbbbb)
    g.fillRoundedRect(x + 2, y - 17, 11, 18, 2)
    g.fillStyle(0xcc3300)
    g.fillRect(x + 2, y - 11, 11, 8)

    this.add.text(x, y + 40, '🍺 BUCKET', {
      fontSize: '10px', fontFamily: 'monospace',
      color: '#c89060', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6)
  }

  // ── KIUAS ─────────────────────────────────────────────────────────────────

  _drawKiuas() {
    const g  = this._kiuasGfx
    const kx = KIUAS_X, ky = KIUAS_Y

    // Stove body
    g.fillStyle(0x202020)
    g.fillRect(kx, ky, 76, 82)
    g.fillStyle(0x2c2c2c)
    g.fillRect(kx + 2, ky + 2, 72, 76)

    // Stone tray on top
    g.fillStyle(0x272727)
    g.fillRect(kx - 4, ky - 20, 84, 24)
    g.fillStyle(0x1a1a1a)
    g.fillRect(kx - 4, ky - 20, 84, 4)

    // Stones
    const stones = [
      [kx + 8,  ky - 10, 8],
      [kx + 22, ky - 12, 7],
      [kx + 37, ky - 8,  9],
      [kx + 51, ky - 11, 7],
      [kx + 63, ky - 9,  8],
      [kx + 15, ky - 3,  6],
      [kx + 43, ky - 3,  6],
    ]
    for (const [sx, sy, sr] of stones) {
      g.fillStyle(0x585858)
      g.fillCircle(sx, sy, sr)
      g.fillStyle(0x888888, 0.45)
      g.fillCircle(sx - 2, sy - 2, sr * 0.4)
    }

    // Ember static
    g.fillStyle(0xd84000, 0.62)
    g.fillRect(kx + 8, ky + 52, 60, 24)
    g.fillStyle(0xff8800, 0.35)
    g.fillRect(kx + 14, ky + 58, 48, 12)

    // Door grate lines
    g.lineStyle(2, 0x141414, 0.9)
    for (let gx = kx + 12; gx < kx + 70; gx += 10) {
      g.beginPath()
      g.moveTo(gx, ky + 52)
      g.lineTo(gx, ky + 76)
      g.strokePath()
    }

    // Animated ember flicker
    const ember = this.add.graphics().setDepth(7)
    ember.fillStyle(0xff5500, 0.65)
    ember.fillRect(kx + 8, ky + 52, 60, 24)
    this.tweens.add({
      targets: ember,
      alpha: { from: 0.28, to: 0.82 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.add.text(kx + 38, ky + 88, 'KIUAS', {
      fontSize: '9px', fontFamily: 'monospace',
      color: '#806040', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(7)
  }

  // ── STEAM ─────────────────────────────────────────────────────────────────

  _startSteam() {
    this.time.addEvent({
      delay: 650,
      callback: this._puffSteam,
      callbackScope: this,
      loop: true,
    })
    this._puffSteam()
  }

  _puffSteam() {
    const g  = this.add.graphics().setDepth(6).setAlpha(0)
    const ox = (Math.random() - 0.5) * 46
    const sx = KIUAS_X + 38 + ox
    const sy = KIUAS_Y - 16
    const r  = 5 + Math.random() * 9
    g.fillStyle(0xe0c090, 0.18)
    g.fillCircle(0, 0, r)
    g.x = sx
    g.y = sy
    this.tweens.add({
      targets: g,
      y: sy - 55 - Math.random() * 42,
      x: sx + (Math.random() - 0.5) * 22,
      alpha: { from: 0.46, to: 0 },
      scaleX: 2.6,
      scaleY: 2.6,
      duration: 2100 + Math.random() * 800,
      ease: 'Sine.easeOut',
      onComplete: () => g.destroy(),
    })
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildTexts() {
    this.add.text(W / 2, 26, '🧖  S A U N A', {
      fontSize: '22px', fontFamily: 'monospace',
      color: '#d08040', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)

    this._beerText = this.add.text(30, H - 44, `🍺 ×${this._beersLeft}`, {
      fontSize: '18px', fontFamily: 'monospace',
      color: '#f0c040', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(10)

    this._hintText = this.add.text(W / 2, H - 44, '[ E ] grab beer   [ ESC ] climb out   [ X ] go to Palju', {
      fontSize: '13px', fontFamily: 'monospace',
      color: '#888888', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10)

    this._sipHintText = this.add.text(W / 2, H - 44, 'Hold  [ SPACE ]  to sip', {
      fontSize: '14px', fontFamily: 'monospace',
      color: '#aaaaaa', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10).setVisible(false)
  }

  // ── INPUT ─────────────────────────────────────────────────────────────────

  _bindKeys() {
    const E = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    E.on('down', () => {
      if (this._phase === 'sitting' && this._beersLeft > 0 && !this._inCooldown) {
        this._grabBeer()
      }
    })

    const ESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    ESC.on('down', () => {
      if (this._phase === 'sitting') this._exit()
    })

    const X = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
    X.on('down', () => {
      if (this._phase === 'sitting') this._goToPalju()
    })

    const SPACE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    SPACE.on('down', () => {
      if (this._phase !== 'drinking' || this._inCooldown) return
      this._isHolding   = true
      this._holdStartMs = this.time.now
    })
    SPACE.on('up', () => {
      if (!this._isHolding) return
      this._isHolding = false
      const held = this.time.now - this._holdStartMs
      this._releaseSip(held < MIN_SIP_MS ? 'too_short' : 'good')
    })
  }

  // ── BEER MECHANIC ─────────────────────────────────────────────────────────

  _grabBeer() {
    this._phase = 'reaching'
    this._hintText.setVisible(false)

    const obj = { t: 0 }
    this.tweens.add({
      targets: obj,
      t: 1,
      duration: 380,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this._canGfx.clear()
        const cx = CAN_HOME.x + (CAN_PLAYER.x - CAN_HOME.x) * obj.t
        const cy = CAN_HOME.y + (CAN_PLAYER.y - CAN_HOME.y) * obj.t
        this._drawCan(cx, cy, false, this.time.now)
      },
      onComplete: () => {
        this._phase      = 'drinking'
        this._isHolding  = false
        this._inCooldown = false
        this._sipHintText.setVisible(true)
      },
    })
  }

  _releaseSip(type) {
    if (this._inCooldown) return
    this._inCooldown = true
    this._isHolding  = false

    const npcs  = ['nikkebre', 'jon', 'edu']
    const gs    = this.scene.get('GameScene')
    const drunk = gs && gs.player ? gs.player.drunkLevel : 0

    if (type === 'too_short') {
      this._showComment(Phaser.Utils.Array.GetRandom(npcs), '"Ota kunnolla."')
    } else {
      this._goodSips++
      this._beersLeft--
      this._beerText.setText(`🍺 ×${this._beersLeft}`)
      this._spawnFoam()
      if (drunk >= 7) {
        const npc = Phaser.Utils.Array.GetRandom(npcs)
        this._showComment(npc, DRUNK_LINES[npc])
      }
    }

    this.time.delayedCall(1200, () => {
      this._phase = 'sitting'
      this._sipHintText.setVisible(false)
      this._hintText.setVisible(true)
      this._canGfx.clear()

      if (this._beersLeft <= 0) {
        this._showComment('nikkebre', '"That\'s enough. Kippis."')
        this.time.delayedCall(2200, () => this._exit())
      } else {
        this._inCooldown = false
      }
    })
  }

  _spawnFoam() {
    for (let i = 0; i < 6; i++) {
      const fg = this.add.graphics().setDepth(9)
      const ox = (Math.random() - 0.5) * 42
      fg.fillStyle(0xffffff, 0.5 - i * 0.05)
      fg.fillCircle(0, 0, 4 + i * 2)
      fg.x = CAN_PLAYER.x + ox
      fg.y = CAN_PLAYER.y - 8
      this.tweens.add({
        targets: fg,
        x: fg.x + ox * 1.5,
        y: fg.y - 48 - Math.random() * 24,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 470 + i * 72,
        delay: i * 42,
        ease: 'Sine.easeOut',
        onComplete: () => fg.destroy(),
      })
    }
  }

  // ── SPEECH BUBBLES ────────────────────────────────────────────────────────

  _showComment(npcId, text) {
    const pos   = HEAD[npcId] || HEAD.nikkebre
    const color = npcId === 'nikkebre' ? '#7dcea0'
                : npcId === 'jon'      ? '#9b59b6'
                :                        '#e91e8c'

    const qt = this.add.text(pos.x, pos.y - 36, text, {
      fontSize: '13px', fontFamily: 'monospace',
      color,
      backgroundColor: '#00000099',
      padding: { x: 10, y: 5 },
      stroke: '#000000', strokeThickness: 1,
      wordWrap: { width: 270 },
      align: 'center',
    }).setOrigin(0.5, 1).setDepth(12).setAlpha(0)

    this.tweens.add({
      targets: qt,
      alpha: { from: 0, to: 1 },
      y: { from: pos.y - 36, to: pos.y - 56 },
      duration: 280,
      hold: 1900,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => qt.destroy(),
    })
  }

  _scheduleNextComment() {
    const delay = 4200 + Math.random() * 4800
    this._commentTimer = this.time.delayedCall(delay, () => {
      if (!this.scene.isActive('SaunaScene')) return
      const npc = Phaser.Utils.Array.GetRandom(['nikkebre', 'jon', 'edu'])
      this._showComment(npc, Phaser.Utils.Array.GetRandom(NPC_LINES[npc]))
      this._scheduleNextComment()
    })
  }

  // ── CAN ───────────────────────────────────────────────────────────────────

  _drawCan(cx, cy, isHolding, time) {
    const g = this._canGfx
    const cw = 18, ch = 40

    g.fillStyle(0x000000, 0.14)
    g.fillRoundedRect(cx - cw / 2 + 2, cy - ch / 2 + 2, cw, ch, 3)

    g.fillStyle(0xcccccc)
    g.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 3)

    g.fillStyle(0xcc3300)
    g.fillRect(cx - cw / 2, cy - 7, cw, 14)
    g.fillStyle(0xff6600, 0.48)
    g.fillRect(cx - cw / 2, cy - 7, cw, 4)

    g.fillStyle(0xaaaaaa)
    g.fillRoundedRect(cx - cw / 2 + 2, cy - ch / 2, cw - 4, 5, 2)

    g.fillStyle(0x888888)
    g.fillRoundedRect(cx - 4, cy - ch / 2 - 2, 8, 4, 1)

    if (isHolding) {
      for (let bi = 0; bi < 3; bi++) {
        const bp = ((time / 280 + bi * 0.85) % 1)
        const bx = cx + Math.sin(time / 200 + bi * 1.5) * 5
        const by = cy - ch / 2 - 5 - bp * 18
        g.fillStyle(0xffffff, (1 - bp) * 0.58)
        g.fillCircle(bx, by, 1.8 + bi)
      }
      const frac   = Math.min((time - this._holdStartMs) / MAX_SIP_MS, 1)
      const arcCol = frac > 0.82 ? 0xff2200 : frac > 0.52 ? 0xff8800 : 0x44aaff
      g.lineStyle(2.5, arcCol, 0.76)
      g.beginPath()
      g.arc(cx, cy - ch / 2 + 2, 13, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false)
      g.strokePath()
    }
  }

  // ── CROSS-NAVIGATION ──────────────────────────────────────────────────────

  _goToPalju() {
    this._music?.stop()
    if (this._commentTimer) this._commentTimer.remove()
    const gs = this.scene.get('GameScene')
    if (gs && gs.player) {
      for (let i = 0; i < this._goodSips; i++) gs.player.addDrink()
    }
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(330, () => {
      this.scene.launch('PaljuScene')
      this.scene.stop()
    })
  }

  // ── EXIT ──────────────────────────────────────────────────────────────────

  _exit() {
    this._music?.stop()
    if (this._commentTimer) this._commentTimer.remove()
    const gs = this.scene.get('GameScene')
    if (gs && gs.player) {
      for (let i = 0; i < this._goodSips; i++) gs.player.addDrink()
    }
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.time.delayedCall(450, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
