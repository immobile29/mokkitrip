const W = 900
const H = 600
const DOCK_Y   = 370
const LAUNCH_X = 630
const START_X  = 160

const TRICKS = [
  { seq: ['up','up','up','up'],         name: 'Double Backflip',  pts: 500, delta: -720 },
  { seq: ['down','down','down','down'],  name: 'Double Frontflip', pts: 500, delta:  720 },
  { seq: ['up','up','up'],              name: '540',               pts: 350, delta: -540 },
  { seq: ['up','down','up'],            name: 'Gainer',            pts: 400, delta:  360 },
  { seq: ['left','right','left'],       name: 'Helicopter',        pts: 300, delta: -360 },
  { seq: ['up','up'],                   name: 'Backflip',          pts: 200, delta: -360 },
  { seq: ['down','down'],               name: 'Frontflip',         pts: 200, delta:  360 },
  { seq: ['left','left'],               name: 'Left Spin',         pts: 150, delta: -180 },
  { seq: ['right','right'],             name: 'Right Spin',        pts: 150, delta:  180 },
]

const DIR_ARROW = { up: '↑', down: '↓', left: '←', right: '→' }

function tailMatches(buf, seq) {
  if (buf.length < seq.length) return false
  const tail = buf.slice(buf.length - seq.length)
  return seq.every((v, i) => v === tail[i])
}

