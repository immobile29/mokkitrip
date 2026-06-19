export class TikanheittoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TikanheittoScene' })
  }

  create() {
    const W = this.scale.width   // 900
    const H = this.scale.height  // 600

    this._phase = 'h_bar'
    this._score = 0
    this._throwsUsed = 0
    this._throwScores = []
    this._hPos = 0.5
    this._vPos = 0.5
    this._dartMarkers = []

    // Dartboard (centre of screen)
    this._boardCX = 415
    this._boardCY = 288
    this._boardR  = 162

    // H-bar at the bottom, V-bar on the right edge
    this._hBar = { x: 18,  y: 524, w: 808, h: 34 }
    this._vBar = { x: 840, y: 55,  w: 34,  h: 452 }

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e)

    // Draw static dartboard
    this._drawBoard()

    // Gradient bars (static)
    this._hBarGfx = this.add.graphics()
    this._vBarGfx = this.add.graphics()
    this._buildGradientBar(this._hBarGfx, this._hBar, false)
    this._buildGradientBar(this._vBarGfx, this._vBar, true)

    // Bar labels
    this._hLabel = this._txt(this._hBar.x + this._hBar.w / 2, this._hBar.y - 8, 'AIM', 12, '#aaaaaa').setOrigin(0.5, 1)
    this._vLabel = this._txt(this._vBar.x + this._vBar.w / 2, this._vBar.y - 8, 'POWER', 11, '#aaaaaa').setOrigin(0.5, 1)

    // Moving arrow (redrawn each frame)
    this._arrowGfx = this.add.graphics()

    // Frozen aim marker (shown during v-bar phase)
    this._lockGfx = this.add.graphics()

    // HUD
    this._txt(W / 2, 24, 'TIKANHEITTO', 20, '#e8d5a3').setOrigin(0.5).setStroke('#000000', 3)
    this._throwText = this._txt(18, 24, 'Throw 1 / 5', 13, '#ffffff').setOrigin(0, 0.5)
    this._scoreText = this._txt(W - 18, 24, 'Score: 0', 13, '#ffffff').setOrigin(1, 0.5)
    this._hintText  = this._txt(W / 2, H - 8, '[ SPACE ]  Lock Aim', 13, '#aaaaaa').setOrigin(0.5, 1)

    this._keys = {
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      e:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }

    this._enterPhase('h_bar')
    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  _txt(x, y, str, size, color) {
    return this.add.text(x, y, str, { fontSize: `${size}px`, fontFamily: 'monospace', color })
  }

  _lerpColor(a, b, t) {
    const c = Math.max(0, Math.min(1, t))
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff
    return ((Math.round(ar + (br - ar) * c) << 16) |
            (Math.round(ag + (bg - ag) * c) << 8) |
             Math.round(ab + (bb - ab) * c))
  }

  _buildGradientBar(gfx, bar, vertical) {
    const { x, y, w, h } = bar
    const steps = 80
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const dist = Math.abs(t - 0.5) * 2
      const color = dist < 0.5
        ? this._lerpColor(0x22cc22, 0xddaa00, dist * 2)
        : this._lerpColor(0xddaa00, 0xcc2200, (dist - 0.5) * 2)
      gfx.fillStyle(color, 1)
      if (!vertical) {
        gfx.fillRect(x + t * w, y, w / steps + 1, h)
      } else {
        gfx.fillRect(x, y + t * h, w, h / steps + 1)
      }
    }
    gfx.lineStyle(2, 0xffffff, 0.85)
    gfx.strokeRect(x, y, w, h)
    gfx.lineStyle(2, 0xffffff, 0.4)
    if (!vertical) {
      gfx.lineBetween(x + w / 2, y - 3, x + w / 2, y + h + 3)
    } else {
      gfx.lineBetween(x - 3, y + h / 2, x + w + 3, y + h / 2)
    }
  }

  // ── dartboard ─────────────────────────────────────────────────────────────

  _drawBoard() {
    const gfx = this.add.graphics()
    const cx = this._boardCX
    const cy = this._boardCY
    const R  = this._boardR
    const rw = R / 10

    // Wood surround
    gfx.fillStyle(0x7a4b2a)
    gfx.fillCircle(cx, cy, R + 14)

    // Rings from outside in (alternating cream / red)
    const ringColors = [0xf0ead0, 0xbb1a00]
    for (let i = 10; i >= 1; i--) {
      gfx.fillStyle(ringColors[(i - 1) % 2])
      gfx.fillCircle(cx, cy, i * rw)
    }

    // Bullseye
    gfx.fillStyle(0xcc0000)
    gfx.fillCircle(cx, cy, rw * 0.6)
    gfx.fillStyle(0x111111)
    gfx.fillCircle(cx, cy, rw * 0.2)

    // Ring divider lines
    gfx.lineStyle(1, 0x000000, 0.35)
    for (let i = 1; i <= 10; i++) gfx.strokeCircle(cx, cy, i * rw)

    // Ring number labels on right side of each ring
    for (let i = 1; i <= 10; i++) {
      const r = (i - 0.5) * rw
      const col = i % 2 === 0 ? '#f0ead0' : '#cc2200'
      this.add.text(cx + r * 0.82, cy, String(i), {
        fontSize: '9px', fontFamily: 'monospace', color: col,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5)
    }
  }

  // ── phase management ──────────────────────────────────────────────────────

  _enterPhase(phase) {
    this._phase = phase
    const isH = phase === 'h_bar'
    const isV = phase === 'v_bar'

    this._hBarGfx.setVisible(true)   // always visible; arrow animates in h_bar phase
    this._hLabel.setVisible(isH)
    this._vBarGfx.setVisible(isV)
    this._vLabel.setVisible(isV)
    this._lockGfx.setVisible(isV)
    this._arrowGfx.clear()

    if (isH) this._hintText.setText('[ SPACE ]  Lock Aim').setColor('#aaaaaa')
  }

  // ── update ────────────────────────────────────────────────────────────────

  update(time) {
    const speed = 0.0020 + this._throwsUsed * 0.00030

    if (this._phase === 'h_bar') {
      const pos = (Math.sin(time * speed) + 1) / 2
      this._currentPos = pos
      this._drawHArrow(pos)
      if (this._just()) {
        this._hPos = pos
        this._freezeH(pos)
        this._enterPhase('v_bar')
      }

    } else if (this._phase === 'v_bar') {
      const pos = (Math.sin(time * speed * 1.15 + 2.0) + 1) / 2
      this._currentPos = pos
      this._drawVArrow(pos)
      if (this._just()) {
        this._vPos = pos
        this._resolveThrow()
      }

    } else if (this._phase === 'final_result') {
      if (this._just()) this._exit()
    }
  }

  _just() {
    return Phaser.Input.Keyboard.JustDown(this._keys.space) ||
           Phaser.Input.Keyboard.JustDown(this._keys.e)
  }

  // ── arrows ────────────────────────────────────────────────────────────────

  // Arrow below h-bar, tip points UP toward bar
  _drawHArrow(pos) {
    const { x, y, w, h } = this._hBar
    const ax = x + pos * w
    const ay = y + h + 14

    this._arrowGfx.clear()
    this._arrowGfx.fillStyle(0xffffff, 1)
    this._arrowGfx.fillTriangle(ax, ay - 14, ax - 9, ay + 5, ax + 9, ay + 5)
    this._arrowGfx.lineStyle(1, 0x000000, 0.6)
    this._arrowGfx.strokeTriangle(ax, ay - 14, ax - 9, ay + 5, ax + 9, ay + 5)
  }

  // Arrow left of v-bar, tip points RIGHT toward bar
  _drawVArrow(pos) {
    const { x, y, h } = this._vBar
    const ax = x - 14
    const ay = y + pos * h

    this._arrowGfx.clear()
    this._arrowGfx.fillStyle(0xffffff, 1)
    this._arrowGfx.fillTriangle(ax + 14, ay, ax - 4, ay - 9, ax - 4, ay + 9)
    this._arrowGfx.lineStyle(1, 0x000000, 0.6)
    this._arrowGfx.strokeTriangle(ax + 14, ay, ax - 4, ay - 9, ax - 4, ay + 9)
  }

  // ── aim lock ──────────────────────────────────────────────────────────────

  _freezeH(pos) {
    const { x, y, w, h } = this._hBar
    const lx = x + pos * w

    // Gold frozen tick on h-bar
    this._lockGfx.clear()
    this._lockGfx.lineStyle(3, 0xffd700, 1)
    this._lockGfx.lineBetween(lx, y - 5, lx, y + h + 5)
    this._lockGfx.fillStyle(0xffd700, 1)
    this._lockGfx.fillTriangle(lx, y + h + 16, lx - 7, y + h + 28, lx + 7, y + h + 28)

    // Quality label replaces hint text until next throw
    const acc = 1 - Math.abs(pos - 0.5) * 2
    const label = acc > 0.85 ? 'AIM: PERFECT'
                : acc > 0.60 ? 'AIM: Good'
                : acc > 0.35 ? 'AIM: OK'
                : 'AIM: Off'
    const col   = acc > 0.85 ? '#ffd700'
                : acc > 0.60 ? '#88ff44'
                : acc > 0.35 ? '#ffffff'
                : '#ff8844'
    this._hintText.setText(`${label}   [ SPACE ]  Lock Power`).setColor(col)
  }

  // ── resolve throw ─────────────────────────────────────────────────────────

  _resolveThrow() {
    this._phase = 'throw_result'
    this._arrowGfx.clear()
    this._vBarGfx.setVisible(false)
    this._vLabel.setVisible(false)
    this._lockGfx.setVisible(false)
    this._hBarGfx.setVisible(false)
    this._hLabel.setVisible(false)

    // Map bar positions → board offset (√2 scale so extreme corners ≈ board edge)
    const offX = (this._hPos - 0.5) * this._boardR * Math.SQRT2
    const offY = (this._vPos - 0.5) * this._boardR * Math.SQRT2
    const dist = Math.sqrt(offX * offX + offY * offY)
    const rw   = this._boardR / 10
    const throwScore = dist >= this._boardR ? 0 : Math.max(0, 10 - Math.floor(dist / rw))

    // Dart marker on board
    const dartX = this._boardCX + offX
    const dartY = this._boardCY + offY
    const dm = this.add.graphics()
    dm.fillStyle(0x5c3317)
    dm.fillTriangle(dartX, dartY - 9, dartX - 5, dartY + 5, dartX + 5, dartY + 5)
    dm.lineStyle(1, 0xffd700)
    dm.strokeTriangle(dartX, dartY - 9, dartX - 5, dartY + 5, dartX + 5, dartY + 5)
    this._dartMarkers.push(dm)

    this._throwScores.push(throwScore)
    this._score += throwScore
    this._throwsUsed++
    this._scoreText.setText(`Score: ${this._score}`)

    const W = this.scale.width
    const H = this.scale.height

    let msg, col
    if (throwScore === 10) { msg = 'BULLSEYE! +10'; col = '#ffd700' }
    else if (throwScore >= 8) { msg = `GREAT! +${throwScore}`; col = '#88ff44' }
    else if (throwScore >= 5) { msg = `+${throwScore}`;        col = '#ffffff' }
    else if (throwScore >= 1) { msg = `+${throwScore}`;        col = '#ffaa44' }
    else                      { msg = 'MISS!';                 col = '#ff4444' }

    const flash = this.add.text(W / 2, H / 2 + 90, msg, {
      fontSize: '42px', fontFamily: 'monospace', color: col,
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0)

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 150,
      hold: 600,
      yoyo: true,
      onComplete: () => {
        flash.destroy()
        if (this._throwsUsed >= 5) {
          this._showFinalResult()
        } else {
          this._throwText.setText(`Throw ${this._throwsUsed + 1} / 5`)
          this._lockGfx.clear()
          this._hBarGfx.setVisible(true)
          this._enterPhase('h_bar')
        }
      },
    })
  }

  // ── final result ──────────────────────────────────────────────────────────

  _showFinalResult() {
    const W = this.scale.width
    const H = this.scale.height
    this._phase = 'final_result'
    this._hintText.setText('[ SPACE ]  Return').setColor('#aaaaaa')

    let medal = 'No medal', medalCol = '#888888'
    if (this._score > 45)      { medal = '🥇 GOLD';   medalCol = '#ffd700' }
    else if (this._score > 35) { medal = '🥈 SILVER'; medalCol = '#c0c0c0' }
    else if (this._score > 25) { medal = '🥉 BRONZE'; medalCol = '#cd7f32' }

    this.add.rectangle(W / 2, H / 2, 380, 298, 0x0d0d1e, 0.93)
    this.add.rectangle(W / 2, H / 2, 380, 298, 0x000000, 0).setStrokeStyle(2, 0xe8d5a3)

    this._txt(W / 2, H / 2 - 120, 'RESULT', 20, '#e8d5a3').setOrigin(0.5).setStroke('#000000', 2)
    this._txt(W / 2, H / 2 - 80,  medal, 28, medalCol).setOrigin(0.5).setStroke('#000000', 3)
    this._txt(W / 2, H / 2 - 42,  `Total: ${this._score} / 50`, 15, '#ffffff').setOrigin(0.5)

    const breakdown = this._throwScores
      .map((s, i) => `Throw ${i + 1}:  ${s === 0 ? 'MISS' : `${s} pts`}`)
      .join('\n')
    this._txt(W / 2, H / 2 - 12, breakdown, 13, '#cccccc').setOrigin(0.5, 0).setLineSpacing(4)
  }

  // ── exit ──────────────────────────────────────────────────────────────────

  _exit() {
    this.scene.get('GameScene')?.events.emit('result:tikanheitto', { score: this._score })
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(320, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
