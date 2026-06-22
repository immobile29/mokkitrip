import Phaser from 'phaser'

const W = 900, H = 600

const GRILL_X = 55, GRILL_Y = 118, GRILL_W = 790, GRILL_H = 248
const FOOD_CX = W / 2
const FOOD_CY = GRILL_Y + GRILL_H * 0.52

const COOK_MS    = 11000
const FLIP_LO    = 0.65
const FLIP_HI    = 0.95
const ENC_MIN    = 6000
const ENC_MAX    = 10500
const ALWAR_TRIG = 0.62
const ALWAR_WIN  = 2400

const NPCS = [
  { id: 'jon',      name: 'Jon',      color: 0x9b59b6, bodyColor: 0x8e44ad, food: 'Ribs',    side: 'left',  fx: 172 },
  { id: 'mark',     name: 'Mark',     color: 0x2980b9, bodyColor: 0x1a6fa8, food: 'Wings',   side: 'left',  fx: 310 },
  { id: 'edu',      name: 'Edu',      color: 0xe91e8c, bodyColor: 0xc2185b, food: 'Skewers', side: 'right', fx: 590 },
  { id: 'immobile', name: 'Immobile', color: 0x1abc9c, bodyColor: 0x17a589, food: 'Chicken', side: 'right', fx: 728 },
]

const MEALS = [
  { id: 'steak',  icon: '🥩', label: 'Steak',  desc: "Classic. Flip twice. Don't burn it." },
  { id: 'burger', icon: '🍔', label: 'Burger',  desc: 'Juicy patty. Flips a little faster.' },
  { id: 'panini', icon: '🥖', label: 'Panini',  desc: "Please. Just... don't." },
]

const PANINI_ROASTS = [
  { name: 'Jon',  color: 0x9b59b6, text: "You don't grill a panini, bro.\nGet out." },
  { name: 'Mark', color: 0x2980b9, text: "Panini is not grillable.\nI learned this in the Hungarian Navy." },
  { name: 'Edu',  color: 0xe91e8c, text: "Sweetie. A panini press\nexists for a reason." },
]

const ENC_LINES = {
  jon:      ["Just a bit more room bro", "The ribs need space bro"],
  mark:     ["EXPAND THE PERIMETER",     "HUNGARIAN GRILL DOCTRINE"],
  edu:      ["Coming through sweetie",   "My skewers need room"],
  immobile: ["Gains don't wait, step aside", "PROTEIN HAS PRIORITY"],
}
const ENC_WIN  = { jon: "Okay okay bro",  mark: "RETREAT", edu: "Fine! So rude.", immobile: "Fine. For now." }
const ENC_FAIL = { jon: "Too slow bro lmao", mark: "TERRITORY ACQUIRED", edu: "My space now, honey.", immobile: "And that's gains." }

const RESULTS = {
  legendary: { label: '🔥 LEGENDARY COOK',    sub: "Chef's kiss. Absolute perfection.",       col: '#f1c40f' },
  good:      { label: '👍 PRETTY GOOD',         sub: 'Not bad. Your friends approve.',          col: '#44cc66' },
  raw:       { label: '🤢 RAW',                 sub: 'You served bleeding meat. Bold choice.',  col: '#cc4455' },
  charcoal:  { label: '💀 CHARCOAL',            sub: "It's not food. It's punishment.",         col: '#778899' },
  yoinked:   { label: '🐦 YOINKED BY ALWAR',   sub: 'Gone. He looked you in the eyes first.',  col: '#ff8844' },
  panini:    { label: '🥖 PANINI REJECTED',     sub: 'Your friends have disowned you.\nTemporarily.', col: '#aabbcc' },
}

const PANEL_W = 540, PANEL_H = 390
const PANEL_X = (W - PANEL_W) / 2, PANEL_Y = (H - PANEL_H) / 2

export class GrillingScene extends Phaser.Scene {
  constructor() { super({ key: 'GrillingScene' }) }

  // ── LIFECYCLE ─────────────────────────────────────────────────────────────

