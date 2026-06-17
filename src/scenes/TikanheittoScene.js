export class TikanheittoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TikanheittoScene' })
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height

    this._phase = 'aiming'
    this._score = 0
    this._throwsUsed = 0
    this._throwScores = []
    this._boardCX = W * 0.5
    this._boardCY = H * 0.47
    this._boardR = 160
    this._ringCount = 10
    this._ringW = this._boardR / this._ringCount

    this._throwX = 0
    this._throwY = 0
    this._dartMarkers = []

    // Background
    this.add.rectangle(W * 0.5, H * 0.5, W, H, 0x1a2e1a)

    // Felt texture grid
    const feltGfx = this.add.graphics()
    feltGfx.lineStyle(1, 0x1e3a1e, 0.3)
    for (let x = 0; x < W; x += 20) feltGfx.lineBetween(x, 0, x, H)
    for (let y = 0; y < H; y += 20) feltGfx.lineBetween(0, y, W, y)

    this._drawBoard()
    this._buildHUD()

    this._crosshair = this.add.graphics()
    this._drawCrosshair(0, 0)

    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this._eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    this.cameras.main.setBackgroundColor(0x000000)
    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  _drawBoard() {
    const gfx = this.add.graphics()
    const cx = this._boardCX
    const cy = this._boardCY
    const R = this._boardR
    const rw = this._ringW

    // Outer wood border
    gfx.fillStyle(0x8b5e3c)
    gfx.fillCircle(cx, cy, R + 12)

    // Rings from outside in
    const colors = [0xf5f0dc, 0xcc2200]
    for (let i = this._ringCount; i >= 1; i--) {
      gfx.fillStyle(colors[(i - 1) % 2])
      gfx.fillCircle(cx, cy, i * rw)
    }

    // Bullseye
    gfx.fillStyle(0xcc0000)
    gfx.fillCircle(cx, cy, rw)
    gfx.fillStyle(0x111111)
    gfx.fillCircle(cx, cy, 6)

    // Ring number labels
    for (let i = 1; i <= this._ringCount; i++) {
      const label = i === this._ringCount ? '10' : String(i)
      const r = (i - 0.5) * rw
      const textColor = i % 2 === 0 ? '#f5f0dc' : '#cc2200'
      this.add.text(cx + r * 0.7, cy, label, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: textColor,
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5)
    }

    // Center cross mark
    gfx.lineStyle(1, 0xffffff, 0.6)
    gfx.lineBetween(cx - 4, cy, cx + 4, cy)
    gfx.lineBetween(cx, cy - 4, cx, cy + 4)
  }

  _buildHUD() {
    const W = this.scale.width
    const H = this.scale.height

    this.add.text(W * 0.5, 22, 'TIKANHEITTO', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#e8d5a3',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    this._throwText = this.add.text(20, 22, 'Throw 1 / 5', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0, 0.5)

    this._scoreText = this.add.text(W - 20, 22, 'Score: 0', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(1, 0.5)

    this._hintText = this.add.text(W * 0.5, H - 20, '[ SPACE ]  Throw', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5, 1)
  }

  _drawCrosshair(offX, offY) {
    const gfx = this._crosshair
    gfx.clear()
    const cx = this._boardCX + offX
    const cy = this._boardCY + offY
    const r = 10
    gfx.lineStyle(2, 0xffffff, 0.85)
    gfx.strokeCircle(cx, cy, r)
    gfx.lineBetween(cx - 18, cy, cx - r - 2, cy)
    gfx.lineBetween(cx + r + 2, cy, cx + 18, cy)
    gfx.lineBetween(cx, cy - 18, cx, cy - r - 2)
    gfx.lineBetween(cx, cy + r + 2, cx, cy + 18)
  }

  update(time) {
    if (this._phase === 'aiming') {
      const speed = 1 + this._throwsUsed * 0.1
      const R = this._boardR * 0.75
      const xOff = Math.sin(time * 0.0012 * speed) * R * 0.65
                 + Math.sin(time * 0.0007 * speed) * R * 0.20
      const yOff = Math.cos(time * 0.0009 * speed) * R * 0.55
                 + Math.cos(time * 0.0013 * speed) * R * 0.25

      this._currentOffX = xOff
      this._currentOffY = yOff
      this._drawCrosshair(xOff, yOff)

      if (Phaser.Input.Keyboard.JustDown(this._spaceKey) ||
          Phaser.Input.Keyboard.JustDown(this._eKey)) {
        this._throw()
      }
    } else if (this._phase === 'result') {
      if (Phaser.Input.Keyboard.JustDown(this._spaceKey) ||
          Phaser.Input.Keyboard.JustDown(this._eKey)) {
        this._exit()
      }
    }
  }

  _throw() {
    this._phase = 'throwing'
    this._crosshair.setVisible(false)

    const landX = this._boardCX + this._currentOffX
    const landY = this._boardCY + this._currentOffY
    const dx = landX - this._boardCX
    const dy = landY - this._boardCY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const ringScore = dist > this._boardR ? 0
      : Math.max(0, this._ringCount - Math.floor(dist / this._ringW))

    this._throwScores.push(ringScore)
    this._score += ringScore
    this._throwsUsed++

    // Dart marker
    const marker = this.add.graphics()
    marker.fillStyle(0x5c3317)
    marker.fillTriangle(landX, landY - 8, landX - 5, landY + 6, landX + 5, landY + 6)
    marker.lineStyle(1, 0xffd700)
    marker.strokeTriangle(landX, landY - 8, landX - 5, landY + 6, landX + 5, landY + 6)
    this._dartMarkers.push(marker)

    // Score flash
    const scoreLabel = ringScore === 0 ? 'Miss!' : `+${ringScore}`
    const flashColor = ringScore >= 9 ? '#ffd700' : ringScore >= 6 ? '#ff8800' : '#ffffff'
    const flash = this.add.text(landX + 14, landY - 14, scoreLabel, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: flashColor,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5)
    this.tweens.add({
      targets: flash,
      y: flash.y - 24,
      alpha: 0,
      duration: 700,
      onComplete: () => flash.destroy(),
    })

    this._scoreText.setText(`Score: ${this._score}`)

    this.time.delayedCall(350, () => {
      if (this._throwsUsed >= 5) {
        this._showResult()
      } else {
        this._throwText.setText(`Throw ${this._throwsUsed + 1} / 5`)
        this._phase = 'aiming'
        this._crosshair.setVisible(true)
      }
    })
  }

  _showResult() {
    this._phase = 'result'
    this._crosshair.setVisible(false)
    this._hintText.setText('[ SPACE ]  Return')

    const W = this.scale.width
    const H = this.scale.height

    let medal = ''
    let medalColor = '#ffffff'
    if (this._score > 45) { medal = '🥇 GOLD'; medalColor = '#ffd700' }
    else if (this._score > 35) { medal = '🥈 SILVER'; medalColor = '#c0c0c0' }
    else if (this._score > 25) { medal = '🥉 BRONZE'; medalColor = '#cd7f32' }
    else { medal = 'No medal'; medalColor = '#888888' }

    // Dim overlay
    const overlay = this.add.rectangle(W * 0.5, H * 0.5, W, H, 0x000000, 0.7)

    // Result panel
    const panelW = 320
    const panelH = 280
    const px = W * 0.5
    const py = H * 0.5
    this.add.rectangle(px, py, panelW, panelH, 0x1a2e1a)
    this.add.rectangle(px, py, panelW, panelH, 0x000000, 0).setStrokeStyle(2, 0xe8d5a3)

    this.add.text(px, py - 110, 'RESULT', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#e8d5a3',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5)

    this.add.text(px, py - 75, medal, {
      fontSize: '26px',
      fontFamily: 'monospace',
      color: medalColor,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    this.add.text(px, py - 38, `Total: ${this._score} points`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5)

    // Per-throw breakdown
    const breakdown = this._throwScores.map((s, i) =>
      `Throw ${i + 1}:  ${s === 0 ? 'Miss' : `${s} pts`}`
    ).join('\n')
    this.add.text(px, py + 30, breakdown, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#cccccc',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5)
  }

  _exit() {
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.time.delayedCall(320, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
