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

// Nikkebre face position
const NIKKE_CX = Math.round(W / 2)
const NIKKE_CY = 198

// Joint travels from Nikkebre's mouth area to the player's implied mouth at bottom
const JOINT_AT_NIKKE  = { x: NIKKE_CX + 52, y: NIKKE_CY + 78 }
const JOINT_AT_PLAYER = { x: W / 2 + 12,    y: 492 }

const MIN_HIT_MS  = 700    // too short below this
const MAX_HIT_MS  = 5000   // auto-release above this
const TOTAL_HITS  = 3
const TRIP_DURATION = 75000

export class WeedScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WeedScene' })
  }

  create() {
    this._phase       = 'intro'
    this._goodHits    = 0
    this._hitsTaken   = 0
    this._isHolding   = false
    this._holdStartMs = 0
    this._holdFrac    = 0
    this._inCooldown  = false

    // drift state
    this._orbs          = []
    this._blobs         = []
    this._orbGfxList    = []
    this._orbsCollected = 0
    this._tripStart     = 0
    this._driftDone     = false
    this._starX  = W / 2
    this._starY  = H / 2
    this._starVX = 0
    this._starVY = 0
    this._flipH     = false
    this._flipTimer = 0

    this._bgGfx    = this.add.graphics()
    this._nikkeGfx = this.add.graphics().setDepth(2).setVisible(false)
    this._jointGfx = this.add.graphics().setDepth(4).setVisible(false)
    this._driftGfx = this.add.graphics().setVisible(false)

    this._drawStaticBg()
    this._buildNikkebreFace(this._nikkeGfx, NIKKE_CX, NIKKE_CY)
    this._buildTexts()
    this._bindKeys()

    this._enterPhase('intro')
    this.cameras.main.fadeIn(400, 0, 8, 4)
  }

  // ── KEY BINDING ──────────────────────────────────────────────────────────

  _bindKeys() {
    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    spaceKey.on('down', () => {
      if (this._phase !== 'smoke' || this._isHolding || this._inCooldown) return
      this._isHolding   = true
      this._holdStartMs = this.time.now
    })

    spaceKey.on('up', () => {
      if (this._phase !== 'smoke' || !this._isHolding) return
      const held = this.time.now - this._holdStartMs
      this._isHolding = false
      this._releaseHit(held < MIN_HIT_MS ? 'too_short' : 'good')
    })

    this._moveKeys = {
      w:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d:     this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    }
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
    // Dark forest silhouette at top
    this._bgGfx.fillStyle(0x081408)
    for (let tx = 0; tx < W; tx += 38) {
      const th = 80 + ((tx * 7 + 11) % 50)
      this._bgGfx.fillTriangle(tx, th, tx + 19, 0, tx + 38, th)
    }
    // Vignette
    for (let i = 0; i < 6; i++) {
      const m = i * 22
      this._bgGfx.fillStyle(0x000000, 0.05 * (6 - i) / 6)
      this._bgGfx.fillRect(m, m, W - m * 2, H - m * 2)
    }
  }

  // ── NIKKEBRE FACE ─────────────────────────────────────────────────────────

  _buildNikkebreFace(g, cx, cy) {
    // Dreadlocks — drawn first so they sit behind the head
    const dreadColors = [0x2e1a08, 0x3e240e, 0x261408]
    const dreads = [
      { dx: -88, dy: -20, w: 13, h: 75 },
      { dx: -62, dy: -48, w: 11, h: 92 },
      { dx: -36, dy: -62, w: 10, h: 78 },
      { dx:   0, dy: -82, w: 12, h: 58 },
      { dx:  36, dy: -62, w: 10, h: 78 },
      { dx:  62, dy: -48, w: 11, h: 92 },
      { dx:  88, dy: -20, w: 13, h: 75 },
    ]
    dreads.forEach((d, i) => {
      g.fillStyle(dreadColors[i % 3])
      g.fillEllipse(cx + d.dx, cy + d.dy, d.w, d.h)
      g.fillStyle(0x4e3012, 0.35)
      g.fillEllipse(cx + d.dx, cy + d.dy + d.h * 0.28, d.w * 0.55, d.h * 0.22)
    })

    // Beanie hat in character's mint green
    const hatBottom = cy - 56
    g.fillStyle(0x1a1a1a)
    g.fillEllipse(cx, hatBottom - 16, 180, 40)
    g.fillStyle(0x4a9870)
    g.fillRect(cx - 84, cy - 130, 168, 80)
    g.fillEllipse(cx, hatBottom, 176, 36)
    g.fillStyle(0x7dcea0)
    g.fillRect(cx - 82, cy - 128, 164, 76)
    g.fillEllipse(cx, hatBottom - 2, 168, 30)
    g.fillStyle(0x4a9870)
    g.fillRect(cx - 82, hatBottom - 20, 164, 10)
    // Pom-pom
    g.fillStyle(0xffffff, 0.85)
    g.fillCircle(cx, cy - 130, 12)
    g.fillStyle(0xe0f8f0, 0.5)
    g.fillCircle(cx - 4, cy - 135, 7)

    // Head — chubby, slightly wider than tall
    g.fillStyle(0x000000, 0.22)
    g.fillEllipse(cx + 4, cy + 4, 168, 178)
    g.fillStyle(0xc89464)
    g.fillEllipse(cx, cy, 166, 176)

    // Chubby cheek blush
    g.fillStyle(0xe0a060, 0.4)
    g.fillCircle(cx - 56, cy + 22, 28)
    g.fillCircle(cx + 56, cy + 22, 28)

    // Eyes — heavy droopy stoner lids
    const eyeL = cx - 36, eyeR = cx + 36, eyeY = cy - 18

    g.fillStyle(0xffffff)
    g.fillEllipse(eyeL, eyeY, 38, 24)
    g.fillStyle(0x5a3818)
    g.fillCircle(eyeL, eyeY + 4, 11)
    g.fillStyle(0x000000)
    g.fillCircle(eyeL, eyeY + 4, 6)
    g.fillStyle(0xffffff, 0.6)
    g.fillCircle(eyeL - 3, eyeY + 1, 3)
    // Heavy upper eyelid (droopy)
    g.fillStyle(0xc89464)
    g.fillEllipse(eyeL, eyeY - 11, 40, 22)

    g.fillStyle(0xffffff)
    g.fillEllipse(eyeR, eyeY, 38, 24)
    g.fillStyle(0x5a3818)
    g.fillCircle(eyeR, eyeY + 4, 11)
    g.fillStyle(0x000000)
    g.fillCircle(eyeR, eyeY + 4, 6)
    g.fillStyle(0xffffff, 0.6)
    g.fillCircle(eyeR + 3, eyeY + 1, 3)
    g.fillStyle(0xc89464)
    g.fillEllipse(eyeR, eyeY - 11, 40, 22)

    // Eyebrows — relaxed
    g.fillStyle(0x3e2010)
    g.fillRoundedRect(eyeL - 20, eyeY - 30, 38, 7, 3)
    g.fillRoundedRect(eyeR - 18, eyeY - 30, 38, 7, 3)

    // Nose
    g.fillStyle(0xb07840, 0.75)
    g.fillEllipse(cx, cy + 14, 26, 20)
    g.fillStyle(0x1a1a1a, 0.15)
    g.fillCircle(cx - 7, cy + 18, 6)
    g.fillCircle(cx + 7, cy + 18, 6)

    // Smile — gentle arc using short filled rects along a curve
    g.fillStyle(0x7a4828)
    for (let si = 0; si <= 10; si++) {
      const st = si / 10
      const sx = cx - 28 + st * 56
      const sy = cy + 45 + Math.sin(st * Math.PI) * 10
      g.fillRect(sx, sy, 5, 4)
    }

    // Light beard / stubble
    g.fillStyle(0x3e2010, 0.25)
    g.fillEllipse(cx, cy + 62, 112, 36)

    // Right ear (visible at face edge)
    g.fillStyle(0xb88050)
    g.fillEllipse(cx + 83, cy + 5, 18, 28)
    g.fillStyle(0xa07040)
    g.fillEllipse(cx + 85, cy + 5, 10, 18)
  }

  // ── TEXTS ─────────────────────────────────────────────────────────────────

  _buildTexts() {
    // Intro quote below face
    this._introText = this._mkTxt(W / 2, NIKKE_CY + 118, '"Here bro."', 15, '#7dcea0')
      .setOrigin(0.5).setAlpha(0).setDepth(5)

    this._hitCountText = this._mkTxt(W / 2, 22, '', 13, '#888888')
      .setOrigin(0.5).setDepth(10).setVisible(false)

    this._hintText = this._mkTxt(W / 2, H - 26, 'Hold [ SPACE ] to take a hit', 13, '#555555')
      .setOrigin(0.5).setDepth(10).setVisible(false)

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
      this._nikkeGfx.setAlpha(0).setVisible(true)
      this.tweens.add({
        targets: [this._nikkeGfx, this._introText],
        alpha: 1,
        duration: 900,
        ease: 'Sine.easeIn',
        onComplete: () => this.time.delayedCall(1400, () => this._enterPhase('smoke')),
      })
      return
    }

    if (phase === 'smoke') {
      this._introText.setVisible(false)
      this._nikkeGfx.setAlpha(0.62)
      this._hitCountText.setText(`Hits: 0 / ${TOTAL_HITS}`).setVisible(true)
      this._hintText.setVisible(true)
      this._jointGfx.setVisible(true)
      this._inCooldown = false
      this._hitsTaken  = 0
      return
    }

    if (phase === 'drift') {
      this._nikkeGfx.setVisible(false)
      this._jointGfx.setVisible(false)
      this._hitCountText.setVisible(false)
      this._hintText.setVisible(false)
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

  // ── HIT MECHANIC ─────────────────────────────────────────────────────────

  _releaseHit(type) {
    if (this._inCooldown) return
    this._inCooldown = true
    this._hitsTaken++

    if (type === 'too_short') {
      this._showNikkeComment('come on bro, take a proper hit 🙄')
    } else if (type === 'too_long') {
      this._showNikkeComment('yo bro... leave me something as well 😤')
      this._goodHits++
    } else {
      this._goodHits++
      this._spawnSmokeEffect(JOINT_AT_PLAYER.x, JOINT_AT_PLAYER.y - 20)
      const good = ['mmmm.', 'deep bro.', 'there you go.']
      this._showNikkeComment(good[Math.min(this._goodHits - 1, 2)])
    }

    this._hitCountText.setText(`Hits: ${this._hitsTaken} / ${TOTAL_HITS}`)

    this.time.delayedCall(this._hitsTaken >= TOTAL_HITS ? 1600 : 1100, () => {
      if (this._hitsTaken >= TOTAL_HITS) {
        this._enterPhase('drift')
      } else {
        this._inCooldown = false
      }
    })
  }

  _showNikkeComment(text) {
    const qt = this.add.text(W / 2, NIKKE_CY + 110, `"${text}"`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#7dcea0',
      backgroundColor: '#00000099', padding: { x: 12, y: 6 },
      stroke: '#000000', strokeThickness: 1,
      wordWrap: { width: 440 }, align: 'center',
    }).setOrigin(0.5).setDepth(12).setAlpha(0)

    this.tweens.add({
      targets: qt,
      alpha: { from: 0, to: 1 },
      y: { from: NIKKE_CY + 110, to: NIKKE_CY + 94 },
      duration: 300,
      hold: 900,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => qt.destroy(),
    })
  }

  _spawnSmokeEffect(cx, cy) {
    for (let i = 0; i < 5; i++) {
      const sg = this.add.graphics().setDepth(8)
      const ox = (Math.random() - 0.5) * 36
      sg.fillStyle(0xbbbbbb, 0.32 - i * 0.04)
      sg.fillCircle(ox, 0, 10 + i * 5)
      sg.x = cx
      sg.y = cy
      this.tweens.add({
        targets: sg,
        x: cx + ox * 1.8,
        y: cy - 60 - Math.random() * 30,
        alpha: 0,
        scaleX: 2.4,
        scaleY: 2.4,
        duration: 750 + i * 100,
        delay: i * 65,
        ease: 'Sine.easeOut',
        onComplete: () => sg.destroy(),
      })
    }
  }

  // ── JOINT DRAWING ─────────────────────────────────────────────────────────

  _drawJoint(g, jx, jy, isHolding, time) {
    g.clear()

    // Angle lerps from tilted (at Nikke) to straight up (at player mouth, burn end away)
    // -Math.PI/2 = vertical, ember at top, roach at bottom = player inhaling correctly
    const angle = -0.62 + (-Math.PI / 2 - (-0.62)) * this._holdFrac
    const cos = Math.cos(angle), sin = Math.sin(angle)
    const len = 58, thick = 8, hw = len / 2, hh = thick / 2

    // Local → world transform: ember end at -hw (top when vertical), roach end at +hw (bottom)
    const pt = (px, py) => ({
      x: jx + px * cos - py * sin,
      y: jy + px * sin + py * cos,
    })

    // ── Body — rolling paper with visible green herb ──────────────────────
    const [A, B, C, D] = [pt(-hw, -hh), pt(hw, -hh), pt(hw, hh), pt(-hw, hh)]

    // Rolling paper (off-white with slight green tint from herb inside)
    g.fillStyle(0xe8efd0)
    g.fillTriangle(A.x, A.y, B.x, B.y, C.x, C.y)
    g.fillTriangle(A.x, A.y, C.x, C.y, D.x, D.y)

    // Green herb bleed through the paper
    g.fillStyle(0x5aaa2a, 0.30)
    g.fillTriangle(A.x, A.y, B.x, B.y, C.x, C.y)
    g.fillTriangle(A.x, A.y, C.x, C.y, D.x, D.y)

    // Herb lumps (slightly darker green blobs along the body)
    const herbPositions = [-0.30, 0.0, 0.28]
    herbPositions.forEach(t => {
      const hp = pt(t * hw, 0)
      g.fillStyle(0x3a8a18, 0.35)
      g.fillCircle(hp.x, hp.y, 5)
      g.fillStyle(0x5ab828, 0.25)
      g.fillCircle(hp.x, hp.y, 8)
    })

    // Rolling paper seam line
    g.lineStyle(1, 0xc8d8a0, 0.5)
    const seamA = pt(-hw + 2, 0), seamB = pt(hw - 10, 0)
    g.lineBetween(seamA.x, seamA.y, seamB.x, seamB.y)
    g.lineStyle(0, 0, 0)

    // ── Twisted burning tip (ember end, at -hw) ───────────────────────────
    // Pinched cone: narrows to a point past the body end
    const twistTip  = pt(-hw - 10, 0)
    const twistBase0 = pt(-hw, -hh * 0.8)
    const twistBase1 = pt(-hw, hh * 0.8)
    g.fillStyle(0xc8cc80)
    g.fillTriangle(twistBase0.x, twistBase0.y, twistBase1.x, twistBase1.y, twistTip.x, twistTip.y)

    // Tiny green herb at the twist opening
    g.fillStyle(0x44aa22, 0.9)
    g.fillCircle(pt(-hw, 0).x, pt(-hw, 0).y, 3)

    // ── Roach / crutch (mouth end, at +hw) ───────────────────────────────
    // Small cardboard crutch — yellowish, slightly narrower
    const [R0, R1, R2, R3] = [pt(hw - 9, -hh * 0.85), pt(hw, -hh * 0.85),
                               pt(hw, hh * 0.85),       pt(hw - 9, hh * 0.85)]
    g.fillStyle(0xd4b04a)
    g.fillTriangle(R0.x, R0.y, R1.x, R1.y, R2.x, R2.y)
    g.fillTriangle(R0.x, R0.y, R2.x, R2.y, R3.x, R3.y)
    // Spiral lines on the roach
    g.lineStyle(1, 0xa88030, 0.6)
    g.lineBetween(R0.x, R0.y, R3.x, R3.y)
    g.lineStyle(0, 0, 0)

    // ── Ember glow at twisted tip ─────────────────────────────────────────
    const pulse = isHolding
      ? (0.85 + Math.sin(time / 70) * 0.15)
      : (0.5  + Math.sin(time / 380) * 0.15)

    g.fillStyle(0xff6600, 0.20 * pulse)
    g.fillCircle(twistTip.x, twistTip.y, 14 * pulse)
    g.fillStyle(0xff4400, 0.50 * pulse)
    g.fillCircle(twistTip.x, twistTip.y, 7 * pulse)
    g.fillStyle(0xff8800, pulse)
    g.fillCircle(twistTip.x, twistTip.y, 4)
    g.fillStyle(0xffee44, pulse)
    g.fillCircle(twistTip.x, twistTip.y, 2)

    // ── Hold-progress arc around the ember ───────────────────────────────
    if (isHolding) {
      const frac = Math.min((time - this._holdStartMs) / MAX_HIT_MS, 1)
      const arcColor = frac > 0.82 ? 0xff2200 : frac > 0.52 ? 0xff8800 : 0x88ff44
      g.lineStyle(2.5, arcColor, 0.78)
      g.beginPath()
      g.arc(twistTip.x, twistTip.y, 20, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false)
      g.strokePath()
    }
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
    const keys  = this._moveKeys

    const flip = this._flipH ? -1 : 1
    if (keys.a.isDown    || keys.left.isDown)  this._starVX -= FORCE * flip
    if (keys.d.isDown    || keys.right.isDown) this._starVX += FORCE * flip
    if (keys.w.isDown    || keys.up.isDown)    this._starVY -= FORCE
    if (keys.s.isDown    || keys.down.isDown)  this._starVY += FORCE

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

    this._blobs.forEach(blob => {
      blob.x += blob.dx * 0.55
      blob.y += blob.dy * 0.55
      if (blob.x < 40 || blob.x > W - 40) blob.dx *= -1
      if (blob.y < 40 || blob.y > H - 40) blob.dy *= -1
      blob.gfx.x = blob.x
      blob.gfx.y = blob.y
    })

    const orbPulse = 1 + Math.sin(time / 600) * 0.12
    this._orbGfxList.forEach(og => { if (og.scene) og.setScale(orbPulse) })

    const glow = 12 + Math.sin(time / 400) * 3
    g.fillStyle(0xffd700, 0.20)
    g.fillCircle(this._starX, this._starY, glow + 10)
    g.fillStyle(0xffffff, 0.65)
    g.fillCircle(this._starX, this._starY, glow)
    g.fillStyle(0xffd700, 1)
    g.fillCircle(this._starX, this._starY, 6)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(this._starX - 2, this._starY - 2, 3)

    if (this._flipH) {
      g.fillStyle(0xff3388, 0.45)
      g.fillCircle(this._starX, this._starY, 26)
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._phase === 'smoke') {
      // Auto-release when held too long
      if (this._isHolding && (time - this._holdStartMs) >= MAX_HIT_MS) {
        this._isHolding = false
        this._releaseHit('too_long')
      }

      // Smooth lerp joint position: 0 = at Nikke, 1 = at player mouth
      const target = this._isHolding ? 1 : 0
      this._holdFrac += (target - this._holdFrac) * 0.07 * (delta / 16.67)

      const jx = JOINT_AT_NIKKE.x + (JOINT_AT_PLAYER.x - JOINT_AT_NIKKE.x) * this._holdFrac
      const jy = JOINT_AT_NIKKE.y + (JOINT_AT_PLAYER.y - JOINT_AT_NIKKE.y) * this._holdFrac
      this._drawJoint(this._jointGfx, jx, jy, this._isHolding, time)
    }

    if (this._phase === 'drift') {
      this._applyDriftPhysics(delta)

      if (this._flipH) {
        this._flipTimer -= delta
        if (this._flipTimer <= 0) this._flipH = false
      }

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

      for (const orb of [...this._orbs]) {
        const dx = this._starX - orb.x
        const dy = this._starY - orb.y
        if (Math.sqrt(dx * dx + dy * dy) < orb.r) {
          orb.gfx.destroy()
          this._orbs.splice(this._orbs.indexOf(orb), 1)
          this._orbsCollected++
          this._orbText.setText(`Vibes: ${this._orbsCollected} / 12`)
          this._spawnQuoteText(QUOTES[(this._orbsCollected - 1) % QUOTES.length])
          if (this._orbs.length === 0 && !this._driftDone) {
            this._driftDone = true
            this.time.delayedCall(900, () => this._enterPhase('end'))
          }
        }
      }

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
