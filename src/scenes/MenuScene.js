export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.scale
    const W = width, H = height

    // MIDSUMMER SKY - deep indigo top → rose-purple → warm orange → golden horizon
    this.add.rectangle(W/2, H * 0.15, W, H * 0.30, 0x0c0820)
    this.add.rectangle(W/2, H * 0.34, W, H * 0.16, 0x4a1030)
    this.add.rectangle(W/2, H * 0.49, W, H * 0.16, 0xb03030)
    this.add.rectangle(W/2, H * 0.62, W, H * 0.18, 0xe06020)
    this.add.rectangle(W/2, H * 0.75, W, H * 0.16, 0xf0a028)

    // Stars (visible in the darker upper sky)
    const gStars = this.add.graphics()
    gStars.fillStyle(0xffffff, 0.7)
    for (let i = 0; i < 28; i++) {
      const sx = Phaser.Math.Between(20, W - 20)
      const sy = Phaser.Math.Between(8, H * 0.26)
      gStars.fillCircle(sx, sy, Math.random() < 0.25 ? 1.5 : 1)
    }
    this.tweens.add({ targets: gStars, alpha: { from: 0.45, to: 1.0 }, yoyo: true, repeat: -1, duration: 3200, ease: 'Sine.easeInOut' })

    // SUN - low on horizon (Finnish midnight sun / midsummer)
    const sunX = W * 0.13, sunY = H * 0.60
    // Soft corona layers
    const gSunCorona = this.add.graphics()
    gSunCorona.fillStyle(0xffa020, 0.07)
    gSunCorona.fillCircle(sunX, sunY, 115)
    gSunCorona.fillStyle(0xffc030, 0.10)
    gSunCorona.fillCircle(sunX, sunY, 80)
    // Light rays
    const gRays = this.add.graphics()
    for (let a = 0; a < 360; a += 30) {
      const r = Phaser.Math.DegToRad(a)
      gRays.fillStyle(0xffa020, 0.06)
      gRays.fillTriangle(
        sunX, sunY,
        sunX + Math.cos(r - 0.13) * 140, sunY + Math.sin(r - 0.13) * 140,
        sunX + Math.cos(r + 0.13) * 140, sunY + Math.sin(r + 0.13) * 140
      )
    }
    // Sun disk
    this.add.circle(sunX, sunY, 46, 0xffe040)
    this.add.circle(sunX, sunY, 36, 0xffca20)
    this.add.circle(sunX, sunY, 22, 0xfff0a0)
    this.tweens.add({ targets: gSunCorona, scaleX: 1.05, scaleY: 1.05, yoyo: true, repeat: -1, duration: 3400, ease: 'Sine.easeInOut' })

    // Lake (bottom strip)
    this.add.rectangle(W/2, H - 18, W, 36, 0x1a5090)

    // Sun reflection on lake
    const lakeTopY = H - 36
    const gRefl = this.add.graphics()
    gRefl.fillStyle(0xf4a030, 0.20)
    gRefl.fillRect(sunX - 28, lakeTopY, 56, 36)
    gRefl.fillStyle(0xf4a030, 0.09)
    gRefl.fillRect(sunX - 60, lakeTopY + 14, 120, 22)

    // GRASS
    for (let tx = 0; tx < W; tx += 32) {
      const alt = ((tx / 32) & 1) === 1
      this.add.rectangle(tx + 16, H - 50, 32, 100, alt ? 0x3a8830 : 0x44a038)
    }


    // DISTANT TREELINE SILHOUETTE
    const gDistTree = this.add.graphics()
    gDistTree.fillStyle(0x060c06)
    for (let tx = -10; tx < W + 10; tx += 18) {
      const hh = 26 + Math.sin(tx * 0.22) * 10 + (tx % 36 < 18 ? 8 : 0)
      gDistTree.fillEllipse(tx, H * 0.70 - hh * 0.25, 30, hh)
    }

    // MÖKKI CABIN SILHOUETTE with lit windows
    this._drawMokki(W / 2, H * 0.69)

    // FOREGROUND TREES (with sway)
    const treeGraphics = [55, 115, W - 60, W - 125, W - 200].map((tx, i) => {
      const ty = H - 95 + (i % 2) * (-14)
      return this._drawTree(tx, ty, 1 + (i % 2) * 0.15)
    })
    treeGraphics.forEach((g, i) => {
      this.tweens.add({
        targets: g, angle: { from: -1.8, to: 1.8 },
        yoyo: true, repeat: -1,
        duration: 1900 + i * 180,
        ease: 'Sine.easeInOut',
        delay: i * 280,
      })
    })

    // FIREFLIES over grass
    for (let i = 0; i < 22; i++) {
      const ff = this.add.circle(
        Phaser.Math.Between(40, W - 40),
        Phaser.Math.Between(H - 120, H - 58),
        2, 0xf8f860, 0
      ).setDepth(6)
      const delay = Math.random() * 4000
      this.tweens.add({
        targets: ff, alpha: { from: 0, to: 0.88 },
        yoyo: true, repeat: -1,
        duration: 500 + Math.random() * 900, delay,
        ease: 'Sine.easeInOut',
      })
      this.tweens.add({
        targets: ff,
        y: ff.y - 12 - Math.random() * 22,
        x: ff.x + (Math.random() * 50 - 25),
        yoyo: true, repeat: -1,
        duration: 1900 + Math.random() * 2200,
        delay: delay + 100,
        ease: 'Sine.easeInOut',
      })
    }

    // TITLE CARD
    const cardW = 540, cardH = 120
    const cardY = H / 2 - 70

    const gCard = this.add.graphics()
    gCard.fillStyle(0x000000, 0.40)
    gCard.fillRoundedRect(W/2 - cardW/2 + 6, cardY + 6, cardW, cardH, 14)
    gCard.fillStyle(0x080a20, 0.93)
    gCard.fillRoundedRect(W/2 - cardW/2, cardY, cardW, cardH, 12)
    gCard.lineStyle(3, 0xf1c40f, 0.9)
    gCard.strokeRoundedRect(W/2 - cardW/2, cardY, cardW, cardH, 12)
    gCard.lineStyle(1, 0xf1c40f, 0.28)
    gCard.strokeRoundedRect(W/2 - cardW/2 + 5, cardY + 5, cardW - 10, cardH - 10, 9)

    // Title shadow + main text
    this.add.text(W/2 + 3, cardY + 43, 'MÖKKITRIP', {
      fontSize: '40px', color: '#7a5812', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(W/2, cardY + 40, 'MÖKKITRIP', {
      fontSize: '40px', color: '#f1c40f', fontStyle: 'bold',
      stroke: '#2a1a00', strokeThickness: 4,
    }).setOrigin(0.5)

    this.add.text(W/2, cardY + 88, 'S I M U L A T O R', {
      fontSize: '20px', color: '#c8e0f8', letterSpacing: 10,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5)


    // START BUTTON
    const btnY = H / 2 + 104
    const btnW = 300

    const gGlow = this.add.graphics()
    gGlow.fillStyle(0xf1a820, 0.12)
    gGlow.fillCircle(W/2, btnY, 92)
    gGlow.alpha = 0
    this.tweens.add({ targets: gGlow, alpha: { from: 0, to: 1 }, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' })

    const gBtn = this.add.graphics()
    const drawBtn = (col, rim) => {
      gBtn.clear()
      gBtn.fillStyle(0x000000, 0.30)
      gBtn.fillRoundedRect(W/2 - btnW/2 + 4, btnY - 26, btnW, 54, 10)
      gBtn.fillStyle(col)
      gBtn.fillRoundedRect(W/2 - btnW/2, btnY - 28, btnW, 54, 10)
      gBtn.fillStyle(0xffffff, 0.10)
      gBtn.fillRoundedRect(W/2 - btnW/2 + 4, btnY - 26, btnW - 8, 14, 7)
      gBtn.lineStyle(2, rim, 0.55)
      gBtn.strokeRoundedRect(W/2 - btnW/2, btnY - 28, btnW, 54, 10)
    }
    drawBtn(0x1e6b30, 0xffd080)

    const btnHitbox = this.add
      .rectangle(W/2, btnY, btnW, 54, 0x000000, 0)
      .setInteractive({ useHandCursor: true })

    this.add.text(W/2, btnY, 'Mennään mökille', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#0a3a18', strokeThickness: 3,
    }).setOrigin(0.5)

    btnHitbox.on('pointerover',  () => drawBtn(0x27ae60, 0xffffff))
    btnHitbox.on('pointerout',   () => drawBtn(0x1e6b30, 0xffd080))
    btnHitbox.on('pointerdown',  () => this.scene.start('GameScene'))


    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'))
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'))
  }

  _drawMokki(cx, cy) {
    const g = this.add.graphics()
    const mw = 190, mh = 82, rh = 50

    // Ground shadow
    g.fillStyle(0x000000, 0.15)
    g.fillEllipse(cx + 8, cy + mh/2 + 8, mw * 1.25, 16)

    // Roof
    g.fillStyle(0x070505)
    g.fillTriangle(
      cx - mw/2 - 16, cy - mh/2,
      cx + mw/2 + 16, cy - mh/2,
      cx, cy - mh/2 - rh
    )

    // Main cabin body
    g.fillStyle(0x0b0707)
    g.fillRect(cx - mw/2, cy - mh/2, mw, mh)

    // Log texture
    g.lineStyle(1, 0x050404, 0.55)
    for (let ly = -mh/2 + 14; ly < mh/2; ly += 14) {
      g.lineBetween(cx - mw/2, cy + ly, cx + mw/2, cy + ly)
    }
    g.lineStyle(0, 0, 0)

    // Chimney
    const chimneyX = cx - mw * 0.16
    const chimneyTopY = cy - mh/2 - rh * 0.50
    g.fillStyle(0x070505)
    g.fillRect(chimneyX - 9, chimneyTopY - 24, 18, 28)

    // Lit windows (warm orange glow)
    ;[cx - mw * 0.28, cx + mw * 0.09].forEach(wx => {
      const wy = cy - mh * 0.05
      g.fillStyle(0xf08020, 0.14)
      g.fillEllipse(wx, wy, 52, 42)
      g.fillStyle(0x120a08)
      g.fillRect(wx - 18, wy - 14, 36, 28)
      g.fillStyle(0xf09828)
      g.fillRect(wx - 16, wy - 12, 32, 24)
      g.fillStyle(0x12080a)
      g.fillRect(wx - 16, wy - 2, 32, 3)
      g.fillRect(wx - 2, wy - 12, 4, 24)
      g.fillStyle(0xfff0c0, 0.45)
      g.fillRect(wx - 13, wy - 10, 9, 7)
    })

    // Window glow flicker (separate rectangles that pulse)
    const wg1 = this.add.rectangle(cx - mw * 0.28, cy - mh * 0.05, 32, 24, 0xf4b040, 0.15)
    const wg2 = this.add.rectangle(cx + mw * 0.09, cy - mh * 0.05, 32, 24, 0xf4b040, 0.15)
    this.tweens.add({ targets: [wg1, wg2], alpha: { from: 0.08, to: 0.28 }, yoyo: true, repeat: -1, duration: 1900, ease: 'Sine.easeInOut' })

    // Door
    const dxOff = mw * 0.34
    g.fillStyle(0x090505)
    g.fillRect(cx + dxOff - 11, cy - mh/2 + mh * 0.33, 22, mh * 0.67)
    g.fillStyle(0x281008, 0.45)
    g.fillRect(cx + dxOff - 9, cy - mh/2 + mh * 0.36, 18, mh * 0.64)

    // Smoke puffs from chimney
    for (let si = 0; si < 5; si++) {
      const startY = chimneyTopY - 26 - si * 9
      const driftX = (si % 3 - 1) * 9 + 12
      const smoke = this.add.circle(chimneyX, startY, 4 + si * 2.2, 0x888888, 0)
      smoke.setDepth(3)
      this.tweens.add({
        targets: smoke,
        y: chimneyTopY - 95,
        x: chimneyX + driftX,
        alpha: { from: 0.20, to: 0 },
        scaleX: { from: 1, to: 2.6 },
        scaleY: { from: 1, to: 2.6 },
        duration: 3600 + si * 380,
        delay: si * 820,
        repeat: -1,
        ease: 'Sine.easeOut',
      })
    }
  }

  _drawTree(x, y, scale = 1) {
    const r  = Math.round(16 * scale)
    const th = Math.round(14 * scale)
    const g = this.add.graphics()
    g.x = x
    g.y = y + th + 1

    g.fillStyle(0x000000, 0.12)
    g.fillEllipse(4, r * 0.5 - th - 1, r * 2.2, r * 0.8)
    g.fillStyle(0x1a1a1a)
    g.fillRect(-4, -th - 2, 9, th + 2)
    g.fillStyle(0x7a5030)
    g.fillRect(-3, -th - 1, 7, th)
    g.fillStyle(0x1a3a1a)
    g.fillCircle(0, -th - Math.round(r * 0.4), r + 2)
    g.fillStyle(0x2a8a2a)
    g.fillCircle(0, -th - Math.round(r * 0.4), r)
    g.fillStyle(0x3aaa3a)
    g.fillCircle(-Math.round(r * 0.2), -th - Math.round(r * 0.65), Math.round(r * 0.68))
    g.fillStyle(0x5acc5a)
    g.fillCircle(-Math.round(r * 0.3), -th - Math.round(r * 0.88), Math.round(r * 0.34))

    return g
  }
}
