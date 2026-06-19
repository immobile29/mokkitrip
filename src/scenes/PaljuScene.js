import Phaser from 'phaser'
import { CHARACTERS } from '../data/characters.js'

const W = 900
const H = 600

const TUB_CX = 450
const TUB_CY = 285
const TUB_RX = 198
const TUB_RY = 138
const WAT_RX = 158
const WAT_RY = 108

const HEAD = {
  nikkebre: { x: TUB_CX,       y: TUB_CY - 145 },
  jon:      { x: TUB_CX - 148, y: TUB_CY - 47  },
  edu:      { x: TUB_CX + 148, y: TUB_CY - 47  },
  player:   { x: TUB_CX,       y: TUB_CY + 148 },
}

const COOLER_X = 714
const COOLER_Y = 158
const CAN_HOME   = { x: COOLER_X - 8, y: COOLER_Y + 12 }
const CAN_PLAYER = { x: HEAD.player.x + 14, y: HEAD.player.y - 28 }

const MIN_SIP_MS = 500
const MAX_SIP_MS = 3000
const MAX_BEERS  = 5

const NPC_LINES = {
  nikkebre: [
    '"I think I\'ve been in here for... yeah. Three hours."',
    '"The water is perfect. Don\'t touch the dial."',
    '"...paljussa on hyvä olla."',
    '"I can see why fish are so chill."',
    '"*happy splashing sounds*"',
    '"Mmm. Yeah."',
  ],
  jon: [
    '"We should put speakers out here. Next year."',
    '"The acoustics in a hot tub are underrated."',
    '"Someone grab me a beer while you\'re at it."',
    '"This is peak mökki. I\'m serious."',
    '"The bass would hit different out here."',
  ],
  edu: [
    '"This is literally paradise."',
    '"I feel like a Greek god. A very sweaty one."',
    '"Hot tubs fix everything. This is science."',
    '"Why don\'t we just... live in here?"',
    '"Someone light a candle. We need candles."',
  ],
}

const DRUNK_LINES = {
  nikkebre: '"Bro... you okay in there?"',
  jon:      '"Maybe drink some water. Like, actual water."',
  edu:      '"You\'re giving me anxiety. Drink slowly."',
}