  create() {
    this._phase      = 'select'
    this._cursor     = 0
    this._meal       = null
    this._exiting    = false

    // Cook state
    this._cookProg  = 0
    this._side      = 0
    this._sideQual  = ['', '']
    this._flipping  = false
    this._flipAnim  = 0
    this._flipMid   = false
    this._speedMult = 1.0

    // Encroach state
    this._encActive    = false
    this._encIdx       = -1
    this._encTimeLeft  = 0
    this._encSlide     = 0
    this._encElapsed   = 0
    this._encNextDelay = ENC_MIN + Math.random() * (ENC_MAX - ENC_MIN)

    // Alwar state
    this._alwarState   = 'dormant'
    this._alwarProg    = 0
    this._alwarTimeLeft = 0
    this._alwarSpawned  = false

    // Smoke particles
    this._smoke = []

    // Select UI objects — destroyed when we leave select
    this._selectObjs = []

    // Graphics layers
    this._bgGfx    = this.add.graphics().setDepth(0)
    this._grillGfx = this.add.graphics().setDepth(1)
    this._foodGfx  = this.add.graphics().setDepth(2)
    this._smokeGfx = this.add.graphics().setDepth(3)
    this._encGfx   = this.add.graphics().setDepth(4)
    this._alwarGfx = this.add.graphics().setDepth(5)
    this._hudGfx   = this.add.graphics().setDepth(15)

    // Persistent HUD texts (invisible until grilling)
    this._hudSide = this.add.text(16, H - 92, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aabbcc',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(16).setVisible(false)

    this._hudFlip = this.add.text(W / 2, H - 56, '', {
      fontSize: '15px', fontFamily: 'monospace', color: '#44ff88',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(16).setVisible(false)

    this._hudHint = this.add.text(W / 2, H - 14, '[ SPACE ] Flip   [ ← → ] Push back   [ Q ] Shoo Alwar   [ ESC ] Quit', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(16).setVisible(false)

    this._drawBg()
    this._buildSelectUI()
    this._bindKeys()
    this.cameras.main.fadeIn(350, 0, 0, 0)
  }

  update(_time, delta) {
    if (this._phase !== 'grilling') return
    this._updateGrilling(delta)
    this._redrawGrill()
  }

  // ── BACKGROUND ───────────────────────────────────────────────────────────

  _drawBg() {
    const g = this._bgGfx
    g.clear()
    g.fillStyle(0x0d1a0d); g.fillRect(0, 0, W, H)
    g.fillStyle(0x182a18); g.fillRect(0, 100, W, H)
    // Warm glow from fire
    g.fillStyle(0xff6000, 0.05); g.fillRect(GRILL_X, GRILL_Y, GRILL_W, GRILL_H)
    // Ground texture hints
    g.fillStyle(0x1e301e, 0.6)
    for (let i = 0; i < 18; i++) g.fillRect(20 + i * 48, 400 + (i % 3) * 36, 22, 4)
  }

  // ── SELECT UI ────────────────────────────────────────────────────────────

  _buildSelectUI() {
    const reg = (o) => { this._selectObjs.push(o); return o }

    const pg = reg(this.add.graphics().setDepth(10))
    pg.fillStyle(0x06060f, 0.96)
    pg.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 14)
    pg.lineStyle(2, 0x2a3a4a)
    pg.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 14)
    // Warm inner glow
    pg.lineStyle(1, 0xff6000, 0.18)
    pg.strokeRoundedRect(PANEL_X + 6, PANEL_Y + 6, PANEL_W - 12, PANEL_H - 12, 10)

    reg(this.add.text(W / 2, PANEL_Y + 44, '🔥  What are you grilling?', {
      fontSize: '22px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11))

    this._menuObjs = []
    for (let i = 0; i < MEALS.length; i++) {
      const m   = MEALS[i]
      const iy  = PANEL_Y + 126 + i * 78

      const lbl = reg(this.add.text(PANEL_X + 68, iy, `${m.icon}  ${m.label}`, {
        fontSize: '21px', fontFamily: 'monospace', color: '#dde0e8',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0, 0.5).setDepth(11))

      const dsc = reg(this.add.text(PANEL_X + 68, iy + 25, m.desc, {
        fontSize: '12px', fontFamily: 'monospace', color: '#5a6a7a',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0, 0.5).setDepth(11))

      this._menuObjs.push({ lbl, dsc, iy })
    }

    reg(this.add.text(W / 2, PANEL_Y + PANEL_H - 22, '[ ↑ ↓ ] Navigate   [ ENTER ] Confirm   [ ESC ] Leave', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11))

    this._selectCursor = reg(this.add.graphics().setDepth(12))
    this._refreshCursor()
  }

  _refreshCursor() {
    const g = this._selectCursor
    if (!g || !g.active) return
    g.clear()
    const iy = PANEL_Y + 126 + this._cursor * 78
    g.fillStyle(0xf1c40f, 0.07)
    g.fillRoundedRect(PANEL_X + 24, iy - 36, PANEL_W - 48, 72, 8)
    g.lineStyle(2, 0xf1c40f, 0.75)
    g.strokeRoundedRect(PANEL_X + 24, iy - 36, PANEL_W - 48, 72, 8)
  }

  _destroySelectUI() {
    for (const o of this._selectObjs) { if (o?.active) o.destroy() }
    this._selectObjs = []
    this._selectCursor = null
  }

  // ── KEY BINDINGS ──────────────────────────────────────────────────────────

  _bindKeys() {
    this._keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      q:     Phaser.Input.Keyboard.KeyCodes.Q,
    })

    this._keys.up.on('down', () => {
      if (this._phase !== 'select') return
      this._cursor = (this._cursor - 1 + MEALS.length) % MEALS.length
      this._refreshCursor()
    })
    this._keys.down.on('down', () => {
      if (this._phase !== 'select') return
      this._cursor = (this._cursor + 1) % MEALS.length
      this._refreshCursor()
    })
    this._keys.enter.on('down', () => {
      if (this._phase === 'select')  this._confirmMeal(MEALS[this._cursor].id)
      if (this._phase === 'result')  this._exit()
    })
    this._keys.esc.on('down', () => {
      if (this._phase === 'select' || this._phase === 'result') this._exit()
      else if (this._phase === 'grilling') this._exit()
    })
    this._keys.space.on('down', () => {
      if (this._phase === 'grilling' && !this._flipping) this._tryFlip()
    })
    this._keys.left.on('down', () => {
      if (this._phase === 'grilling' && this._encActive) this._tryPushback('left')
    })
    this._keys.right.on('down', () => {
      if (this._phase === 'grilling' && this._encActive) this._tryPushback('right')
    })
    this._keys.q.on('down', () => {
      if (this._phase === 'grilling' && this._alwarState === 'window') this._deflectAlwar()
    })
  }

  // ── MEAL SELECTION ────────────────────────────────────────────────────────

  _confirmMeal(id) {
    this._meal = id
    this._destroySelectUI()
    if (id === 'panini') {
      this._startPaniniRoute()
    } else {
      this._startGrilling()
    }
  }

  // ── PANINI ROUTE ──────────────────────────────────────────────────────────

  _startPaniniRoute() {
    this._phase = 'panini_roast'
    this._drawGrillFrame()
    this._drawNpcBusts()

    // Draw a sad panini on the grill
    const g = this._foodGfx
    g.clear()
    g.fillStyle(0xc8a060)
    g.fillRoundedRect(FOOD_CX - 60, FOOD_CY - 18, 120, 36, 10)
    g.fillStyle(0xe0b870, 0.6)
    g.fillRoundedRect(FOOD_CX - 50, FOOD_CY - 12, 100, 10, 4)
    g.fillRoundedRect(FOOD_CX - 50, FOOD_CY + 2,  100, 10, 4)

    // Staggered NPC roasts
    PANINI_ROASTS.forEach((r, i) => {
      const positions = [200, W / 2, 700]
      this.time.delayedCall(500 + i * 2600, () => {
        if (this._phase !== 'panini_roast') return
        this._showBubble(positions[i], 58, r.text, r.color, 2400)
      })
    })

    // Alwar swoops to steal it
    this.time.delayedCall(8600, () => {
      if (this._phase !== 'panini_roast') return
      this._showFloat(FOOD_CX, FOOD_CY - 60, '🐦 *steals panini anyway*', '#ff8844', 16)
      this.time.delayedCall(1200, () => {
        this._foodGfx.clear()
        this._showResult('panini')
      })
    })
  }

  // ── GRILLING START ────────────────────────────────────────────────────────

  _startGrilling() {
    this._phase = 'grilling'
    this._drawGrillFrame()
    this._drawNpcBusts()
    this._hudSide.setVisible(true)
    this._hudFlip.setVisible(true)
    this._hudHint.setVisible(true)
  }

  // ── GRILL FRAME (DRAWN ONCE) ──────────────────────────────────────────────

  _drawGrillFrame() {
    const g = this._grillGfx
    g.clear()
    const gx = GRILL_X, gy = GRILL_Y, gw = GRILL_W, gh = GRILL_H
    const barCount = 12, barH = 10

    // Coal glow between bars
    const barSpacing = gh / barCount
    for (let i = 0; i < barCount; i++) {
      const by = gy + (i + 0.5) * barSpacing
      const heat = 0.55 + 0.45 * ((i % 3) / 3)
      g.fillStyle(0xff5500, heat * 0.28); g.fillRect(gx + 6, by - 5, gw - 12, 12)
      g.fillStyle(0xff9900, heat * 0.16); g.fillRect(gx + 6, by - 2, gw - 12, 5)
    }

    // Grill bars
    for (let i = 0; i <= barCount; i++) {
      const by = gy + i * (gh / barCount)
      g.fillStyle(0x1a1a1a); g.fillRect(gx, by - barH / 2, gw, barH)
      g.fillStyle(0x2c2c2c); g.fillRect(gx, by - barH / 2, gw, 2)
      g.fillStyle(0x0c0c0c); g.fillRect(gx, by + barH / 2 - 2, gw, 2)
    }

    // Metal frame rails
    g.fillStyle(0x222222)
    g.fillRect(gx - 10, gy - 10, gw + 20, 14)  // top
    g.fillRect(gx - 10, gy + gh - 4, gw + 20, 14) // bottom
    g.fillRect(gx - 10, gy,    14, gh)           // left
    g.fillRect(gx + gw - 4, gy, 14, gh)          // right
    g.fillStyle(0x333333)
    g.fillRect(gx - 10, gy - 10, gw + 20, 4)    // top highlight
    g.lineStyle(1, 0x444444); g.strokeRect(gx - 10, gy - 10, gw + 20, gh + 20)
  }

  _drawNpcBusts() {
    const bustGfx = this.add.graphics().setDepth(6)
    const xs = [135, 305, 595, 765]
    const by = 52

    for (let i = 0; i < NPCS.length; i++) {
      const npc = NPCS[i], bx = xs[i]
      this._drawBust(bustGfx, npc, bx, by, 28)
      this.add.text(bx, by + 36, npc.name, {
        fontSize: '10px', fontFamily: 'monospace', color: '#99aabc',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(7)
      this.add.text(bx, by + 50, npc.food, {
        fontSize: '9px', fontFamily: 'monospace', color: '#4a5a6a',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5, 0).setDepth(7)
    }
  }

  // ── GRILLING UPDATE ───────────────────────────────────────────────────────

  _updateGrilling(delta) {
    // Cook progress
    if (!this._flipping) {
      this._cookProg = Math.min(1, this._cookProg + (delta / COOK_MS) * this._speedMult)
    }

    // Auto-burn when progress hits 1.0
    if (this._cookProg >= 1 && !this._flipping) {
      this._sideQual[this._side] = 'burnt'
      this._showFloat(FOOD_CX, FOOD_CY - 65, '🔥 BURNED!', '#ff4444', 16)
      if (this._side === 0) {
        this._cookProg = 1  // clamp; flip animation takes over
        this._startFlipAnim()
      } else {
        this._showResult(this._calcOutcome())
        return
      }
    }

    // Flip animation
    if (this._flipping) {
      this._flipAnim = Math.min(1, this._flipAnim + delta / 310)
      // Swap sides at mid-squash
      if (!this._flipMid && this._flipAnim >= 0.5) {
        this._flipMid   = true
        this._cookProg  = 0
        this._side      = 1
      }
      if (this._flipAnim >= 1) {
        this._flipping = false
        this._flipAnim = 0
        this._flipMid  = false
      }
    }

    // Smoke
    if (Math.random() < 0.18) {
      this._smoke.push({
        x: FOOD_CX + Phaser.Math.Between(-44, 44),
        y: FOOD_CY - 18,
        vy: 0.45 + Math.random() * 0.55,
        vx: (Math.random() - 0.5) * 0.3,
        alpha: 0.3 + Math.random() * 0.22,
        r: 6 + Math.random() * 9,
      })
    }
    for (let i = this._smoke.length - 1; i >= 0; i--) {
      const p = this._smoke[i]
      p.y -= p.vy; p.x += p.vx; p.alpha -= 0.007
      if (p.alpha <= 0) this._smoke.splice(i, 1)
    }

    // Encroachment timer
    this._encElapsed += delta
    if (!this._encActive && this._encElapsed >= this._encNextDelay) {
      this._startEncroach()
    }
    if (this._encActive) {
      this._encTimeLeft -= delta
      this._encSlide = Math.min(1, this._encSlide + delta / 650)
      if (this._encTimeLeft <= 0) this._resolveEncroach(false)
    }

    // Alwar
    if (!this._alwarSpawned && this._side === 0 && this._cookProg >= ALWAR_TRIG) {
      this._alwarSpawned = true
      this.time.delayedCall(500, () => this._startAlwar())
    }
    if (this._alwarState === 'incoming') {
      this._alwarProg = Math.min(1, this._alwarProg + delta / 1700)
      if (this._alwarProg >= 1) {
        this._alwarState   = 'window'
        this._alwarTimeLeft = ALWAR_WIN
        this._showFloat(W / 2, FOOD_CY - 92, '[ Q ] SHOO HIM!', '#ff4444', 17)
      }
    }
    if (this._alwarState === 'window') {
      this._alwarTimeLeft -= delta
      if (this._alwarTimeLeft <= 0) {
        this._alwarState = 'stolen'
        this._showResult('yoinked')
        return
      }
    }
    if (this._alwarState === 'deflected') {
      this._alwarProg = Math.max(0, this._alwarProg - delta / 450)
    }

    this._updateHUD()
  }

  // ── REDRAW (per frame while grilling) ─────────────────────────────────────

  _redrawGrill() {
    const f = this._foodGfx
    f.clear()
    this._drawNpcFoods(f)
    this._drawPlayerFood(f)
    this._drawEncroachHighlight()
    this._drawSmoke()
    this._drawAlwar()
  }

  // ── FOOD DRAWING ──────────────────────────────────────────────────────────

  _drawPlayerFood(g) {
    const cx = FOOD_CX, cy = FOOD_CY

    // Squash during flip: cos curve peaks at 0 at midpoint
    const squash = this._flipping ? Math.abs(Math.cos(this._flipAnim * Math.PI)) : 1
    const fw = this._meal === 'burger' ? 90 : 112
    const fh = (this._meal === 'burger' ? 46 : 62) * squash
    if (fh < 1) return

    const col = this._foodColor(this._cookProg)

    // Shadow
    g.fillStyle(0x000000, 0.22)
    g.fillEllipse(cx + 3, cy + 4, fw + 8, Math.max(2, fh + 4))

    // Food body
    g.fillStyle(col)
    g.fillEllipse(cx, cy, fw, fh)

    // Grill marks (visible >30%)
    if (this._cookProg > 0.30 && !this._flipping) {
      const markAlpha = Math.min(0.85, (this._cookProg - 0.3) * 2.2)
      const markColor = this._lerpColor(0x2a0800, 0x050505, Math.min(1, (this._cookProg - 0.3) * 3))
      g.lineStyle(3.5, markColor, markAlpha)
      const count = this._meal === 'burger' ? 4 : 5
      const halfH = fh * 0.42
      for (let m = 0; m < count; m++) {
        const ox = -fw * 0.38 + (m / (count - 1)) * fw * 0.76
        g.lineBetween(cx + ox, cy - halfH, cx + ox, cy + halfH)
      }
    }

    // Burger top bun hint
    if (this._meal === 'burger' && this._cookProg < 0.78) {
      g.fillStyle(0xd49030, 0.55)
      g.fillEllipse(cx, cy - fh * 0.22, fw * 0.84, fh * 0.38)
    }

    // Steak fat rim
    if (this._meal === 'steak' && this._cookProg < 0.88) {
      g.lineStyle(4, 0xf0dfa0, 0.45)
      g.strokeEllipse(cx, cy, fw, fh)
    }

    // Burnt edge
    if (this._cookProg > 0.88) {
      g.lineStyle(7, 0x080808, Math.min(1, (this._cookProg - 0.88) * 8))
      g.strokeEllipse(cx, cy, fw, fh)
    }

    // Flip window glow ring
    if (this._cookProg >= FLIP_LO && this._cookProg < FLIP_HI && !this._flipping) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 115)
      g.lineStyle(3, 0x44ff88, 0.35 + pulse * 0.65)
      g.strokeEllipse(cx, cy, fw + 14, fh + 10)
    }
  }

  _drawNpcFoods(g) {
    const fy = FOOD_CY
    for (let i = 0; i < NPCS.length; i++) {
      const npc = NPCS[i]
      let fx = npc.fx

      // Slide toward player during encroach
      if (this._encActive && this._encIdx === i) {
        const push = (npc.side === 'left' ? 1 : -1) * 66 * this._encSlide
        fx += push
      }

      g.fillStyle(0x000000, 0.2)
      g.fillEllipse(fx + 2, fy + 3, 68, 26)

      if (npc.id === 'jon') {
        // Ribs: row of arcs
        g.fillStyle(0xaa6633)
        for (let r = 0; r < 4; r++) {
          g.fillEllipse(fx - 18 + r * 13, fy, 9, 24)
        }
        g.fillStyle(0xcc8844, 0.5)
        for (let r = 0; r < 4; r++) {
          g.fillEllipse(fx - 18 + r * 13, fy - 4, 6, 10)
        }
      } else if (npc.id === 'mark') {
        // Wings: two irregular ovals
        g.fillStyle(0xbb7733)
        g.fillEllipse(fx - 14, fy - 4, 30, 18)
        g.fillEllipse(fx + 14, fy + 4,  30, 18)
        g.fillStyle(0xddaa55, 0.5)
        g.fillEllipse(fx - 14, fy - 6, 20, 8)
        g.fillEllipse(fx + 14, fy + 2,  20, 8)
      } else if (npc.id === 'edu') {
        // Skewers: vertical sticks with veggies
        for (let s = 0; s < 3; s++) {
          const sx = fx - 20 + s * 18
          g.fillStyle(0x6a4020); g.fillRect(sx - 2, fy - 14, 4, 28)
          g.fillStyle(0x6a9430); g.fillEllipse(sx, fy - 8, 10, 10)
          g.fillStyle(0xdd6622); g.fillEllipse(sx, fy + 4, 10, 10)
        }
      } else if (npc.id === 'immobile') {
        // Chicken breast: rounded rect
        g.fillStyle(0xf0d888)
        g.fillRoundedRect(fx - 24, fy - 13, 48, 26, 7)
        g.fillStyle(0xd4a030, 0.55)
        g.fillRoundedRect(fx - 17, fy - 7, 34, 12, 4)
      }
    }
  }

  _drawEncroachHighlight() {
    const g = this._encGfx
    g.clear()
    if (!this._encActive) return
    const npc   = NPCS[this._encIdx]
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 145)
    const bx    = npc.side === 'left' ? FOOD_CX - 74 : FOOD_CX + 20
    g.lineStyle(3, 0xff3333, 0.4 + pulse * 0.6)
    g.strokeRect(bx, FOOD_CY - 44, 54, 88)
    g.fillStyle(0xff2222, 0.06 + pulse * 0.06)
    g.fillRect(bx, FOOD_CY - 44, 54, 88)
  }

  _drawSmoke() {
    const g = this._smokeGfx
    g.clear()
    for (const p of this._smoke) {
      g.fillStyle(0xaaaaaa, p.alpha)
      g.fillCircle(p.x, p.y, p.r)
    }
  }

  _drawAlwar() {
    const g = this._alwarGfx
    g.clear()
    const s = this._alwarState
    if (s === 'dormant' || s === 'stolen') return
    if (s === 'deflected' && this._alwarProg <= 0) return

    const prog = (s === 'deflected') ? (1 - this._alwarProg) : this._alwarProg
    const ax   = W / 2 + Math.sin(prog * Math.PI) * 110
    const ay   = -50 + prog * (FOOD_CY - 55)

    // Body
    g.fillStyle(0xdddddd); g.fillEllipse(ax, ay + 16, 22, 36)
    // Head
    g.fillStyle(0x000000, 0.12); g.fillCircle(ax + 2, ay + 2, 18)
    g.fillStyle(0xffffff); g.fillCircle(ax, ay, 18)
    // Sombrero
    g.fillStyle(0x000000, 0.18); g.fillEllipse(ax + 2, ay - 16, 58, 12)   // brim shadow
    g.fillStyle(0xcc8800); g.fillEllipse(ax, ay - 18, 54, 10)             // brim
    g.fillStyle(0xee9900); g.fillEllipse(ax, ay - 22, 28, 18)             // crown
    g.fillStyle(0xffaa00, 0.6); g.fillEllipse(ax - 2, ay - 26, 12, 7)    // crown highlight
    // Decorative band
    g.lineStyle(2, 0xdd2200, 0.9)
    g.strokeEllipse(ax, ay - 18, 28, 8)
    // Brim trim dots
    g.fillStyle(0xdd2200)
    for (let i = 0; i < 8; i++) {
      const da = (i / 8) * Math.PI * 2
      g.fillCircle(ax + Math.cos(da) * 22, ay - 18 + Math.sin(da) * 4, 2)
    }

    // Beak
    g.fillStyle(0xffcc00)
    g.fillTriangle(ax + 14, ay - 2, ax + 26, ay, ax + 14, ay + 4)
    // Eye
    g.fillStyle(0x1a1a1a); g.fillCircle(ax + 8, ay - 5, 3.2)
    g.fillStyle(0xffffff, 0.6); g.fillCircle(ax + 7, ay - 6, 1.2)
    // Wings (flapping)
    const flap = Math.sin(Date.now() / 100) * 18
    g.fillStyle(0xcccccc, 0.9)
    g.fillTriangle(ax - 12, ay - 2, ax - 46, ay - 22 + flap, ax - 12, ay + 14)
    g.fillTriangle(ax + 12, ay - 2, ax + 46, ay - 22 + flap, ax + 12, ay + 14)
  }

  // ── FLIP ─────────────────────────────────────────────────────────────────

  _tryFlip() {
    const prog = this._cookProg
    let qual
    if (prog < FLIP_LO) {
      qual = 'undercooked'
      this._showFloat(FOOD_CX, FOOD_CY - 68, 'Too early! Undercooked!', '#cc4455', 14)
    } else if (prog <= FLIP_HI) {
      qual = 'perfect'
      this._showFloat(FOOD_CX, FOOD_CY - 68, '✓ Perfect flip!', '#44ff88', 16)
    } else {
      qual = 'good'
      this._showFloat(FOOD_CX, FOOD_CY - 68, 'A bit late...', '#f1c40f', 13)
    }
    this._sideQual[this._side] = qual

    if (this._side === 1) {
      // Side B done — show result after flip settles
      this._startFlipAnim()
      this.time.delayedCall(380, () => this._showResult(this._calcOutcome()))
    } else {
      this._startFlipAnim()
    }
  }

  _startFlipAnim() {
    this._flipping = true
    this._flipAnim = 0
    this._flipMid  = false
  }

  // ── ENCROACH ─────────────────────────────────────────────────────────────

  _startEncroach() {
    this._encIdx       = Phaser.Math.Between(0, NPCS.length - 1)
    this._encActive    = true
    this._encTimeLeft  = 2100
    this._encSlide     = 0
    this._encElapsed   = 0
    this._encNextDelay = ENC_MIN + Math.random() * (ENC_MAX - ENC_MIN)

    const npc  = NPCS[this._encIdx]
    const line = Phaser.Utils.Array.GetRandom(ENC_LINES[npc.id])
    this._showBubble(npc.fx, 46, line, npc.color, 2000)
    const hint = npc.side === 'left' ? '← PUSH BACK' : '→ PUSH BACK'
    this._showFloat(FOOD_CX, FOOD_CY - 82, hint, '#ff8844', 15)
  }

  _tryPushback(dir) {
    if (!this._encActive) return
    const npc = NPCS[this._encIdx]
    const ok  = (npc.side === 'left' && dir === 'left') || (npc.side === 'right' && dir === 'right')
    this._resolveEncroach(ok)
  }

  _resolveEncroach(success) {
    const npc = NPCS[this._encIdx]
    this._encActive = false
    this._encSlide  = 0
    if (success) {
      this._showFloat(npc.fx, 50, ENC_WIN[npc.id],  npc.color, 12)
    } else {
      this._speedMult += 0.28
      this._showFloat(npc.fx, 50, ENC_FAIL[npc.id], npc.color, 12)
      this._showFloat(FOOD_CX, FOOD_CY - 68, '⚠️ Cooking faster!', '#ff8844', 13)
    }
  }

  // ── ALWAR ────────────────────────────────────────────────────────────────

  _startAlwar() {
    if (this._phase !== 'grilling') return
    this._alwarState = 'incoming'
    this._alwarProg  = 0
    this._showBubble(W - 160, 44, '⚠️ ALWAR INBOUND', 0xff3333, 1600)
  }

  _deflectAlwar() {
    this._alwarState = 'deflected'
    this.cameras.main.shake(150, 0.006)
    this._showFloat(W / 2, FOOD_CY - 88, 'NOT TODAY ALWAR! 🐦', '#44ff88', 18)
    this.time.delayedCall(700, () => {
      if (this._alwarState === 'deflected') this._alwarState = 'dormant'
    })
  }

  // ── RESULT ────────────────────────────────────────────────────────────────

  _calcOutcome() {
    const [q0, q1] = this._sideQual
    if (q0 === 'burnt' || q1 === 'burnt') return 'charcoal'
    if (q0 === 'undercooked' || q1 === 'undercooked') return 'raw'
    if (q0 === 'perfect' && q1 === 'perfect') return 'legendary'
    return 'good'
  }

  _showResult(key) {
    if (this._phase === 'result') return
    this._phase = 'result'
    const r = RESULTS[key]

    const dim = this.add.graphics().setDepth(40)
    dim.fillStyle(0x000000, 0.72); dim.fillRect(0, 0, W, H)

    const rw = 500, rh = 300
    const rx = (W - rw) / 2, ry = (H - rh) / 2
    const bg = this.add.graphics().setDepth(41)
    bg.fillStyle(0x060612, 0.97); bg.fillRoundedRect(rx, ry, rw, rh, 14)
    bg.lineStyle(2, 0x2a3a4a);    bg.strokeRoundedRect(rx, ry, rw, rh, 14)
    bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(r.col).color, 0.3)
    bg.strokeRoundedRect(rx + 5, ry + 5, rw - 10, rh - 10, 10)

    this.add.text(W / 2, ry + 82, r.label, {
      fontSize: '28px', fontFamily: 'monospace', color: r.col,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(42)

    this.add.text(W / 2, ry + 142, r.sub, {
      fontSize: '15px', fontFamily: 'monospace', color: '#99aabb',
      stroke: '#000', strokeThickness: 2, align: 'center',
    }).setOrigin(0.5).setDepth(42)

    this.add.text(W / 2, ry + rh - 26, '[ ESC / ENTER ]  Back to mökki', {
      fontSize: '12px', fontFamily: 'monospace', color: '#3a4a5a',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(42)

    this.scene.get('GameScene')?.events.emit('result:grilling', { quality: key })
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _updateHUD() {
    const g = this._hudGfx
    g.clear()

    const bx = 14, by = H - 82, bw = W - 28, bh = 20

    // HUD backdrop
    g.fillStyle(0x050510, 0.88)
    g.fillRoundedRect(bx - 4, by - 30, bw + 8, bh + 44, 6)

    // Cook bar background
    g.fillStyle(0x112233); g.fillRoundedRect(bx, by, bw, bh, 5)

    // Filled portion
    const fillW = Math.max(4, bw * this._cookProg)
    const fillC = this._cookProg < FLIP_LO ? 0x2277bb
      : this._cookProg < FLIP_HI ? 0x33ee88
      : this._cookProg < 0.97    ? 0xf1c40f
      : 0xff3333
    g.fillStyle(fillC); g.fillRoundedRect(bx, by, fillW, bh, 5)

    // Flip window markers
    g.lineStyle(2, 0x33ee88, 0.8)
    g.lineBetween(bx + bw * FLIP_LO, by - 5, bx + bw * FLIP_LO, by + bh + 5)
    g.lineStyle(2, 0xff8800, 0.8)
    g.lineBetween(bx + bw * FLIP_HI, by - 5, bx + bw * FLIP_HI, by + bh + 5)

    // Side label + pct
    const pct = Math.round(this._cookProg * 100)
    this._hudSide.setText(`SIDE ${this._side === 0 ? 'A' : 'B'}:  ${pct}%`)

    // Flip hint
    const p = this._cookProg
    if (p < FLIP_LO) {
      this._hudFlip.setText('Keep cooking...').setColor('#556677')
    } else if (p <= FLIP_HI) {
      this._hudFlip.setText('[ SPACE ] Flip now!').setColor('#33ee88')
    } else {
      this._hudFlip.setText('Flip! Getting overcooked!').setColor('#ff8844')
    }
  }

  // ── NPC BUST ─────────────────────────────────────────────────────────────

  _drawBust(g, npc, cx, cy, r) {
    const skin = 0xf2c88a
    g.fillStyle(0x000000, 0.14); g.fillCircle(cx + 2, cy + 2, r)
    g.fillStyle(skin);            g.fillCircle(cx, cy, r)
    g.fillStyle(npc.color)
    g.fillEllipse(cx, cy - r * 0.48, r * 1.88, r * 0.82)
    const es = r * 0.33
    g.fillStyle(0x111111)
    g.fillCircle(cx - es, cy + 2, 2.5); g.fillCircle(cx + es, cy + 2, 2.5)
    g.fillStyle(0xffffff, 0.5)
    g.fillCircle(cx - es - 1, cy + 1, 1); g.fillCircle(cx + es - 1, cy + 1, 1)
    g.fillStyle(npc.bodyColor)
    g.fillRoundedRect(cx - r - 5, cy + r - 2, (r + 5) * 2, r * 1.15, { tl: 3, tr: 3, bl: 8, br: 8 })
    g.lineStyle(1.2, 0x1a1a1a, 0.4); g.strokeCircle(cx, cy, r)
  }

  // ── UTILITIES ─────────────────────────────────────────────────────────────

  _lerpColor(c1, c2, t) {
    t = Math.max(0, Math.min(1, t))
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff
    return (Math.round(r1 + (r2 - r1) * t) << 16) |
           (Math.round(g1 + (g2 - g1) * t) << 8)  |
            Math.round(b1 + (b2 - b1) * t)
  }

  _foodColor(p) {
    if (p < 0.5)  return this._lerpColor(0xd05060, 0xb87c40, p * 2)
    if (p < 0.85) return this._lerpColor(0xb87c40, 0x6a3010, (p - 0.5) / 0.35)
    return              this._lerpColor(0x6a3010, 0x0d0d0d, (p - 0.85) / 0.15)
  }

  _showBubble(x, y, text, color, duration = 2200) {
    const lines  = text.split('\n')
    const maxLen = Math.max(...lines.map(l => l.length))
    const bw = maxLen * 8 + 28, bh = lines.length * 20 + 22
    const bx = Phaser.Math.Clamp(x - bw / 2, 6, W - bw - 6)
    const by = y

    const bg = this.add.graphics().setDepth(18)
    bg.fillStyle(0x060612, 0.94)
    bg.fillRoundedRect(bx, by, bw, bh, 8)
    bg.lineStyle(1.5, color, 0.7)
    bg.strokeRoundedRect(bx, by, bw, bh, 8)
    bg.fillStyle(0x060612, 0.94)
    bg.fillTriangle(bx + bw / 2 - 6, by + bh, bx + bw / 2 + 6, by + bh, bx + bw / 2, by + bh + 10)

    const t = this.add.text(bx + bw / 2, by + bh / 2, text, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ddeeff', align: 'center',
    }).setOrigin(0.5).setDepth(19)

    this.time.delayedCall(duration, () => {
      this.tweens.add({
        targets: [bg, t], alpha: 0, duration: 300,
        onComplete: () => { bg.destroy(); t.destroy() },
      })
    })
  }

  _showFloat(x, y, text, color, size = 13) {
    const t = this.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20).setAlpha(0)
    this.tweens.add({
      targets: t, alpha: { from: 0, to: 1 }, y: y - 24,
      duration: 220, hold: 1100, yoyo: true,
      onComplete: () => t.destroy(),
    })
  }

  // ── EXIT ──────────────────────────────────────────────────────────────────

  _exit() {
    if (this._exiting) return
    this._exiting = true
    this.cameras.main.fadeOut(350, 0, 0, 0)
    this.time.delayedCall(370, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
