import Phaser from 'phaser'

const W = 900
const H = 600

const ELLIOT_CX = Math.round(W / 2)
const ELLIOT_CY = 200

const CAN_AT_ELLIOT  = { x: ELLIOT_CX + 60, y: ELLIOT_CY + 80 }
const CAN_AT_PLAYER  = { x: W / 2 + 8,      y: 490 }

const MIN_SIP_MS  = 600
const MAX_SIP_MS  = 4000
const TOTAL_SIPS  = 3

const COMMENTS = {
  too_short: [
    '"Seriously? Ota kunnolla."',
    '"Bro. That was barely a taste."',
    '"You call that a sip? Come on."',
  ],
  chug: [
    '"Woah woah. Saatana. Easy."',
    '"You want to be sick already?"',
    '"Okei... that\'s one way to do it."',
  ],
  good: [
    '"There you go. Cheers."',
    '"Kippis. Nice."',
    '"That\'s the spirit. Literally."',
  ],
}

export class DrinkingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DrinkingScene' })
  }

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  create(data) {
    this._zone       = (data && data.zone) || 'fire_pit'
    this._phase      = 'intro'
    this._sipsTaken  = 0
    this._goodSips   = 0
    this._isHolding  = false
    this._holdStartMs = 0
    this._holdFrac   = 0
    this._inCooldown = false

    this._bgGfx     = this.add.graphics().setDepth(0)
    this._elliotGfx = this.add.graphics().setDepth(4)
    this._canGfx    = this.add.graphics().setDepth(8)

    this._drawBg()
    this._buildElliotFace(this._elliotGfx, ELLIOT_CX, ELLIOT_CY)
    this._elliotGfx.setAlpha(0)

    this._buildTexts()
    this._bindKeys()

    this.cameras.main.fadeIn(400, 0, 0, 0)
    this._enterPhase('intro')
  }

  update(time, delta) {
    if (this._phase !== 'drink') return

    // Auto-release chug
    if (this._isHolding && !this._inCooldown) {
      const held = time - this._holdStartMs
      if (held >= MAX_SIP_MS) {
        this._isHolding = false
        this._releaseHit('chug')
        return
      }
    }

    // Lerp hold fraction
    const target = this._isHolding ? 1 : 0
    this._holdFrac += (target - this._holdFrac) * Math.min(1, delta / 180)

    // Can position along lerp path
    const f   = this._holdFrac
    const canX = CAN_AT_ELLIOT.x + (CAN_AT_PLAYER.x - CAN_AT_ELLIOT.x) * f
    const canY = CAN_AT_ELLIOT.y + (CAN_AT_PLAYER.y - CAN_AT_ELLIOT.y) * f

    this._drawCan(this._canGfx, canX, canY, this._isHolding, time)
  }

  // ── PHASES ─────────────────────────────────────────────────────────────────

  _enterPhase(phase) {
    this._phase = phase

    if (phase === 'intro') {
      this._hintText.setVisible(false)
      this._sipCountText.setVisible(false)
      this._canGfx.setVisible(false)

      this.tweens.add({
        targets: this._elliotGfx,
        alpha: 1,
        duration: 900,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this._introText.setVisible(true)
          this.tweens.add({
            targets: this._introText,
            alpha: 1,
            duration: 400,
            ease: 'Sine.easeOut',
          })
          this.time.delayedCall(1800, () => this._enterPhase('drink'))
        },
      })
    }

    if (phase === 'drink') {
      this._introText.setVisible(false)
      this._sipCountText.setText(`Sips: 0 / ${TOTAL_SIPS}`).setVisible(true)
      this._hintText.setVisible(true)
      this._canGfx.setVisible(true)
      this._inCooldown = false
    }
  }

  // ── HIT MECHANIC ───────────────────────────────────────────────────────────

  _bindKeys() {
    const space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    space.on('down', () => {
      if (this._phase !== 'drink' || this._inCooldown) return
      this._isHolding   = true
      this._holdStartMs = this.time.now
    })
    space.on('up', () => {
      if (!this._isHolding) return
      this._isHolding = false
      const held = this.time.now - this._holdStartMs
      this._releaseHit(held < MIN_SIP_MS ? 'too_short' : 'good')
    })
  }

  _releaseHit(type) {
    if (this._inCooldown) return
    this._inCooldown = true
    this._isHolding  = false
    this._sipsTaken++

    if (type === 'too_short') {
      this._showComment(Phaser.Utils.Array.GetRandom(COMMENTS.too_short))
    } else {
      // 'good' or 'chug' both count as a good sip
      this._goodSips++
      this._spawnFoamEffect()
      this._showComment(Phaser.Utils.Array.GetRandom(COMMENTS[type]))
    }

    this._sipCountText.setText(`Sips: ${this._sipsTaken} / ${TOTAL_SIPS}`)

    const delay = this._sipsTaken >= TOTAL_SIPS ? 1600 : 1000
    this.time.delayedCall(delay, () => {
      if (this._sipsTaken >= TOTAL_SIPS) {
        this._exit()
      } else {
        this._inCooldown = false
      }
    })
  }

  _spawnFoamEffect() {
    const cx = W / 2
    const cy = CAN_AT_PLAYER.y - 20
    for (let i = 0; i < 7; i++) {
      const fg = this.add.graphics().setDepth(10)
      const ox = (Math.random() - 0.5) * 44
      fg.fillStyle(0xffffff, 0.55 - i * 0.05)
      fg.fillCircle(0, 0, 5 + i * 2.5)
      fg.x = cx + ox
      fg.y = cy
      this.tweens.add({
        targets: fg,
        x: cx + ox * 1.5,
        y: cy - 50 - Math.random() * 28,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 520 + i * 75,
        delay: i * 45,
        ease: 'Sine.easeOut',
        onComplete: () => fg.destroy(),
      })
    }
  }

  _showComment(text) {
    const qt = this.add.text(W / 2, ELLIOT_CY + 118, text, {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: '#27ae60',
      backgroundColor: '#00000099',
      padding: { x: 12, y: 6 },
      stroke: '#000000',
      strokeThickness: 1,
      wordWrap: { width: 440 },
      align: 'center',
    }).setOrigin(0.5).setDepth(12).setAlpha(0)

    this.tweens.add({
      targets: qt,
      alpha: { from: 0, to: 1 },
      y: { from: ELLIOT_CY + 118, to: ELLIOT_CY + 100 },
      duration: 300,
      hold: 1000,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => qt.destroy(),
    })
  }

  // ── DRAW HELPERS ───────────────────────────────────────────────────────────

  _drawBg() {
    this._bgGfx.fillStyle(0x060810)
    this._bgGfx.fillRect(0, 0, W, H)

    const glowColor = this._zone === 'fire_pit'  ? 0xe05010
                    : this._zone === 'palju_bar'  ? 0x205080
                    : 0xc08030   // terrace — warm lantern

    for (let i = 0; i < 6; i++) {
      const alpha = 0.03 + i * 0.022
      const y = H - (i + 1) * 64
      this._bgGfx.fillStyle(glowColor, alpha)
      this._bgGfx.fillRect(0, y, W, 68)
    }

    // Vignette
    for (let vi = 0; vi < 5; vi++) {
      const m = vi * 20
      this._bgGfx.fillStyle(0x000000, 0.04)
      this._bgGfx.fillRect(m, m, W - m * 2, H - m * 2)
    }
  }

  _buildElliotFace(g, cx, cy) {
    // Head shadow
    g.fillStyle(0x000000, 0.2)
    g.fillEllipse(cx + 4, cy + 4, 148, 164)

    // Head (lighter skin)
    g.fillStyle(0xe8b882)
    g.fillEllipse(cx, cy, 146, 162)

    // Hair base — dark brown cap covering top third
    g.fillStyle(0x3a2008)
    g.fillEllipse(cx, cy - 62, 152, 82)

    // Wavy hair texture along base of hair
    const waveOffsets = [-56, -36, -16, 4, 24, 44, 60]
    waveOffsets.forEach((dx, i) => {
      g.fillStyle(i % 2 === 0 ? 0x3a2008 : 0x5a3412)
      g.fillEllipse(cx + dx, cy - 82, 28, 22)
    })

    // Side curls at temples
    g.fillStyle(0x3a2008)
    g.fillEllipse(cx - 70, cy - 36, 18, 40)
    g.fillEllipse(cx + 70, cy - 36, 18, 40)

    // Ears
    g.fillStyle(0xd8a870)
    g.fillEllipse(cx - 74, cy + 8, 18, 28)
    g.fillStyle(0xc89060)
    g.fillEllipse(cx - 76, cy + 8, 10, 18)
    g.fillStyle(0xd8a870)
    g.fillEllipse(cx + 74, cy + 8, 18, 28)
    g.fillStyle(0xc89060)
    g.fillEllipse(cx + 76, cy + 8, 10, 18)

    // Eyes — open and alert (not droopy like Nikkebre)
    const eyeL = cx - 34, eyeR = cx + 34, eyeY = cy - 18
    g.fillStyle(0xffffff)
    g.fillEllipse(eyeL, eyeY, 36, 28)
    g.fillStyle(0xffffff)
    g.fillEllipse(eyeR, eyeY, 36, 28)

    // Irises — green (Elliot's character colour 0x27ae60)
    g.fillStyle(0x2a9a58)
    g.fillCircle(eyeL, eyeY + 2, 10)
    g.fillStyle(0x2a9a58)
    g.fillCircle(eyeR, eyeY + 2, 10)

    // Pupils
    g.fillStyle(0x000000)
    g.fillCircle(eyeL, eyeY + 2, 5)
    g.fillStyle(0x000000)
    g.fillCircle(eyeR, eyeY + 2, 5)

    // Highlights
    g.fillStyle(0xffffff, 0.7)
    g.fillCircle(eyeL - 3, eyeY - 1, 2.5)
    g.fillCircle(eyeR - 3, eyeY - 1, 2.5)

    // Eyebrows — slightly raised (alert/friendly, inner corners raised)
    g.fillStyle(0x3a2008)
    g.fillRoundedRect(eyeL - 18, eyeY - 32, 34, 6, 3)
    g.fillRoundedRect(eyeR - 16, eyeY - 32, 34, 6, 3)
    // Inner raise
    g.fillRect(eyeL - 4, eyeY - 34, 12, 4)
    g.fillRect(eyeR - 8, eyeY - 34, 12, 4)

    // Nose
    g.fillStyle(0xc89060, 0.8)
    g.fillEllipse(cx, cy + 12, 22, 18)
    g.fillStyle(0x1a1a1a, 0.12)
    g.fillCircle(cx - 6, cy + 16, 5)
    g.fillCircle(cx + 6, cy + 16, 5)

    // Mouth — straight with slight right-side smirk
    g.fillStyle(0x8a4828)
    for (let si = 0; si <= 8; si++) {
      const st  = si / 8
      const mx  = cx - 22 + st * 44
      const my  = cy + 46 + (si > 5 ? (si - 5) * 2 : 0)
      g.fillRect(mx, my, 5, 3)
    }

    // Light stubble (greenish tint — bartender is not a total mess)
    g.fillStyle(0x2a4018, 0.2)
    g.fillEllipse(cx, cy + 62, 98, 30)

    // Bartender apron band below chin
    g.fillStyle(0x1e8449, 0.55)
    g.fillRoundedRect(cx - 58, cy + 72, 116, 18, 5)
    g.fillStyle(0x27ae60, 0.3)
    g.fillRoundedRect(cx - 54, cy + 74, 108, 12, 3)
  }

  _drawCan(g, cx, cy, isHolding, time) {
    g.clear()
    const canW = 20, canH = 44

    // Shadow
    g.fillStyle(0x000000, 0.18)
    g.fillRoundedRect(cx - canW / 2 + 3, cy - canH / 2 + 3, canW, canH, 4)

    // Aluminium body
    g.fillStyle(0xcccccc)
    g.fillRoundedRect(cx - canW / 2, cy - canH / 2, canW, canH, 4)

    // Karhu-style orange-red label band
    g.fillStyle(0xcc3300)
    g.fillRect(cx - canW / 2, cy - 8, canW, 16)
    g.fillStyle(0xff6600, 0.5)
    g.fillRect(cx - canW / 2, cy - 8, canW, 4)

    // Can top
    g.fillStyle(0xaaaaaa)
    g.fillRoundedRect(cx - canW / 2 + 2, cy - canH / 2, canW - 4, 6, 2)

    // Pull tab
    g.fillStyle(0x888888)
    g.fillRoundedRect(cx - 4, cy - canH / 2 - 2, 8, 5, 1)

    if (isHolding) {
      // Rising foam bubbles
      for (let bi = 0; bi < 4; bi++) {
        const bPhase = ((time / 300 + bi * 0.7) % 1)
        const bx = cx + Math.sin(time / 200 + bi * 1.4) * 6
        const by = cy - canH / 2 - 6 - bPhase * 20
        const br = 2 + bi * 1.2
        g.fillStyle(0xffffff, (1 - bPhase) * 0.65)
        g.fillCircle(bx, by, br)
      }

      // Hold-progress arc (green → orange → red) around can top
      const frac = Math.min((time - this._holdStartMs) / MAX_SIP_MS, 1)
      const arcCol = frac > 0.82 ? 0xff2200 : frac > 0.52 ? 0xff8800 : 0x44aaff
      g.lineStyle(2.5, arcCol, 0.78)
      g.beginPath()
      g.arc(cx, cy - canH / 2 + 3, 14, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false)
      g.strokePath()
    }
  }

  _buildTexts() {
    this._introText = this.add.text(W / 2, ELLIOT_CY + 140, '"Hei bro. Haluatko kaljaa?"', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#27ae60',
      backgroundColor: '#00000099',
      padding: { x: 14, y: 8 },
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(10).setAlpha(0).setVisible(false)

    this._sipCountText = this.add.text(W / 2, 42, `Sips: 0 / ${TOTAL_SIPS}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setVisible(false)

    this._hintText = this.add.text(W / 2, H - 52, 'Hold  [ SPACE ]  to take a sip', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10).setVisible(false)
  }

  // ── EXIT ───────────────────────────────────────────────────────────────────

  _exit() {
    const gs = this.scene.get('GameScene')
    if (gs && gs.player) {
      const drinks = Math.max(1, this._goodSips)
      for (let i = 0; i < drinks; i++) gs.player.addDrink()
    }
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.time.delayedCall(450, () => {
      this.scene.stop()
      this.scene.wake('GameScene')
    })
  }
}