export class PaljuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PaljuScene' })
  }

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  create() {
    this._phase       = 'sitting'
    this._beersLeft   = MAX_BEERS
    this._goodSips    = 0
    this._isHolding   = false
    this._holdStartMs = 0
    this._inCooldown  = false
    this._commentTimer = null

    this._bgGfx       = this.add.graphics().setDepth(0)
    this._tubGfx      = this.add.graphics().setDepth(2)
    this._bodyGfx     = this.add.graphics().setDepth(3)
    this._waterGfx    = this.add.graphics().setDepth(4)
    this._headGfx     = this.add.graphics().setDepth(5)
    this._canGfx      = this.add.graphics().setDepth(7)

    this._drawBackground()
    this._drawTubOuter()
    this._drawBustBodies()
    this._drawWater()
    this._drawBustHeads()
    this._drawCoolerGfx()
    this._buildTexts()
    this._startSteam()
    this._bindKeys()

    this.cameras.main.fadeIn(400, 0, 0, 0)
    this._scheduleNextComment()
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
    g.fillStyle(0x080e18)
    g.fillRect(0, 0, W, H)

    // Stars (seeded for consistency)
    const rng = new Phaser.Math.RandomDataGenerator(['palju42'])
    for (let i = 0; i < 48; i++) {
      const sx = rng.integerInRange(0, W)
      const sy = rng.integerInRange(0, Math.round(H * 0.42))
      g.fillStyle(0xffffff, 0.2 + rng.frac() * 0.55)
      g.fillCircle(sx, sy, rng.frac() < 0.75 ? 1 : 1.5)
    }

    // Ambient hot-tub cyan glow
    for (let i = 7; i > 0; i--) {
      g.fillStyle(0x18a8c8, 0.008 + i * 0.005)
      g.fillEllipse(TUB_CX, TUB_CY, TUB_RX * 2 + i * 52, TUB_RY * 2 + i * 36)
    }

    // Wooden deck floor below tub
    const deckTop = TUB_CY + TUB_RY + 14
    g.fillStyle(0x1c1208)
    g.fillRect(0, deckTop, W, H - deckTop)
    for (let py = deckTop + 4; py < H - 10; py += 13) {
      g.fillStyle(0x2a1c0c, 0.55)
      g.fillRect(0, py, W, 7)
    }
  }

  // ── TUB BARREL ────────────────────────────────────────────────────────────

  _drawTubOuter() {
    const g = this._tubGfx
    const cx = TUB_CX, cy = TUB_CY

    // Drop shadow
    g.fillStyle(0x000000, 0.28)
    g.fillEllipse(cx + 9, cy + 12, TUB_RX * 2 + 6, TUB_RY * 2 + 6)

    // Outer barrel body (dark wood)
    g.fillStyle(0x3d2008)
    g.fillEllipse(cx, cy, TUB_RX * 2, TUB_RY * 2)

    // Wood grain highlight
    g.fillStyle(0x5a3212, 0.55)
    g.fillEllipse(cx - 10, cy - 14, TUB_RX * 2 - 28, TUB_RY * 2 - 22)

    // Barrel ring bands
    g.lineStyle(5, 0x241006, 0.9)
    g.strokeEllipse(cx, cy, TUB_RX * 2, TUB_RY * 2)
    g.lineStyle(4, 0x281408, 0.7)
    g.strokeEllipse(cx, cy, TUB_RX * 2 - 34, TUB_RY * 2 - 24)
    g.strokeEllipse(cx, cy, TUB_RX * 2 - 68, TUB_RY * 2 - 48)
  }

  // ── BUST BODIES (drawn under water) ───────────────────────────────────────

  _drawBustBodies() {
    const g = this._bodyGfx
    this._drawBody(g, HEAD.nikkebre, CHARACTERS.NIKKEBRE)
    this._drawBody(g, HEAD.jon,      CHARACTERS.JON)
    this._drawBody(g, HEAD.edu,      CHARACTERS.EDU)
    // Player body
    const pp = HEAD.player
    const pr = 20
    g.fillStyle(0x3070d0)
    g.fillRoundedRect(pp.x - 22, pp.y + pr - 4, 44, 30, { tl: 4, tr: 4, bl: 8, br: 8 })
  }

  _drawBody(g, pos, charData) {
    const chubby = charData.isChubby
    const r = chubby ? 24 : 20
    const bw = chubby ? 56 : 44
    g.fillStyle(charData.bodyColor)
    g.fillRoundedRect(pos.x - bw / 2, pos.y + r - 4, bw, 30, { tl: 4, tr: 4, bl: 8, br: 8 })
  }

  // ── WATER SURFACE (covers lower bust bodies) ───────────────────────────────

  _drawWater() {
    const g = this._waterGfx
    const cx = TUB_CX, cy = TUB_CY

    g.fillStyle(0x1498b8)
    g.fillEllipse(cx, cy, WAT_RX * 2, WAT_RY * 2)

    // Depth darkening
    g.fillStyle(0x0c6888, 0.38)
    g.fillEllipse(cx, cy + 18, WAT_RX * 2 - 44, WAT_RY * 2 - 30)

    // Shimmer highlight
    g.fillStyle(0x80e8f8, 0.11)
    g.fillEllipse(cx - 32, cy - 28, 128, 68)

    // Ripple rings
    g.lineStyle(1.5, 0x90e0f8, 0.22)
    g.strokeEllipse(cx, cy, 200, 136)
    g.strokeEllipse(cx, cy, 120, 82)
    g.strokeEllipse(cx, cy, 52, 36)
  }

  // ── BUST HEADS (drawn above water) ────────────────────────────────────────

  _drawBustHeads() {
    const g = this._headGfx
    this._drawHead(g, HEAD.nikkebre, CHARACTERS.NIKKEBRE)
    this._drawHead(g, HEAD.jon,      CHARACTERS.JON)
    this._drawHead(g, HEAD.edu,      CHARACTERS.EDU)
    this._drawPlayerHead(g, HEAD.player)
    this._drawCoolerGfxOnHead(g)

    const ns = { fontSize: '11px', fontFamily: 'monospace', color: '#d8d8d8', stroke: '#000', strokeThickness: 3 }
    this.add.text(HEAD.nikkebre.x, HEAD.nikkebre.y - 34, 'Nikkebre', ns).setOrigin(0.5, 1).setDepth(6)
    this.add.text(HEAD.jon.x,      HEAD.jon.y      - 30, 'Jon',      ns).setOrigin(0.5, 1).setDepth(6)
    this.add.text(HEAD.edu.x,      HEAD.edu.y      - 30, 'Edu',      ns).setOrigin(0.5, 1).setDepth(6)
    this.add.text(HEAD.player.x,   HEAD.player.y   - 30, 'You',      ns).setOrigin(0.5, 1).setDepth(6)
  }

  _drawHead(g, pos, charData) {
    const chubby = charData.isChubby
    const r = chubby ? 24 : 20
    const skin = charData.isYellow ? 0xf0c030 : 0xf2c88a
    const cx = pos.x, cy = pos.y

    g.fillStyle(0x000000, 0.18)
    g.fillCircle(cx + 2, cy + 2, r)
    g.fillStyle(skin)
    g.fillCircle(cx, cy, r)

    // Hair (use character color as hair)
    g.fillStyle(charData.color)
    g.fillEllipse(cx, cy - r * 0.48, r * 1.9, r * 0.85)

    // Eyes
    const eyeS = r * 0.36
    const eyeY = cy + 2
    g.fillStyle(0x111111)
    g.fillCircle(cx - eyeS, eyeY, chubby ? 3.5 : 2.8)
    g.fillCircle(cx + eyeS, eyeY, chubby ? 3.5 : 2.8)

    // Nikkebre droopy eyelid
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
    const r = 20
    const cx = pos.x, cy = pos.y

    g.fillStyle(0x000000, 0.18)
    g.fillCircle(cx + 2, cy + 2, r)
    g.fillStyle(0xf2c88a)
    g.fillCircle(cx, cy, r)

    // Red cap
    g.fillStyle(0xd82018)
    g.fillEllipse(cx, cy - r * 0.52, r * 2.2, r * 0.76)
    g.fillRoundedRect(cx - r * 0.82, cy - r - 3, r * 1.64, r * 0.6, 3)

    // Eyes
    g.fillStyle(0x111111)
    g.fillCircle(cx - 6, cy + 3, 2.5)
    g.fillCircle(cx + 6, cy + 3, 2.5)
    g.fillStyle(0xffffff, 0.55)
    g.fillCircle(cx - 7, cy + 2, 1)
    g.fillCircle(cx + 5, cy + 2, 1)

    g.lineStyle(1.5, 0x1a1a1a, 0.45)
    g.strokeCircle(cx, cy, r)
  }

  // ── COOLER ────────────────────────────────────────────────────────────────

  _drawCoolerGfx() {
    // drawn on _headGfx layer later; just a placeholder call
  }

  _drawCoolerGfxOnHead(g) {
    const x = COOLER_X, y = COOLER_Y

    // Body
    g.fillStyle(0x1e5a88)
    g.fillRoundedRect(x - 28, y - 8, 56, 36, 5)
    g.fillStyle(0x2e7ab8)
    g.fillRoundedRect(x - 26, y - 6, 52, 20, 4)

    // Lid
    g.fillStyle(0x154268)
    g.fillRoundedRect(x - 30, y - 14, 60, 10, 4)
    g.lineStyle(2, 0x0a2840, 0.9)
    g.strokeRect(x - 10, y - 19, 20, 7)

    // Cans
    g.fillStyle(0xbbbbbb)
    g.fillRoundedRect(x - 18, y - 4, 12, 20, 2)
    g.fillStyle(0xcc3300)
    g.fillRect(x - 18, y + 3, 12, 8)
    g.fillStyle(0xbbbbbb)
    g.fillRoundedRect(x + 6, y - 4, 12, 20, 2)
    g.fillStyle(0xcc3300)
    g.fillRect(x + 6, y + 3, 12, 8)

    // Ice shimmer
    g.fillStyle(0xd8eef8, 0.28)
    g.fillEllipse(x, y + 16, 44, 12)

    this.add.text(x, y + 32, '🍺 COOLER', {
      fontSize: '10px', fontFamily: 'monospace',
      color: '#80b8d0', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6)
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
    const g = this.add.graphics().setDepth(6).setAlpha(0)
    const sx = TUB_CX + (Math.random() - 0.5) * WAT_RX * 1.3
    const sy = TUB_CY - WAT_RY * 0.25 + (Math.random() - 0.5) * 28
    const r  = 7 + Math.random() * 10
    g.fillStyle(0xd0e8f2, 0.2)
    g.fillCircle(0, 0, r)
    g.x = sx
    g.y = sy
    this.tweens.add({
      targets: g,
      y: sy - 60 - Math.random() * 38,
      x: sx + (Math.random() - 0.5) * 30,
      alpha: { from: 0.55, to: 0 },
      scaleX: 2.8,
      scaleY: 2.8,
      duration: 2200 + Math.random() * 900,
      ease: 'Sine.easeOut',
      onComplete: () => g.destroy(),
    })
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildTexts() {
    this.add.text(W / 2, 26, '🛁  P A L J U', {
      fontSize: '22px', fontFamily: 'monospace',
      color: '#80d8e8', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)

    this._beerText = this.add.text(30, H - 44, `🍺 ×${this._beersLeft}`, {
      fontSize: '18px', fontFamily: 'monospace',
      color: '#f0c040', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(10)

    this._hintText = this.add.text(W / 2, H - 44, '[ E ] grab beer   [ ESC ] climb out   [ X ] go to Sauna', {
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
      if (this._phase === 'sitting') this._goToSauna()
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

    const npcs    = ['nikkebre', 'jon', 'edu']
    const gs      = this.scene.get('GameScene')
    const drunk   = gs && gs.player ? gs.player.drunkLevel : 0

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
      const fg = this.add.graphics().setDepth(8)
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
    const pos = HEAD[npcId] || HEAD.nikkebre
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
      if (!this.scene.isActive('PaljuScene')) return
      const npc = Phaser.Utils.Array.GetRandom(['nikkebre', 'jon', 'edu'])
      this._showComment(npc, Phaser.Utils.Array.GetRandom(NPC_LINES[npc]))
      this._scheduleNextComment()
    })
  }

  // ── CAN DRAWING ───────────────────────────────────────────────────────────

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

  _goToSauna() {
    if (this._commentTimer) this._commentTimer.remove()
    const gs = this.scene.get('GameScene')
    if (gs && gs.player) {
      for (let i = 0; i < this._goodSips; i++) gs.player.addDrink()
    }
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(330, () => {
      this.scene.launch('SaunaScene')
      this.scene.stop()
    })
  }

  // ── EXIT ──────────────────────────────────────────────────────────────────

  _exit() {
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
