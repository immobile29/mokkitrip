import { CHARACTER_LIST } from '../data/characters.js'

const W = 900
const H = 600
const BEERS_TOTAL = 4
const MIN_SIP_MS  = 500
const MAX_SIP_MS  = 3500

// Bust head centres
const HEAD_L = { x: 215, y: 328 }  // left companion
const HEAD_R = { x: 685, y: 328 }  // right companion
const HEAD_P = { x: 450, y: 338 }  // player (front-centre)

const CAN_HOME   = { x: 354, y: 435 }
const CAN_PLAYER = { x: 455, y: 408 }

const BOAT_LINES = {
  jon:      [
    "What's the WiFi password out here?",
    "This vibe is genuinely unmatched",
    "Can we row to Finland from here?",
    "No aux cable. Terrible boat.",
  ],
  elliot:   [
    "Lake beer hits completely different",
    "I should open a floating bar honestly",
    "This is the most relaxed I've felt all trip",
    "Rowing really works up a thirst.",
  ],
  schmaxel: [
    "I let you guys row so I look effortlessly cool",
    "The lake knows.",
    "I've been rowing ironically this whole time",
    "My reflection out here looks incredible.",
  ],
  mark:     [
    "Stroke rate is off. 22 SPM minimum.",
    "I could row us to Estonia from here",
    "Technically this qualifies as a naval operation",
    "We're going in circles. I need those oars.",
  ],
  edu:      [
    "This is literally the best moment of my entire life",
    "Rowing is a metaphor for life, honestly",
    "The water is giving main character energy",
    "I love this boat more than most people I know",
  ],
  robert:   [
    "Has anyone considered lake-based startups?",
    "The floating bar market is completely untapped",
    "We should genuinely disrupt the mökki experience",
    "A boat is basically a floating networking event",
  ],
  nixu:     [
    "Row harder. A king does not touch oars.",
    "The lake is barely worthy of my presence",
    "Acceptable. The wind is in our favour.",
    "When I am done with this lake, it will know my name.",
  ],
  nikkebre: [
    "...are we moving?",
    "Boats are just slow cars for water",
    "The lake looks really… zoomed in right now",
    "I could live out here. What's for dinner?",
  ],
  immobile: [
    "Rowing is 68% upper body, 32% core. Classic.",
    "My stroke technique is genuinely elite",
    "We are literally doing cardio right now",
    "I need to add rowing to my training program.",
  ],
  allu:     [
    "I'm scared the lake is gonna eat me",
    "Is this the ocean?",
    "It's really blue down there",
    "Wait — are there fish under us RIGHT NOW?",
  ],
}

