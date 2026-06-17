const W = 900
const H = 600

const QUOTES = [
  'The smoke goes up. It knows where it\'s going.',
  'Silence is just sound that hasn\'t decided yet.',
  'Have you noticed that trees never argue?',
  'Time is a sauna. You stay until you\'re done.',
  'My hands are very big right now.',
  'The mosquitoes here are part of the experience.',
  'I think I am the forest.',
  'This is the third Tuesday I\'ve felt like this.',
  'We should buy a boat.',
  'The stars are just holes in the ceiling.',
  'I forgot what I was going to say but it was good.',
  'Yes. This is it. This is the thing.',
]

const TRIP_DURATION = 75000
const BAR_W = 400
const BAR_H = 36
const BAR_X = (W - BAR_W) / 2
const BAR_Y = 290
const SWEET_FRAC = 0.22

export class WeedScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WeedScene' })
  }

  create() {
    this._phase = 'intro'
    this._goodHits = 0
    this._round = 0
    this._orbs = []
    this._blobs = []
    this._orbGfxList = []
    this._orbsCollected = 0
    this._tripStart = 0
    this._driftDone = false
    this._starX = W / 2
    this._starY = H / 2
    this._starVX = 0
    this._starVY = 0
    this._flipH = false
    this._flipTimer = 0

    this._bgGfx     = this.add.graphics()
    this._smokeGfx  = this.add.graphics().setVisible(false)
    this._driftGfx  = this.add.graphics().setVisible(false)
    this._markerGfx = this.add.graphics().setVisible(false)

    this._keys = {
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      w:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    }

    this._drawStaticBg()
    this._buildTexts()
    this._enterPhase('intro')
    this.cameras.main.fadeIn(400, 0, 8, 4)
  }

  // ── COLOUR HELPERS ────────────────────────────────────────────────────────

  _lerpColor(a, b, t) {
    const c = Math.max(0, Math.min(1, t))
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff
    return (Math.round(ar + (br - ar) * c) << 16) |
           (Math.round(ag + (bg - ag) * c) << 8) |
            Math.round(ab + (bb - ab) * c)
  }

  _hsvToColor(h, s, v) {
    const i = Math.floor(h * 6)
    const f = h * 6 - i
    const p = v * (1 - s), q = v * (1 - f * s), t2 = v * (1 - (1 - f) * s)
    let r, g, b
    switch (i % 6) {
      case 0: r = v;  g = t2; b = p;  break
      case 1: r = q;  g = v;  b = p;  break
      case 2: r = p;  g = v;  b = t2; break
      case 3: r = p;  g = q;  b = v;  break
      case 4: r = t2; g = p;  b = v;  break
      default: r = v; g = p;  b = q;  break
    }
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255)
  }

  // ── STATIC BACKGROUND ─────────────────────────────────────────────────────

  _drawStaticBg() {
    this._bgGfx.fillStyle(0x020c04)
    this._bgGfx.fillRect(0, 0, W, H)
    // Subtle vignette darkening at edges
    for (let i = 0; i < 7; i++) {
      const m = i * 20
      this._bgGfx.fillStyle(0x000000, 0.055 * (7 - i) / 7)
      this._bgGfx.fillRect(m, m, W - m * 2, H - m * 2)
    }
  }

  // ── TEXTS ─────────────────────────────────────────────────────────────────

  _buildTexts() {
    this._introText = this._mkTxt(W / 2, 160, 'Nikkebre hands you something.', 18, '#7dcea0')
      .setOrigin(0.5).setAlpha(0)
    this._subText = this._mkTxt(W / 2, 196, '"This is the good stuff."', 13, '#4a8a5a')
      .setOrigin(0.5).setAlpha(0)

    this._roundText = this._mkTxt(W / 2, 244, 'Round 1 / 3', 13, '#aaaaaa')
      .setOrigin(0.5).setVisible(false)

    this._hitText = this._mkTxt(W / 2, BAR_Y + BAR_H + 54, '', 22, '#ffffff')
      .setOrigin(0.5).setAlpha(0)

    this._hintText = this._mkTxt(W / 2, H - 28, '[ SPACE ]  Take a hit', 13, '#555555')
      .setOrigin(0.5).setVisible(false)

    this._orbText = this._mkTxt(18, 18, 'Vibes: 0 / 12', 13, '#7dcea0')
      .setDepth(10).setVisible(false)

    this._timerBarBg = this.add.rectangle(W / 2, 8, W - 40, 6, 0x1a2a1a)
      .setOrigin(0.5, 0).setDepth(10).setVisible(false)
    this._timerBar = this.add.rectangle(20, 8, W - 40, 6, 0x4a9a5a)
      .setOrigin(0, 0).setDepth(11).setVisible(false)
  }

  _mkTxt(x, y, str, size, color) {
    return this.add.text(x, y, str, {
      fontSize: `${size}px`, fontFamily: 'monospace', color,
      stroke: '#000000', strokeThickness: 2,
    })
  }

  // ── PHASE CONTROL ─────────────────────────────────────────────────────────

  _enterPhase(phase) {
    this._phase = phase

    if (phase === 'intro') {
      this.tweens.add({
        targets: [this._introText, this._subText],
        alpha: 1,
        duration: 900,
        ease: 'Sine.easeIn',
        onComplete: () => this.time.delayedCall(1600, () => this._enterPhase('smoke')),
      })
      return
    }

    if (phase === 'smoke') {
      this._round = 0
      this._introText.setAlpha(0.2)
      this._subText.setAlpha(0)
      this._smokeGfx.setVisible(true)
      this._markerGfx.setVisible(true)
      this._hintText.setVisible(true)
      this._roundText.setVisible(true)
      this._buildJointBar()
      this._startRound()
      return
    }

    if (phase === 'drift') {
      [this._introText, this._subText, this._roundText,
       this._hintText, this._hitText].forEach(t => t.setVisible(false))
      this._smokeGfx.setVisible(false)
      this._markerGfx.setVisible(false)
      this._driftGfx.setVisible(true)
      this._orbText.setVisible(true)
      this._timerBarBg.setVisible(true)
      this._timerBar.setVisible(true)
      this._tripStart = this.time.now
      this._spawnOrbs()
      this._spawnBlobs()
      return
    }

    if (phase === 'end') {
      this.cameras.main.fadeOut(500, 0, 8, 4)
      this.time.delayedCall(550, () => this._exit())
    }
  }

  // ── JOINT BAR ─────────────────────────────────────────────────────────────

  _buildJointBar() {
    const g = this._smokeGfx
    g.clear()
    const steps = 60
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const dist = Math.abs(t - 0.5) * 2
      let color
      if (dist < SWEET_FRAC) {
        color = this._lerpColor(0x22dd22, 0x88ff44, 1 - dist / SWEET_FRAC)
      } else {
        const outer = (dist - SWEET_FRAC) / (1 - SWEET_FRAC)
        color = outer < 0.5
          ? this._lerpColor(0xddaa00, 0xcc2200, outer * 2)
          : 0xcc2200
      }
      g.fillStyle(color)
      g.fillRect(BAR_X + t * BAR_W, BAR_Y, BAR_W / steps + 1, BAR_H)
    }
    g.lineStyle(2, 0xffffff, 0.65)
    g.strokeRect(BAR_X, BAR_Y, BAR_W, BAR_H)
    g.lineStyle(1, 0xffffff, 0.25)
    g.lineBetween(BAR_X + BAR_W / 2, BAR_Y - 3, BAR_X + BAR_W / 2, BAR_Y + BAR_H + 3)
  }

  _startRound() {
    this._round++
    this._roundText.setText(`Round ${this._round} / 3`)
    this._hitText.setAlpha(0)
  }

  _resolveHit(pos) {
    const dist = Math.abs(pos - 0.5) * 2
    const good = dist < SWEET_FRAC

    if (good) {
      this._goodHits++
      const phrases = ['Deep.', 'Perfect.', 'Mmmm.']
      const colors  = ['#88ff44', '#aaffaa', '#7dcea0']
      const idx = Math.min(this._goodHits - 1, 2)
      this._hitText.setText(phrases[idx]).setColor(colors[idx]).setAlpha(1)
      this._spawnQuoteText(QUOTES[Math.min(this._goodHits - 1, QUOTES.length - 1)])
    } else {
      this._hitText.setText('krhm... *blinks slowly*').setColor('#ff8844').setAlpha(1)
    }

    this.time.delayedCall(800, () => {
      this._hitText.setAlpha(0)
      if (this._round < 3) {
        this._startRound()
      } else {
        this._enterPhase('drift')
      }
    })
  }

  // ── DRIFT OBJECTS ─────────────────────────────────────────────────────────

  _spawnOrbs() {
    const margin = 70
    for (let i = 0; i < 12; i++) {
      const ox = margin + Math.random() * (W - margin * 2)
      const oy = margin + Math.random() * (H - margin * 2)
      const gfx = this.add.graphics().setDepth(6)
      gfx.fillStyle(0x88ffaa, 0.35)
      gfx.fillCircle(0, 0, 18)
      gfx.fillStyle(0xaaffcc, 0.65)
      gfx.fillCircle(0, 0, 10)
      gfx.fillStyle(0xffffff, 0.9)
      gfx.fillCircle(0, 0, 5)
      gfx.x = ox
      gfx.y = oy
      this._orbs.push({ gfx, x: ox, y: oy, r: 20 })
      this._orbGfxList.push(gfx)
    }
  }

  _spawnBlobs() {
    const defs = [
      { x: 130, y: 170, dx: 0.30, dy: 0.16 },
      { x: 710, y: 410, dx: -0.24, dy: 0.20 },
      { x: 450, y: 90,  dx: 0.18, dy: 0.26 },
    ]
    defs.forEach(d => {
      const gfx = this.add.graphics().setDepth(5)
      gfx.fillStyle(0x0a0618, 0.75)
      gfx.fillCircle(0, 0, 28)
      gfx.fillStyle(0x160a28, 0.4)
      gfx.fillCircle(0, 0, 42)
      gfx.x = d.x
      gfx.y = d.y
      this._blobs.push({ gfx, x: d.x, y: d.y, dx: d.dx, dy: d.dy, r: 28 })
    })
  }

  _spawnQuoteText(text) {
    const qt = this.add.text(W / 2, H / 2 + 20, `"${text}"`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#7dcea0',
      backgroundColor: '#00000099', padding: { x: 12, y: 6 },
      stroke: '#000000', strokeThickness: 1,
      wordWrap: { width: 400 }, align: 'center',
    }).setOrigin(0.5).setDepth(12).setAlpha(0)

    this.tweens.add({
      targets: qt,
      alpha: { from: 0, to: 0.88 },
      y: { from: H / 2 + 20, to: H / 2 - 40 },
      duration: 600,
      hold: 2200,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => qt.destroy(),
    })
  }

  // ── DRIFT PHYSICS ─────────────────────────────────────────────────────────

  _applyDriftPhysics(delta) {
    const FORCE = 0.38
    const DRAG  = 0.985
    const MAX_V = 3.2

    const flip = this._flipH ? -1 : 1
    if (this._keys.a.isDown    || this._keys.left.isDown)  this._starVX -= FORCE * flip
    if (this._keys.d.isDown    || this._keys.right.isDown) this._starVX += FORCE * flip
    if (this._keys.w.isDown    || this._keys.up.isDown)    this._starVY -= FORCE
    if (this._keys.s.isDown    || this._keys.down.isDown)  this._starVY += FORCE

    // Gentle centre gravity so player can't escape
    this._starVX += (W / 2 - this._starX) * 0.00018
    this._starVY += (H / 2 - this._starY) * 0.00018

    this._starVX = Math.max(-MAX_V, Math.min(MAX_V, this._starVX * DRAG))
    this._starVY = Math.max(-MAX_V, Math.min(MAX_V, this._starVY * DRAG))

    const dt = delta / 16.67
    this._starX = Math.max(14, Math.min(W - 14, this._starX + this._starVX * dt))
    this._starY = Math.max(14, Math.min(H - 14, this._starY + this._starVY * dt))
  }

  // ── DRIFT RENDERING ───────────────────────────────────────────────────────

  _drawDriftFrame(time) {
    const g = this._driftGfx
    g.clear()

    // Hue-cycling pulsing rings
    const hueCycle = (time / 12000) % 1
    for (let i = 0; i < 12; i++) {
      const t = i / 12
      const hue = (hueCycle + t * 0.35) % 1
      const sat = 0.55 + Math.sin(time / 3000 + i) * 0.15
      const val = 0.14 + (1 - t) * 0.20 + Math.sin(time / 2200 + i * 0.7) * 0.04
      const color = this._hsvToColor(hue, sat, val)
      const pulse = 1 + Math.sin(time / 1800 + i * 0.5) * 0.055
      g.fillStyle(color, 0.18 + (1 - t) * 0.13)
      g.fillCircle(W / 2, H / 2, (30 + i * 34) * pulse)
    }

    // Move and draw blobs
    this._blobs.forEach(blob => {
      blob.x += blob.dx * 0.55
      blob.y += blob.dy * 0.55
      if (blob.x < 40 || blob.x > W - 40) blob.dx *= -1
      if (blob.y < 40 || blob.y > H - 40) blob.dy *= -1
      blob.gfx.x = blob.x
      blob.gfx.y = blob.y
    })

    // Pulse orbs
    const orbPulse = 1 + Math.sin(time / 600) * 0.12
    this._orbGfxList.forEach(og => { if (og.scene) og.setScale(orbPulse) })

    // Player star
    const glow = 12 + Math.sin(time / 400) * 3
    g.fillStyle(0xffd700, 0.20)
    g.fillCircle(this._starX, this._starY, glow + 10)
    g.fillStyle(0xffffff, 0.65)
    g.fillCircle(this._starX, this._starY, glow)
    g.fillStyle(0xffd700, 1)
    g.fillCircle(this._starX, this._starY, 6)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(this._starX - 2, this._starY - 2, 3)

    // Control-flip indicator
    if (this._flipH) {
      g.fillStyle(0xff3388, 0.45)
      g.fillCircle(this._starX, this._starY, 26)
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._phase === 'smoke') {
      const pos = (Math.sin(time * 0.0018) + 1) / 2
      const ax = BAR_X + pos * BAR_W
      const ay = BAR_Y + BAR_H + 14
      this._markerGfx.clear()
      this._markerGfx.fillStyle(0xffffff, 1)
      this._markerGfx.fillTriangle(ax, ay - 14, ax - 9, ay + 5, ax + 9, ay + 5)
      this._markerGfx.lineStyle(1, 0x000000, 0.5)
      this._markerGfx.strokeTriangle(ax, ay - 14, ax - 9, ay + 5, ax + 9, ay + 5)

      if (Phaser.Input.Keyboard.JustDown(this._keys.space)) {
        this._resolveHit(pos)
      }
    }

    if (this._phase === 'drift') {
      this._applyDriftPhysics(delta)

      // Flip timer countdown
      if (this._flipH) {
        this._flipTimer -= delta
        if (this._flipTimer <= 0) this._flipH = false
      }

      // Blob collisions
      for (const blob of this._blobs) {
        const dx = this._starX - blob.x
        const dy = this._starY - blob.y
        if (!this._flipH && Math.sqrt(dx * dx + dy * dy) < blob.r + 10) {
          this._flipH = true
          this._flipTimer = 2000
          this._starVX *= -0.5
          this._spawnQuoteText('whoa... everything is... sideways?')
        }
      }

      // Orb collection
      for (const orb of [...this._orbs]) {
        const dx = this._starX - orb.x
        const dy = this._starY - orb.y
        if (Math.sqrt(dx * dx + dy * dy) < orb.r) {
          orb.gfx.destroy()
          this._orbs.splice(this._orbs.indexOf(orb), 1)
          this._orbsCollected++
          this._orbText.setText(`Vibes: ${this._orbsCollected} / 12`)
          const qIdx = (this._orbsCollected - 1) % QUOTES.length
          this._spawnQuoteText(QUOTES[qIdx])
          if (this._orbs.length === 0 && !this._driftDone) {
            this._driftDone = true
            this.time.delayedCall(900, () => this._enterPhase('end'))
          }
        }
      }

      // Timer bar
      const elapsed = time - this._tripStart
      const frac = Math.max(0, 1 - elapsed / TRIP_DURATION)
      this._timerBar.setDisplaySize((W - 40) * frac, 6)
      this._timerBar.setFillStyle(
        frac > 0.5
          ? this._lerpColor(0xddcc00, 0x4a9a5a, (frac - 0.5) * 2)
          : this._lerpColor(0xcc3300, 0xddcc00, frac * 2)
      )

      this._drawDriftFrame(time)

      if (elapsed >= TRIP_DURATION && !this._driftDone) {
        this._driftDone = true
        this._enterPhase('end')
      }
    }
  }

  // ── EXIT ──────────────────────────────────────────────────────────────────

  _exit() {
    const gs = this.scene.get('GameScene')
    if (gs && gs.player) {
      const hits = Math.max(1, this._goodHits)
      for (let i = 0; i < hits; i++) gs.player.addWeed()
    }
    this.scene.stop()
    this.scene.wake('GameScene')
  }
}
