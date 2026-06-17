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

    // Bar geometry
    this._hBar = { x: 200, y: 228, w: 500, h: 50 }
    this._vBar = { x: 426, y: 138, w: 50, h: 310 }

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e)

    // Static gradient bars
    this._hBarGfx = this.add.graphics()
    this._vBarGfx = this.add.graphics()
    this._buildGradientBar(this._hBarGfx, this._hBar, false)
    this._buildGradientBar(this._vBarGfx, this._vBar, true)

    // Phase labels
    this._hLabel = this._makeText(W / 2, this._hBar.y - 26, '— AIM —', 14, '#cccccc').setOrigin(0.5, 1)
    this._vLabel = this._makeText(W / 2, this._vBar.y - 26, '— POWER —', 14, '#cccccc').setOrigin(0.5, 1)

    // Moving arrow
    this._arrowGfx = this.add.graphics()

    // Locked aim indicator (shown during v_bar phase)
    this._lockGfx = this.add.graphics()
    this._lockText = this._makeText(W / 2, 67, '', 12, '#88ff88').setOrigin(0.5, 0)

    // HUD
    this._makeText(W / 2, 24, 'TIKANHEITTO', 20, '#e8d5a3')
      .setOrigin(0.5)
      .setStroke('#000000', 3)

    this._throwText = this._makeText(20, 24, 'Throw 1 / 5', 13, '#ffffff').setOrigin(0, 0.5)
    this._scoreText = this._makeText(W - 20, 24, 'Score: 0', 13, '#ffffff').setOrigin(1, 0.5)
    this._hintText  = this._makeText(W / 2, H - 18, '[ SPACE ]  Lock Aim', 13, '#aaaaaa').setOrigin(0.5, 1)

    this._keys = {
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      e:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }

    this._enterPhase('h_bar')
    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  _makeText(x, y, str, size, color) {
    return this.add.text(x, y, str, {
      fontSize: `${size}px`,
      fontFamily: 'monospace',
      color,
    })
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
      const dist = Math.abs(t - 0.5) * 2   // 0 at center, 1 at edges
      let color
      if (dist < 0.5) {
        color = this._lerpColor(0x22cc22, 0xddaa00, dist * 2)         // green → yellow
      } else {
        color = this._lerpColor(0xddaa00, 0xcc2200, (dist - 0.5) * 2) // yellow → red
      }
      gfx.fillStyle(color, 1)
      if (!vertical) {
        gfx.fillRect(x + t * w, y, w / steps + 1, h)
      } else {
        gfx.fillRect(x, y + t * h, w, h / steps + 1)
      }
    }
    gfx.lineStyle(2, 0xffffff, 0.85)
    gfx.strokeRect(x, y, w, h)
    gfx.lineStyle(2, 0xffffff, 0.45)
    if (!vertical) {
      gfx.lineBetween(x + w / 2, y - 3, x + w / 2, y + h + 3)
    } else {
      gfx.lineBetween(x - 3, y + h / 2, x + w + 3, y + h / 2)
    }
  }

  _buildMiniBar(gfx, x, y, w, h) {
    const steps = 40
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const dist = Math.abs(t - 0.5) * 2
      let color
      if (dist < 0.5) {
        color = this._lerpColor(0x22cc22, 0xddaa00, dist * 2)
      } else {
        color = this._lerpColor(0xddaa00, 0xcc2200, (dist - 0.5) * 2)
      }
      gfx.fillStyle(color, 1)
      gfx.fillRect(x + t * w, y, w / steps + 1, h)
    }
    gfx.lineStyle(1, 0xffffff, 0.7)
    gfx.strokeRect(x, y, w, h)
  }

  // ── phase management ──────────────────────────────────────────────────────

  _enterPhase(phase) {
    this._phase = phase
    const isH = phase === 'h_bar'
    const isV = phase === 'v_bar'

    this._hBarGfx.setVisible(isH)
    this._hLabel.setVisible(isH)
    this._vBarGfx.setVisible(isV)
    this._vLabel.setVisible(isV)
    this._lockGfx.setVisible(isV)
    this._lockText.setVisible(isV)
    this._arrowGfx.clear()

    if (isH) this._hintText.setText('[ SPACE ]  Lock Aim')
    if (isV) this._hintText.setText('[ SPACE ]  Lock Power')
  }

  // ── update loop ───────────────────────────────────────────────────────────

  update(time) {
    const speed = 0.0020 + this._throwsUsed * 0.00030

    if (this._phase === 'h_bar') {
      const pos = (Math.sin(time * speed) + 1) / 2   // 0 → 1
      this._currentPos = pos
      this._drawHArrow(pos)

      if (this._justPressed()) {
        this._hPos = pos
        this._showLockH(pos)
        this._enterPhase('v_bar')
      }

    } else if (this._phase === 'v_bar') {
      const pos = (Math.sin(time * speed * 1.15 + 2.0) + 1) / 2
      this._currentPos = pos
      this._drawVArrow(pos)

      if (this._justPressed()) {
        this._vPos = pos
        this._resolveThrow()
      }

    } else if (this._phase === 'final_result') {
      if (this._justPressed()) this._exit()
    }
  }

  _justPressed() {
    return Phaser.Input.Keyboard.JustDown(this._keys.space) ||
           Phaser.Input.Keyboard.JustDown(this._keys.e)
  }

  // ── arrow drawing ─────────────────────────────────────────────────────────

  _drawHArrow(pos) {
    const { x, y, w, h } = this._hBar
    const ax = x + pos * w
    const ay = y + h + 12   // below bar; tip points UP toward bar

    this._arrowGfx.clear()
    this._arrowGfx.fillStyle(0xffffff, 1)
    this._arrowGfx.fillTriangle(ax, ay - 12, ax - 9, ay + 6, ax + 9, ay + 6)
    this._arrowGfx.lineStyle(1, 0x000000, 0.7)
    this._arrowGfx.strokeTriangle(ax, ay - 12, ax - 9, ay + 6, ax + 9, ay + 6)
  }

  _drawVArrow(pos) {
    const { x, y, w, h } = this._vBar
    const ax = x + w + 12   // right of bar; tip points LEFT toward bar
    const ay = y + pos * h

    this._arrowGfx.clear()
    this._arrowGfx.fillStyle(0xffffff, 1)
    this._arrowGfx.fillTriangle(ax - 12, ay, ax + 6, ay - 9, ax + 6, ay + 9)
    this._arrowGfx.lineStyle(1, 0x000000, 0.7)
    this._arrowGfx.strokeTriangle(ax - 12, ay, ax + 6, ay - 9, ax + 6, ay + 9)
  }

  // ── lock indicator ────────────────────────────────────────────────────────

  _showLockH(pos) {
    const W = this.scale.width
    const mw = 320, mh = 18
    const mx = (W - mw) / 2
    const my = 50

    this._lockGfx.clear()
    this._buildMiniBar(this._lockGfx, mx, my, mw, mh)

    const lx = mx + pos * mw
    this._lockGfx.lineStyle(2, 0xffffff, 1)
    this._lockGfx.lineBetween(lx, my - 5, lx, my + mh + 5)
    this._lockGfx.fillStyle(0xffffff, 1)
    this._lockGfx.fillTriangle(lx, my - 13, lx - 5, my - 5, lx + 5, my - 5)

    const acc = 1 - Math.abs(pos - 0.5) * 2
    const label = acc > 0.85 ? 'AIM: PERFECT'
                : acc > 0.60 ? 'AIM: Good'
                : acc > 0.35 ? 'AIM: OK'
                : 'AIM: Off'
    const col   = acc > 0.85 ? '#ffd700'
                : acc > 0.60 ? '#88ff44'
                : acc > 0.35 ? '#ffffff'
                : '#ff8844'
    this._lockText.setText(label).setColor(col).setY(my + mh + 5)
  }

  // ── throw resolution ──────────────────────────────────────────────────────

  _resolveThrow() {
    this._phase = 'throw_result'
    this._arrowGfx.clear()
    this._vBarGfx.setVisible(false)
    this._vLabel.setVisible(false)
    this._lockGfx.setVisible(false)
    this._lockText.setVisible(false)

    const hAcc = 1 - Math.abs(this._hPos - 0.5) * 2
    const vAcc = 1 - Math.abs(this._vPos - 0.5) * 2
    const throwScore = Math.round(hAcc * vAcc * 10)

    this._throwScores.push(throwScore)
    this._score += throwScore
    this._throwsUsed++
    this._scoreText.setText(`Score: ${this._score}`)

    const W = this.scale.width
    const H = this.scale.height

    let msg, col
    if (throwScore === 10) { msg = 'BULLSEYE!  +10'; col = '#ffd700' }
    else if (throwScore >= 8) { msg = `GREAT!  +${throwScore}`;  col = '#88ff44' }
    else if (throwScore >= 5) { msg = `Good  +${throwScore}`;    col = '#ffffff' }
    else if (throwScore >= 2) { msg = `+${throwScore}`;          col = '#ffaa44' }
    else                      { msg = 'MISS!';                   col = '#ff4444' }

    const flash = this.add.text(W / 2, H / 2, msg, {
      fontSize: '44px', fontFamily: 'monospace', color: col,
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0)

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 160,
      hold: 620,
      yoyo: true,
      onComplete: () => {
        flash.destroy()
        if (this._throwsUsed >= 5) {
          this._showFinalResult()
        } else {
          this._throwText.setText(`Throw ${this._throwsUsed + 1} / 5`)
          this._lockGfx.clear()
          this._lockText.setText('')
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
    this._hintText.setText('[ SPACE ]  Return')

    let medal = 'No medal', medalCol = '#888888'
    if (this._score > 45)      { medal = '🥇 GOLD';   medalCol = '#ffd700' }
    else if (this._score > 35) { medal = '🥈 SILVER'; medalCol = '#c0c0c0' }
    else if (this._score > 25) { medal = '🥉 BRONZE'; medalCol = '#cd7f32' }

    this.add.rectangle(W / 2, H / 2, 380, 320, 0x0d0d1e, 0.96)
    this.add.rectangle(W / 2, H / 2, 380, 320, 0x000000, 0).setStrokeStyle(2, 0xe8d5a3)

    this._makeText(W / 2, H / 2 - 132, 'RESULT', 20, '#e8d5a3')
      .setOrigin(0.5).setStroke('#000000', 2)

    this._makeText(W / 2, H / 2 - 92, medal, 28, medalCol)
      .setOrigin(0.5).setStroke('#000000', 3)

    this._makeText(W / 2, H / 2 - 52, `Total: ${this._score} / 50`, 15, '#ffffff')
      .setOrigin(0.5)

    const breakdown = this._throwScores
      .map((s, i) => `Throw ${i + 1}:  ${s === 0 ? 'MISS' : `${s} pts`}`)
      .join('\n')
    this._makeText(W / 2, H / 2 - 20, breakdown, 13, '#cccccc')
      .setOrigin(0.5, 0)
      .setLineSpacing(4)
  }

  // ── exit ──────────────────────────────────────────────────────────────────

  _exit() {
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(320, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