export class RowingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RowingScene' })
  }

  // ── LIFECYCLE ─────────────────────────────────────────────────────────────

  preload() {
    if (!this.cache.audio.has('the_best_song_ever')) {
      this.load.audio('the_best_song_ever', 'assets/sounds/the_best_song_ever.mp3')
    }
  }

  create() {
    // Pick 2 random companions (exclude the seagull)
    const pool     = CHARACTER_LIST.filter(c => !c.isSeagull)
    const shuffled = Phaser.Utils.Array.Shuffle([...pool])
    this._companions = [shuffled[0], shuffled[1]]

    // Dynamic head-position map
    this._headPos = {
      [this._companions[0].id]: HEAD_L,
      [this._companions[1].id]: HEAD_R,
      player: HEAD_P,
    }

    this._phase        = 'sitting'
    this._beersLeft    = BEERS_TOTAL
    this._goodSips     = 0
    this._isHolding    = false
    this._holdStartMs  = 0
    this._inCooldown   = false
    this._commentTimer = null
    this._exiting      = false

    this._bgGfx   = this.add.graphics().setDepth(0)
    this._waveGfx = this.add.graphics().setDepth(1)
    this._boatGfx = this.add.graphics().setDepth(2)
    this._bodyGfx = this.add.graphics().setDepth(3)
    this._rimGfx  = this.add.graphics().setDepth(4)
    this._headGfx = this.add.graphics().setDepth(5)
    this._canGfx  = this.add.graphics().setDepth(7)

    this._drawBackground()
    this._drawBoat()
    this._drawBustBodies()
    this._drawRim()
    this._drawBustHeads()
    this._drawCooler()
    this._buildTexts()
    this._bindKeys()

    this.cameras.main.fadeIn(400, 0, 0, 0)
    this._scheduleNextComment()

    this._music = this.sound.add('the_best_song_ever', { loop: true, volume: 0.55 })
    this._music.play()
  }

  update(time) {
    this._drawWaves(time)

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

    // Sky colour based on time of day
    const gs = this.scene.get('GameScene')
    const period   = gs?.timeSystem?.currentPeriod
    const skyColor = period === 'evening' ? 0xd4703f : 0x87ceeb
    const skyMid   = period === 'evening' ? 0xf0a060 : 0xbcdff0

    g.fillStyle(skyColor)
    g.fillRect(0, 0, W, 290)

    // Horizon glow
    g.fillStyle(skyMid, 0.35)
    g.fillRect(0, 240, W, 60)

    // Sun / evening glow
    if (period !== 'evening') {
      g.fillStyle(0xffe066)
      g.fillCircle(780, 70, 32)
      g.fillStyle(0xffd700, 0.22)
      g.fillCircle(780, 70, 48)
    } else {
      // Evening: orange sun near horizon
      g.fillStyle(0xff8800)
      g.fillCircle(720, 255, 28)
      g.fillStyle(0xff6600, 0.28)
      g.fillCircle(720, 255, 48)
    }

    // Distant treeline silhouette
    g.fillStyle(0x2d5a27)
    for (let tx = 0; tx < W + 40; tx += 38) {
      const th = 28 + Math.sin(tx * 0.18) * 12
      g.fillEllipse(tx, 284, 48, th)
    }
    g.fillStyle(0x1e3d18)
    g.fillRect(0, 286, W, 8)

    // Water
    g.fillStyle(period === 'evening' ? 0x1a4060 : 0x1a6fa8)
    g.fillRect(0, 290, W, H - 290)

    // Water shimmer
    g.fillStyle(period === 'evening' ? 0x2060a0 : 0x2580c0, 0.32)
    g.fillRect(0, 290, W, 22)

    // Distant reflection stripes
    g.fillStyle(0xffffff, 0.06)
    for (let ry = 320; ry < 360; ry += 9) {
      g.fillRect(60, ry, W - 120, 3)
    }
  }

  // ── BOAT ──────────────────────────────────────────────────────────────────

  _drawBoat() {
    const g = this._boatGfx

    // Drop shadow beneath hull
    g.fillStyle(0x000000, 0.22)
    g.fillEllipse(456, 476, 766, 40)

    // Outer hull — dark wood
    g.fillStyle(0x5a3410)
    g.fillRoundedRect(78, 352, 744, 138, 52)

    // Hull highlight (upper rim)
    g.fillStyle(0x7a5030, 0.55)
    g.fillRoundedRect(84, 354, 732, 24, 18)

    // Interior deck — lighter planks
    g.fillStyle(0xc8a060)
    g.fillRoundedRect(94, 366, 712, 112, 40)

    // Plank lines
    g.fillStyle(0xb89050, 0.6)
    for (let py = 376; py < 472; py += 18) {
      g.fillRect(110, py, 680, 3)
    }

    // Interior shadow edges (depth effect)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(94, 366, 712, 22, { tl: 40, tr: 40, bl: 0, br: 0 })

    // Bow (front-left) pointed end reinforcement
    g.fillStyle(0x4a2808)
    g.fillTriangle(78, 360, 78, 478, 130, 418)

    // Stern (back-right) thicker wood
    g.fillStyle(0x4a2808)
    g.fillRoundedRect(798, 360, 24, 118, { tl: 0, tr: 52, bl: 0, br: 52 })

    // Oar port holes
    g.fillStyle(0x3a2008)
    g.fillCircle(160, 390, 8)
    g.fillCircle(740, 390, 8)

    // Oar handles (sticking out to sides)
    g.fillStyle(0xc8a050)
    g.fillRoundedRect(30, 386, 132, 8, 4)  // left oar handle
    g.fillRoundedRect(738, 386, 132, 8, 4) // right oar handle

    // Oar blades (visible in water)
    g.fillStyle(0xb89040, 0.7)
    g.fillRoundedRect(18, 376, 22, 28, 3)  // left blade
    g.fillRoundedRect(860, 376, 22, 28, 3) // right blade

    // Alwar (seagull) perched on bow
    this._drawAlwar(this._boatGfx, 116, 360)
  }

  _drawAlwar(g, ax, ay) {
    // Simple small seagull
    const s = 0.65
    // Outline
    g.fillStyle(0x1a1a1a)
    g.fillEllipse(ax, ay - 2, 22 * s, 12 * s)
    g.fillCircle(ax, ay - 13, 9 * s)
    // Wings
    g.fillStyle(0xd8d8d8)
    g.fillEllipse(ax - 12 * s, ay - 8 * s, 18 * s, 8 * s)
    g.fillEllipse(ax + 12 * s, ay - 8 * s, 18 * s, 8 * s)
    // Body
    g.fillStyle(0xf0f0f0)
    g.fillEllipse(ax, ay - 2, 18 * s, 10 * s)
    // Head
    g.fillStyle(0xfafafa)
    g.fillCircle(ax, ay - 13, 7 * s)
    // Sombrero
    g.fillStyle(0x000000, 0.18); g.fillEllipse(ax + 1, ay - 20, 24 * s, 5 * s)
    g.fillStyle(0xcc8800);       g.fillEllipse(ax,     ay - 21, 22 * s, 4 * s)
    g.fillStyle(0xee9900);       g.fillEllipse(ax,     ay - 24, 11 * s, 8 * s)
    g.fillStyle(0xffaa00, 0.55); g.fillEllipse(ax - 1, ay - 27, 5 * s, 3 * s)
    g.lineStyle(1, 0xdd2200, 0.9); g.strokeEllipse(ax, ay - 21, 11 * s, 4 * s)
    g.fillStyle(0xdd2200)
    for (let i = 0; i < 6; i++) {
      const da = (i / 6) * Math.PI * 2
      g.fillCircle(ax + Math.cos(da) * 9 * s, ay - 21 + Math.sin(da) * 1.8 * s, 0.9)
    }
    // Beak
    g.fillStyle(0xe08820)
    g.fillTriangle(ax + 5 * s, ay - 12 * s, ax + 12 * s, ay - 9 * s, ax + 5 * s, ay - 8 * s)
    // Eye
    g.fillStyle(0x1a1a1a)
    g.fillCircle(ax + 2 * s, ay - 14 * s, 1.2)
  }

  // ── BUST BODIES ───────────────────────────────────────────────────────────

  _drawBustBodies() {
    const g = this._bodyGfx
    for (const c of this._companions) {
      const pos = this._headPos[c.id]
      this._drawBody(g, pos, c)
    }
    // Player body (blue tshirt)
    const pp = HEAD_P
    const pr = 20
    g.fillStyle(0x3070d0)
    g.fillRoundedRect(pp.x - 22, pp.y + pr - 4, 44, 32, { tl: 4, tr: 4, bl: 8, br: 8 })
  }

  _drawBody(g, pos, charData) {
    const r  = charData.isChubby ? 24 : 20
    const bw = charData.isChubby ? 56 : 44
    g.fillStyle(charData.bodyColor)
    g.fillRoundedRect(pos.x - bw / 2, pos.y + r - 4, bw, 32, { tl: 4, tr: 4, bl: 8, br: 8 })
  }

  // ── BOAT RIM (covers lower parts of bodies) ───────────────────────────────

  _drawRim() {
    const g = this._rimGfx
    // Interior rim overlay — sits in front of body busts, behind heads
    g.fillStyle(0x7a5030)
    g.fillRoundedRect(84, 352, 732, 24, 18)
    g.fillStyle(0x5a3410)
    g.lineStyle(3, 0x3a2008, 0.9)
    g.strokeRoundedRect(78, 352, 744, 138, 52)
  }

  // ── BUST HEADS ────────────────────────────────────────────────────────────

  _drawBustHeads() {
    const g = this._headGfx
    for (const c of this._companions) {
      const pos = this._headPos[c.id]
      this._drawHead(g, pos, c)
    }
    this._drawPlayerHead(g, HEAD_P)

    // Name tags
    const ns = { fontSize: '11px', fontFamily: 'monospace', color: '#d8d8d8', stroke: '#000', strokeThickness: 3 }
    for (const c of this._companions) {
      const pos = this._headPos[c.id]
      this.add.text(pos.x, pos.y - 34, c.name, ns).setOrigin(0.5, 1).setDepth(6)
    }
    this.add.text(HEAD_P.x, HEAD_P.y - 30, 'You', ns).setOrigin(0.5, 1).setDepth(6)
  }

  _drawHead(g, pos, charData) {
    const chubby = charData.isChubby
    const r    = chubby ? 24 : 20
    const skin = charData.isYellow ? 0xf0c030 : 0xf2c88a
    const cx   = pos.x, cy = pos.y

    // Shadow
    g.fillStyle(0x000000, 0.18)
    g.fillCircle(cx + 2, cy + 2, r)
    // Skin
    g.fillStyle(skin)
    g.fillCircle(cx, cy, r)
    // Hair (use character color)
    g.fillStyle(charData.color)
    g.fillEllipse(cx, cy - r * 0.48, r * 1.9, r * 0.85)

    // Crown for Nixu
    if (charData.isKing) {
      g.fillStyle(0xf1c40f)
      g.fillRect(cx - 9, cy - r - 8, 18, 6)
      g.fillTriangle(cx - 9, cy - r - 8, cx - 4, cy - r - 15, cx + 1, cy - r - 8)
      g.fillTriangle(cx - 1, cy - r - 8, cx + 4, cy - r - 15, cx + 9, cy - r - 8)
    }

    // Eyes
    const eyeS = r * 0.36
    const eyeY = cy + 2
    g.fillStyle(0x111111)
    g.fillCircle(cx - eyeS, eyeY, chubby ? 3.5 : 2.8)
    g.fillCircle(cx + eyeS, eyeY, chubby ? 3.5 : 2.8)

    // Droopy eyelids for Nikkebre
    if (charData.isChubby) {
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

  _drawCooler() {
    const g = this._headGfx
    const x = CAN_HOME.x, y = CAN_HOME.y - 12

    g.fillStyle(0x1e5a88)
    g.fillRoundedRect(x - 28, y - 8, 56, 36, 5)
    g.fillStyle(0x2e7ab8)
    g.fillRoundedRect(x - 26, y - 6, 52, 20, 4)
    g.fillStyle(0x154268)
    g.fillRoundedRect(x - 30, y - 14, 60, 10, 4)
    g.lineStyle(2, 0x0a2840, 0.9)
    g.strokeRect(x - 10, y - 19, 20, 7)

    // Mini cans inside
    g.fillStyle(0xbbbbbb)
    g.fillRoundedRect(x - 18, y - 4, 12, 20, 2)
    g.fillStyle(0xcc3300)
    g.fillRect(x - 18, y + 3, 12, 8)
    g.fillStyle(0xbbbbbb)
    g.fillRoundedRect(x + 6, y - 4, 12, 20, 2)
    g.fillStyle(0xcc3300)
    g.fillRect(x + 6, y + 3, 12, 8)

    g.fillStyle(0xd8eef8, 0.28)
    g.fillEllipse(x, y + 16, 44, 12)

    this.add.text(x, y + 30, '🍺 COOLER', {
      fontSize: '10px', fontFamily: 'monospace',
      color: '#80b8d0', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6)
  }

  // ── WAVES (redrawn per frame) ─────────────────────────────────────────────

  _drawWaves(time) {
    this._waveGfx.clear()
    for (let wi = 0; wi < 4; wi++) {
      const wy   = 298 + wi * 14
      const alph = 0.16 - wi * 0.03
      this._waveGfx.lineStyle(1.5, 0xaaddee, alph)
      this._waveGfx.beginPath()
      for (let x = 0; x <= W; x += 8) {
        const y = wy + Math.sin(x * 0.02 + time * 0.0016 + wi * 1.7) * 4
        x === 0 ? this._waveGfx.moveTo(x, y) : this._waveGfx.lineTo(x, y)
      }
      this._waveGfx.strokePath()
    }
    // Side water visible next to boat
    this._waveGfx.lineStyle(1.2, 0xaaddee, 0.12)
    this._waveGfx.beginPath()
    for (let x = 0; x < 80; x += 6) {
      const y = 400 + Math.sin(x * 0.05 + time * 0.0012) * 5
      x === 0 ? this._waveGfx.moveTo(x, y) : this._waveGfx.lineTo(x, y)
    }
    this._waveGfx.strokePath()
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildTexts() {
    this.add.text(W / 2, 26, '🚣  R O W I N G', {
      fontSize: '22px', fontFamily: 'monospace',
      color: '#80d0f0', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)

    this._beerText = this.add.text(30, H - 44, `🍺 ×${this._beersLeft}`, {
      fontSize: '18px', fontFamily: 'monospace',
      color: '#f0c040', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(10)

    this._hintText = this.add.text(W / 2, H - 44, '[ E ] grab beer   [ ESC ] head back', {
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
      if (!this._exiting) this._exit()
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
      targets: obj, t: 1, duration: 380, ease: 'Sine.easeInOut',
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

    const gs    = this.scene.get('GameScene')
    const drunk = gs?.player?.drunkLevel ?? 0
    const comp  = Phaser.Utils.Array.GetRandom(this._companions)

    if (type === 'too_short') {
      this._showComment(comp.id, '"Ota kunnolla!"')
    } else {
      this._goodSips++
      this._beersLeft--
      this._beerText.setText(`🍺 ×${this._beersLeft}`)
      this._spawnFoam()
      if (drunk >= 7) {
        const drunkMsg = Phaser.Utils.Array.GetRandom([
          '"Hey… maybe slow down a bit."',
          '"Don\'t fall overboard."',
          '"We\'re on water. Be careful."',
        ])
        this._showComment(comp.id, drunkMsg)
      }
    }

    this.time.delayedCall(1200, () => {
      this._phase = 'sitting'
      this._sipHintText.setVisible(false)
      this._hintText.setVisible(true)
      this._canGfx.clear()

      if (this._beersLeft <= 0) {
        this._showComment(comp.id, '"We\'re out of beer…"')
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
        alpha: 0, scaleX: 2, scaleY: 2,
        duration: 470 + i * 72,
        delay: i * 42,
        ease: 'Sine.easeOut',
        onComplete: () => fg.destroy(),
      })
    }
  }

  // ── SPEECH BUBBLES ────────────────────────────────────────────────────────

  _showComment(charId, text) {
    const pos   = this._headPos[charId] ?? HEAD_P
    const char  = this._companions.find(c => c.id === charId)
    const color = char ? '#' + char.color.toString(16).padStart(6, '0') : '#aaaaaa'

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
      duration: 280, hold: 1900, yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => qt.destroy(),
    })
  }

  _scheduleNextComment() {
    const delay = 4200 + Math.random() * 3800
    this._commentTimer = this.time.delayedCall(delay, () => {
      if (!this.scene.isActive('RowingScene')) return
      const c     = Phaser.Utils.Array.GetRandom(this._companions)
      const lines = BOAT_LINES[c.id]
      if (lines) this._showComment(c.id, Phaser.Utils.Array.GetRandom(lines))
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

  // ── EXIT ──────────────────────────────────────────────────────────────────

  _exit() {
    if (this._exiting) return
    this._exiting = true
    this._music?.stop()
    if (this._commentTimer) this._commentTimer.remove()

    const gs = this.scene.get('GameScene')
    if (gs?.player) {
      for (let i = 0; i < this._goodSips; i++) gs.player.addDrink()
    }

    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.time.delayedCall(450, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
