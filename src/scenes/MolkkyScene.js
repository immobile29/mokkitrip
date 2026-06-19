const CLUSTER_CX  = 415
const CLUSTER_CY  = 220
const AIM_SPREAD  = 300
const PWR_SPREAD  = 220
const HIT_R       = 40
const PIN_R       = 14
const WIN_SCORE   = 25

// [number, dx, dy] relative to cluster centre; front row closest to thrower (larger dy)
const PIN_LAYOUT = [
  [1,  -19, 76], [2,  19,  76],
  [3,  -38, 38], [4,   0,  38], [5,  38,  38],
  [6,  -57,  0], [7,  -19,  0], [8,  19,   0], [9,  57,  0],
  [10, -38, -38],[11,   0, -38],[12,  38, -38],
]

export class MolkkyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MolkkyScene' })
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height

    this._phase = 'h_bar'
    this._score = 0
    this._throws = 0
    this._hPos = 0.5
    this._vPos = 0.5

    this._hBar = { x: 18, y: 524, w: 808, h: 34 }
    this._vBar = { x: 840, y: 55, w: 34, h: 452 }

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a3a1a)
    this.add.rectangle(W / 2, H * 0.65, 120, H * 0.7, 0x22441a)

    this._hBarGfx = this.add.graphics()
    this._vBarGfx = this.add.graphics()
    this._buildGradientBar(this._hBarGfx, this._hBar, false)
    this._buildGradientBar(this._vBarGfx, this._vBar, true)

    this._hLabel = this._txt(this._hBar.x + this._hBar.w / 2, this._hBar.y - 8, 'AIM', 12, '#aaaaaa').setOrigin(0.5, 1)
    this._vLabel = this._txt(this._vBar.x + this._vBar.w / 2, this._vBar.y - 8, 'POWER', 11, '#aaaaaa').setOrigin(0.5, 1)

    this._pins = PIN_LAYOUT.map(([number, dx, dy]) => ({
      number,
      x: CLUSTER_CX + dx,
      y: CLUSTER_CY + dy,
      standing: true,
    }))
    this._pinGfx = this.add.graphics()
    this._pinLabels = []
    this._redrawPins()

    this._previewGfx = this.add.graphics()
    this._arrowGfx   = this.add.graphics()
    this._lockGfx    = this.add.graphics()

    this._txt(W / 2, 24, 'MÖLKKY', 20, '#e8d5a3').setOrigin(0.5).setStroke('#000000', 3)
    this._throwText = this._txt(18, 24, 'Throw 1', 13, '#ffffff').setOrigin(0, 0.5)
    this._scoreText = this._txt(W - 18, 24, 'Score: 0 / ' + WIN_SCORE, 13, '#ffffff').setOrigin(1, 0.5)
    this._hintText  = this._txt(W / 2, H - 8, '[ SPACE ]  Lock Aim', 13, '#aaaaaa').setOrigin(0.5, 1)

    this._keys = {
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      e:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }

    this._enterPhase('h_bar')
    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  _txt(x, y, str, size, color) {
    return this.add.text(x, y, str, { fontSize: size + 'px', fontFamily: 'monospace', color })
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

  _redrawPins() {
    const gfx = this._pinGfx
    gfx.clear()
    this._pinLabels.forEach(t => t.destroy())
    this._pinLabels = []

    for (const pin of this._pins) {
      if (pin.standing) {
        gfx.fillStyle(0xf0e8c8, 1)
        gfx.fillCircle(pin.x, pin.y, PIN_R)
        gfx.lineStyle(2, 0x7a4b2a, 1)
        gfx.strokeCircle(pin.x, pin.y, PIN_R)
        const lbl = this._txt(pin.x, pin.y, String(pin.number), 10, '#2a1a00')
          .setOrigin(0.5).setStroke('#f0e8c8', 2)
        this._pinLabels.push(lbl)
      } else {
        gfx.fillStyle(0x888888, 0.4)
        gfx.fillEllipse(pin.x, pin.y, PIN_R * 2.4, PIN_R * 1.0)
        gfx.lineStyle(1, 0x555555, 0.5)
        gfx.strokeEllipse(pin.x, pin.y, PIN_R * 2.4, PIN_R * 1.0)
        const lbl = this._txt(pin.x, pin.y, String(pin.number), 9, '#555555')
          .setOrigin(0.5).setAlpha(0.5)
        this._pinLabels.push(lbl)
      }
    }
  }

  _enterPhase(phase) {
    this._phase = phase
    const isH = phase === 'h_bar'
    const isV = phase === 'v_bar'
    this._hBarGfx.setVisible(true)
    this._hLabel.setVisible(isH)
    this._vBarGfx.setVisible(isV)
    this._vLabel.setVisible(isV)
    this._lockGfx.setVisible(isV)
    this._arrowGfx.clear()
    this._previewGfx.clear()
    if (isH) this._hintText.setText('[ SPACE ]  Lock Aim').setColor('#aaaaaa')
  }

  update(time) {
    const speed = 0.0018 + this._throws * 0.00025

    if (this._phase === 'h_bar') {
      const pos = (Math.sin(time * speed) + 1) / 2
      this._currentH = pos
      this._drawHArrow(pos)
      this._drawPreview(pos, 0.5)
      if (this._just()) {
        this._hPos = pos
        this._freezeH(pos)
        this._enterPhase('v_bar')
      }
    } else if (this._phase === 'v_bar') {
      const pos = (Math.sin(time * speed * 1.15 + 2.0) + 1) / 2
      this._currentV = pos
      this._drawVArrow(pos)
      this._drawPreview(this._hPos, pos)
      if (this._just()) {
        this._vPos = pos
        this._resolveThrow()
      }
    } else if (this._phase === 'win' || this._phase === 'lose') {
      if (this._just()) this._exit()
    }
  }

  _just() {
    return Phaser.Input.Keyboard.JustDown(this._keys.space) ||
           Phaser.Input.Keyboard.JustDown(this._keys.e)
  }

  _landingPos(h, v) {
    return {
      x: CLUSTER_CX + (h - 0.5) * AIM_SPREAD,
      y: CLUSTER_CY + (v - 0.5) * PWR_SPREAD,
    }
  }

  _drawPreview(h, v) {
    const { x, y } = this._landingPos(h, v)
    this._previewGfx.clear()
    this._previewGfx.lineStyle(2, 0xffffff, 0.22)
    this._previewGfx.strokeCircle(x, y, HIT_R)
    this._previewGfx.fillStyle(0xffffff, 0.06)
    this._previewGfx.fillCircle(x, y, HIT_R)
  }

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

  _freezeH(pos) {
    const { x, y, w, h } = this._hBar
    const lx = x + pos * w
    this._lockGfx.clear()
    this._lockGfx.lineStyle(3, 0xffd700, 1)
    this._lockGfx.lineBetween(lx, y - 5, lx, y + h + 5)
    this._lockGfx.fillStyle(0xffd700, 1)
    this._lockGfx.fillTriangle(lx, y + h + 16, lx - 7, y + h + 28, lx + 7, y + h + 28)
    const acc = 1 - Math.abs(pos - 0.5) * 2
    const label = acc > 0.85 ? 'AIM: PERFECT' : acc > 0.60 ? 'AIM: Good' : acc > 0.35 ? 'AIM: OK' : 'AIM: Off'
    const col   = acc > 0.85 ? '#ffd700'       : acc > 0.60 ? '#88ff44'   : acc > 0.35 ? '#ffffff' : '#ff8844'
    this._hintText.setText(label + '   [ SPACE ]  Lock Power').setColor(col)
  }

  _resolveThrow() {
    this._phase = 'throwing'
    this._arrowGfx.clear()
    this._previewGfx.clear()
    this._vBarGfx.setVisible(false)
    this._vLabel.setVisible(false)
    this._lockGfx.setVisible(false)
    this._hBarGfx.setVisible(false)
    this._hLabel.setVisible(false)
    this._hintText.setText('')

    const { x: landX, y: landY } = this._landingPos(this._hPos, this._vPos)
    const W = this.scale.width
    const H = this.scale.height

    const stick = this.add.rectangle(W / 2, H - 60, 12, 28, 0x8b5e3c)
    this.tweens.add({
      targets: stick,
      x: landX,
      y: landY,
      duration: 580,
      ease: 'Quad.easeIn',
      onComplete: () => {
        stick.destroy()
        this._applyHit(landX, landY)
      },
    })
  }

  _applyHit(landX, landY) {
    const knocked = []
    for (const pin of this._pins) {
      if (!pin.standing) continue
      const dx = pin.x - landX
      const dy = pin.y - landY
      if (Math.sqrt(dx * dx + dy * dy) < HIT_R) {
        knocked.push(pin)
        pin.standing = false
      }
    }

    for (const pin of knocked) {
      const angle = Math.atan2(pin.y - landY, pin.x - landX)
      const dist  = 28 + Math.random() * 32
      pin.x = Phaser.Math.Clamp(pin.x + Math.cos(angle) * dist, 60, 800)
      pin.y = Phaser.Math.Clamp(pin.y + Math.sin(angle) * dist, 60, 460)
    }

    let throwScore = 0
    if (knocked.length === 1) throwScore = knocked[0].number
    else if (knocked.length > 1) throwScore = knocked.length

    this._score += throwScore
    this._throws++
    this._scoreText.setText('Score: ' + this._score + ' / ' + WIN_SCORE)
    this._throwText.setText('Throw ' + (this._throws + 1))

    this._redrawPins()

    const W = this.scale.width
    const H = this.scale.height
    let msg, col
    if (knocked.length === 0) {
      msg = 'Miss!'
      col = '#ff6666'
    } else if (knocked.length === 1) {
      msg = '+' + throwScore + '  (pin ' + knocked[0].number + ')'
      col = '#ffffff'
    } else {
      msg = '+' + throwScore + '  (' + knocked.length + ' pins!)'
      col = '#88ff44'
    }

    const flash = this.add.text(W / 2, H / 2, msg, {
      fontSize: '34px', fontFamily: 'monospace', color: col,
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0)

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 140,
      hold: 700,
      yoyo: true,
      onComplete: () => {
        flash.destroy()
        if (this._score === WIN_SCORE) {
          this._showWin()
        } else if (this._score > WIN_SCORE) {
          this._showLose()
        } else {
          for (const pin of knocked) pin.standing = true
          this._redrawPins()
          this._hBarGfx.setVisible(true)
          this._enterPhase('h_bar')
        }
      },
    })
  }

  _showWin() {
    const W = this.scale.width
    const H = this.scale.height
    this._phase = 'win'
    this._won = true
    this._hintText.setText('[ SPACE ]  Return').setColor('#aaaaaa')
    this.add.rectangle(W / 2, H / 2, 420, 220, 0x0a2a0a, 0.95)
    this.add.rectangle(W / 2, H / 2, 420, 220, 0x000000, 0).setStrokeStyle(2, 0x44ff44)
    this._txt(W / 2, H / 2 - 76, 'VOITTO! 🎉', 28, '#44ff44').setOrigin(0.5).setStroke('#000000', 3)
    this._txt(W / 2, H / 2 - 28, 'Täsmälleen 25!', 18, '#ffffff').setOrigin(0.5)
    this._txt(W / 2, H / 2 + 14, 'Throws: ' + this._throws, 14, '#aaaaaa').setOrigin(0.5)
  }

  _showLose() {
    const W = this.scale.width
    const H = this.scale.height
    this._phase = 'lose'
    this._hintText.setText('[ SPACE ]  Return').setColor('#aaaaaa')
    this.add.rectangle(W / 2, H / 2, 420, 220, 0x2a0a0a, 0.95)
    this.add.rectangle(W / 2, H / 2, 420, 220, 0x000000, 0).setStrokeStyle(2, 0xff4444)
    this._txt(W / 2, H / 2 - 76, 'YLI! Hävisit.', 28, '#ff4444').setOrigin(0.5).setStroke('#000000', 3)
    this._txt(W / 2, H / 2 - 28, 'Score: ' + this._score + ' / ' + WIN_SCORE, 18, '#ffffff').setOrigin(0.5)
    this._txt(W / 2, H / 2 + 14, 'Throws: ' + this._throws, 14, '#aaaaaa').setOrigin(0.5)
  }

  _exit() {
    this.scene.get('GameScene')?.events.emit('result:molkky', { won: !!this._won, throws: this._throws })
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(320, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