export class DockJumpScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DockJumpScene' })
  }

  create() {
    this._phase       = 'runup'
    this._speed       = 0
    this._score       = 0
    this._tricks      = []
    this._seqBuf      = []
    this._exiting     = false
    this._airStart    = 0
    this._arcStartX   = LAUNCH_X
    this._airDuration = 0
    this._jumpDist    = 0
    this._peakHeight  = 0
    this._charRunX    = START_X

    // ── STATIC BACKGROUND ────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillStyle(0x5fa8d3)
    bg.fillRect(0, 0, W, DOCK_Y)
    bg.fillStyle(0x7ec8e3, 0.3)
    bg.fillRect(0, DOCK_Y - 40, W, 40)
    bg.fillStyle(0x1a5f7a)
    bg.fillRect(0, DOCK_Y, W, H - DOCK_Y)
    bg.fillStyle(0x2575a0, 0.4)
    bg.fillRect(0, DOCK_Y, W, 18)
    // Sun
    bg.fillStyle(0xffe066)
    bg.fillCircle(820, 68, 30)
    bg.fillStyle(0xffd700, 0.25)
    bg.fillCircle(820, 68, 44)
    // Shore
    bg.fillStyle(0x5a7a30)
    bg.fillRect(0, DOCK_Y - 18, 45, 22)
    // Dock surface
    bg.fillStyle(0x8b6340)
    bg.fillRect(40, DOCK_Y - 18, LAUNCH_X - 40, 18)
    bg.fillStyle(0x7a5630)
    for (let px = 70; px < LAUNCH_X; px += 28) {
      bg.fillRect(px, DOCK_Y - 18, 2, 18)
    }
    // Dock end post
    bg.fillStyle(0x6a4020)
    bg.fillRect(LAUNCH_X - 4, DOCK_Y - 28, 8, 28)

    // ── WAVE GRAPHICS (redrawn each frame) ───────────────────────────
    this._waveGfx = this.add.graphics()

    // ── CHARACTER ─────────────────────────────────────────────────────
    this._charGfx = this.add.graphics()
    this._drawChar(this._charGfx)
    this._char = this.add.container(START_X, DOCK_Y - 22, [this._charGfx])

    // ── TITLE ─────────────────────────────────────────────────────────
    this._txt(W / 2, 22, 'DOCK JUMP', 22, '#ffffff').setOrigin(0.5).setStroke('#0a3a5a', 4)

    // ── SPEED BAR ─────────────────────────────────────────────────────
    this._speedBarBg = this.add.graphics()
    this._speedBarFg = this.add.graphics()
    this._drawSpeedBar(0)
    this._speedLabel = this._txt(14, H - 52, 'SPEED', 12, '#aaaaaa').setOrigin(0, 1)
    this._hintText   = this._txt(W / 2, H - 18, '[SPACE] TAP fast to build speed!', 13, '#e8e0c8')
      .setOrigin(0.5).setStroke('#000000', 2)

    // ── AIRTIME UI ────────────────────────────────────────────────────
    this._bufText = this._txt(W - 16, 50, '', 22, '#f1c40f')
      .setOrigin(1, 0).setStroke('#000000', 3).setVisible(false)
    this._trickFlash = this._txt(W / 2, 175, '', 26, '#f1c40f')
      .setOrigin(0.5).setStroke('#000000', 4).setVisible(false)
    this._cheatSheet = this._txt(W - 16, 90, this._buildCheatSheet(), 10, '#778899')
      .setOrigin(1, 0).setLineSpacing(3).setVisible(false)

    // ── RESULT OVERLAY ────────────────────────────────────────────────
    this._resultOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88).setVisible(false)
    this._resultTitle   = this._txt(W / 2, 100, '', 28, '#f1c40f').setOrigin(0.5).setStroke('#000000', 4).setVisible(false)
    this._resultRating  = this._txt(W / 2, 150, '', 18, '#ffffff').setOrigin(0.5).setStroke('#000000', 3).setVisible(false)
    this._resultTricks  = this._txt(W / 2, 240, '', 15, '#d0d0c0').setOrigin(0.5).setLineSpacing(4).setVisible(false)
    this._resultTotal   = this._txt(W / 2, 420, '', 20, '#f1c40f').setOrigin(0.5).setStroke('#000000', 3).setVisible(false)
    this._resultHint    = this._txt(W / 2, H - 28, '[ESC] Back to the dock', 14, '#777777').setOrigin(0.5).setVisible(false)

    // ── INPUT ─────────────────────────────────────────────────────────
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._cursors  = this.input.keyboard.createCursorKeys()
    this._escKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    this._cursors.up.on('down',    () => this._onArrow('up'))
    this._cursors.down.on('down',  () => this._onArrow('down'))
    this._cursors.left.on('down',  () => this._onArrow('left'))
    this._cursors.right.on('down', () => this._onArrow('right'))
    this._escKey.on('down', () => { if (this._phase === 'result') this._exit() })

    // ── RUNUP TIMER ───────────────────────────────────────────────────
    this._countdown = 3
    this.time.addEvent({
      delay: 1000, repeat: 2,
      callback: () => { this._countdown = Math.max(0, this._countdown - 1) },
    })
    this.time.delayedCall(3000, () => {
      if (this._phase === 'runup') this._startAirtime()
    })

    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  // ── UPDATE ───────────────────────────────────────────────────────────

  update(time) {
    this._drawWaves(time)

    if (this._phase === 'runup') {
      if (Phaser.Input.Keyboard.JustDown(this._spaceKey)) {
        this._speed = Math.min(1, this._speed + 0.14)
      }
      this._speed = Math.max(0, this._speed - 0.008)
      this._drawSpeedBar(this._speed)
      this._hintText.setText(`[SPACE] TAP fast to build speed!   (${this._countdown})`)

      // Move character along dock and animate running
      this._charRunX = Math.min(LAUNCH_X - 20, this._charRunX + this._speed * 2.5)
      this._char.setPosition(this._charRunX, DOCK_Y - 22)
      this._drawCharRunning(time)
    }

    if (this._phase === 'airtime') {
      const t  = Math.min(1, (time - this._airStart) / this._airDuration)
      const cx = this._arcStartX + t * this._jumpDist
      const cy = (DOCK_Y - 22) - this._peakHeight * 4 * t * (1 - t)
      this._char.setPosition(cx, cy)
      if (t >= 1) this._startEntry()
    }
  }

  // ── PHASE TRANSITIONS ────────────────────────────────────────────────

  _startAirtime() {
    this._phase       = 'airtime'
    this._airDuration = 2500 + this._speed * 2500
    this._jumpDist    = 120  + this._speed * 220
    this._peakHeight  = 90   + this._speed * 160
    this._arcStartX   = this._char.x
    this._airStart    = this.time.now
    this._score       = 0
    this._tricks      = []
    this._seqBuf      = []

    // Squash-launch kick: quick stretch upward then release
    this.tweens.add({
      targets: this._char,
      scaleX: { from: 0.75, to: 1 }, scaleY: { from: 1.3, to: 1 },
      duration: 220, ease: 'Back.easeOut',
    })

    this._speedBarBg.setVisible(false)
    this._speedBarFg.setVisible(false)
    this._speedLabel.setVisible(false)
    this._hintText.setText('Enter arrow combos for tricks!').setFontSize(12)
    this._bufText.setVisible(true)
    this._cheatSheet.setVisible(true)
  }

  _startEntry() {
    if (this._phase !== 'airtime') return
    this._phase = 'entry'

    const normalised = ((this._char.angle % 360) + 360) % 360
    const deviation  = Math.min(normalised, 360 - normalised)
    if (deviation < 25) {
      this._score += 100
      this._showFlash('Clean Entry! +100', '#44ff88')
    } else {
      this._showFlash('Splash!', '#55aaff')
    }

    this._splashEffect(this._char.x, DOCK_Y + 6)
    this.cameras.main.shake(220, 0.013)
    this.time.delayedCall(1300, () => this._showResult())
  }

  _showResult() {
    this._phase = 'result'
    this._bufText.setVisible(false)
    this._cheatSheet.setVisible(false)
    this._trickFlash.setVisible(false)
    this._hintText.setVisible(false)

    const rating = this._score >= 800 ? 'Legend 🌊'
      : this._score >= 400 ? 'Daredevil 💥'
      : this._score >= 200 ? 'Amateur 🏄'
      : 'Cannonball 🐣'

    const trickLines = this._tricks.length
      ? this._tricks.map(t => `${t.name}  +${t.pts}`).join('\n')
      : '(no tricks)'

    this._resultOverlay.setVisible(true)
    this._resultTitle.setText('DOCK JUMP').setVisible(true).setAlpha(0)
    this._resultRating.setText(rating).setVisible(true).setAlpha(0)
    this._resultTricks.setText(trickLines).setVisible(true).setAlpha(0)
    this._resultTotal.setText(`Total: ${this._score} pts`).setVisible(true).setAlpha(0)
    this._resultHint.setVisible(true).setAlpha(0)

    this.tweens.add({
      targets: [this._resultTitle, this._resultRating, this._resultTricks, this._resultTotal, this._resultHint],
      alpha: 1, duration: 650,
    })
  }

  // ── TRICK INPUT ──────────────────────────────────────────────────────

  _onArrow(dir) {
    if (this._phase !== 'airtime') return

    this._seqBuf.push(dir)
    if (this._seqBuf.length > 4) this._seqBuf.shift()
    this._bufText.setText(this._seqBuf.map(d => DIR_ARROW[d]).join(' '))

    for (const trick of TRICKS) {
      if (tailMatches(this._seqBuf, trick.seq)) {
        this._triggerTrick(trick)
        return
      }
    }

    if (this._seqBuf.length >= 4) {
      this._score = Math.max(0, this._score - 50)
      this._showFlash('BAIL! −50', '#ff4444')
      this._seqBuf = []
      this._bufText.setText('')
    }
  }

  _triggerTrick(trick) {
    this._tricks.push({ name: trick.name, pts: trick.pts })
    this._score += trick.pts
    this._seqBuf = []
    this._bufText.setText('')

    this.tweens.add({
      targets: this._char,
      angle: this._char.angle + trick.delta,
      duration: 600,
      ease: 'Sine.easeInOut',
    })
    this._showFlash(`${trick.name}  +${trick.pts}`, '#f1c40f')
  }

  // ── VISUALS ───────────────────────────────────────────────────────────

  _drawCharRunning(time) {
    const spd   = this._speed
    const phase = time * (0.004 + spd * 0.008)  // faster legs at higher speed
    const swing = Math.sin(phase) * (8 + spd * 14)  // leg swing amplitude
    const arm   = -Math.sin(phase) * (5 + spd * 8)  // arms oppose same-side leg
    const lean  = spd * 6                            // forward body lean
    const headBob = -Math.abs(Math.sin(phase)) * 2  // head dips each stride

    const g = this._charGfx
    g.clear()

    // Shadow (stretches as speed increases)
    g.fillStyle(0x000000, 0.22)
    g.fillEllipse(lean * 0.4, 24, 14 + spd * 10, 5)

    // Left leg (swings forward/back)
    const lFootX = lean - swing
    const lFootY = 22
    g.lineStyle(5, 0x334477, 1)
    g.beginPath()
    g.moveTo(lean, 6)
    g.lineTo(lean - swing * 0.4, 14)  // knee
    g.lineTo(lFootX, lFootY)
    g.strokePath()
    // Left foot
    g.fillStyle(0x223355)
    g.fillRect(lFootX - 6, lFootY - 2, 10, 4)

    // Right leg (opposite phase)
    const rFootX = lean + swing
    const rFootY = 22
    g.lineStyle(5, 0x4466aa, 1)
    g.beginPath()
    g.moveTo(lean, 6)
    g.lineTo(lean + swing * 0.4, 14)  // knee
    g.lineTo(rFootX, rFootY)
    g.strokePath()
    // Right foot
    g.fillStyle(0x223355)
    g.fillRect(rFootX - 6, rFootY - 2, 10, 4)

    // Body (leans forward with speed)
    g.fillStyle(0xe84040)
    g.fillRect(lean - 7, -10, 14, 18)

    // Left arm (swings back when left leg goes forward)
    g.lineStyle(4, 0xf2c88a, 1)
    g.lineBetween(lean, -5, lean + arm - 8, 5)

    // Right arm (swings forward when right leg goes forward)
    g.lineBetween(lean, -5, lean - arm + 8, 5)

    // Head with bob
    const hx = lean + spd * 2
    const hy = -22 + headBob
    g.fillStyle(0x1a1a1a)
    g.fillCircle(hx, hy, 11)
    g.fillStyle(0xf2c88a)
    g.fillCircle(hx, hy, 9)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(hx - 3, hy - 1, 1.5)
    g.fillCircle(hx + 3, hy - 1, 1.5)
  }

  _drawChar(g) {
    g.clear()
    // Shadow
    g.fillStyle(0x000000, 0.28)
    g.fillEllipse(0, 20, 18, 6)
    // Legs
    g.fillStyle(0x334477)
    g.fillRect(-7, 6, 5, 14)
    g.fillRect(2,  6, 5, 14)
    // Body
    g.fillStyle(0xe84040)
    g.fillRect(-7, -10, 14, 18)
    // Arms
    g.fillStyle(0xf2c88a)
    g.fillRect(-13, -8, 7, 4)
    g.fillRect(6,   -8, 7, 4)
    // Head outline
    g.fillStyle(0x1a1a1a)
    g.fillCircle(0, -21, 11)
    // Head
    g.fillStyle(0xf2c88a)
    g.fillCircle(0, -21, 9)
    // Eyes
    g.fillStyle(0x1a1a1a)
    g.fillCircle(-3, -22, 1.5)
    g.fillCircle(3,  -22, 1.5)
  }

  _drawWaves(time) {
    this._waveGfx.clear()
    for (let wi = 0; wi < 3; wi++) {
      this._waveGfx.lineStyle(1.5, 0xaaddee, 0.16 - wi * 0.04)
      this._waveGfx.beginPath()
      for (let x = 0; x <= W; x += 8) {
        const y = DOCK_Y + 8 + wi * 14 + Math.sin(x * 0.022 + time * 0.0018 + wi * 1.8) * 4
        x === 0 ? this._waveGfx.moveTo(x, y) : this._waveGfx.lineTo(x, y)
      }
      this._waveGfx.strokePath()
    }
  }

  _drawSpeedBar(frac) {
    const bx = 14, by = H - 40, bw = 200, bh = 14
    this._speedBarBg.clear()
    this._speedBarBg.fillStyle(0x222222)
    this._speedBarBg.fillRect(bx, by, bw, bh)
    this._speedBarBg.lineStyle(1, 0x555555)
    this._speedBarBg.strokeRect(bx, by, bw, bh)

    this._speedBarFg.clear()
    if (frac > 0) {
      const color = frac < 0.5 ? 0x44cc44 : frac < 0.75 ? 0xeecc00 : 0xff4422
      this._speedBarFg.fillStyle(color)
      this._speedBarFg.fillRect(bx + 1, by + 1, Math.floor((bw - 2) * frac), bh - 2)
    }
  }

  _splashEffect(sx, sy) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2
      const dist  = 20 + Math.random() * 28
      const g = this.add.graphics()
      g.fillStyle(0xaaddff, 0.85)
      g.fillEllipse(0, 0, 5 + Math.random() * 6, 4 + Math.random() * 4)
      g.setPosition(sx, sy)
      this.tweens.add({
        targets: g,
        x: sx + Math.cos(angle) * dist,
        y: sy + Math.sin(angle) * dist - 18,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 480 + Math.random() * 280,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      })
    }
  }

  _showFlash(msg, color) {
    this._trickFlash.setText(msg).setColor(color).setAlpha(1).setVisible(true)
    this.tweens.killTweensOf(this._trickFlash)
    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: this._trickFlash, alpha: 0, duration: 350,
        onComplete: () => this._trickFlash.setVisible(false),
      })
    })
  }

  _buildCheatSheet() {
    return [
      '↑↑ Backflip       200',
      '↓↓ Frontflip      200',
      '←← Left Spin      150',
      '→→ Right Spin     150',
      '↑↑↑ 540           350',
      '↑↑↑↑ Dbl.Back     500',
      '↓↓↓↓ Dbl.Front    500',
      '↑↓↑ Gainer        400',
      '←→← Helicopter    300',
    ].join('\n')
  }

  // ── EXIT ─────────────────────────────────────────────────────────────

  _exit() {
    if (this._exiting) return
    this._exiting = true
    this.scene.get('GameScene')?.events.emit('result:dockjump', { score: this._score })
    this.cameras.main.fadeOut(350, 0, 0, 0)
    this.time.delayedCall(370, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }

  _txt(x, y, msg, size, color) {
    return this.add.text(x, y, msg, {
      fontSize: `${size}px`, fontFamily: 'monospace', color,
    })
  }
}
