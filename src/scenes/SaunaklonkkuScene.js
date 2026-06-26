import { CHARACTERS } from '../data/characters.js'

const W = 900
const H = 600

const SEAT_XS  = [160, 340, 560, 740]
const SEAT_Y   = 148
const BENCH_Y  = 192   // top of bench plank
const UNDER_Y  = 256   // klonkku center y (under bench)
const TOTAL_POKES = 7

const FLINCH_CHANCE = { default: 0.65, nikkebre: 0.50, immobile: 0.30, alwar: 0.80 }

const FLINCH_LINES  = ["AAARGH!!", "ok ok that's me", "NOT FAIR", "I felt that", "WHY", "ow ow ow"]
const BRAVE_LINES   = ["didn't feel a thing", "is that all?", "🧘 zen.", "not even close", "absolute focus"]
const KLONKKU_LINES = ["hehehe", "who's next...", "ssssshh", "coming for you", "stay very still"]

export class SaunaklonkkuScene extends Phaser.Scene {
  constructor() { super({ key: 'SaunaklonkkuScene' }) }

  create() {
    // Pick 3 random NPCs
    const allChars = Phaser.Utils.Array.Shuffle([...Object.values(CHARACTERS)])
    const npcChars = allChars.slice(0, 3)

    // Participants: 3 NPCs + player at index 3
    this._participants = [
      ...npcChars.map(c => ({ ...c, isPlayer: false })),
      { id: 'player', name: 'You', color: 0xdd3333, bodyColor: 0xaa2222, isPlayer: true },
    ]

    this._klonkkuIdx    = 0       // index of current klonkku (starts as first NPC)
    this._pokeCount     = 0
    this._klonkkuCounts = [1, 0, 0, 0]  // first char starts as klonkku
    this._targetIdx     = -1
    this._lastTargetIdx = -1
    this._phase         = 'intro'
    this._exiting       = false
    this._keyListener   = null
    this._barFillTween  = null
    this._klonkkuX      = SEAT_XS[0]

    this._drawBg()
    this._drawSteam()
    this._drawParticipants()
    this._drawBenches()         // drawn after participants so bench covers leg gap
    this._buildKlonkkuSprite()
    this._buildHUD()
    this._bindKeys()

    this.cameras.main.fadeIn(280, 0, 0, 0)
    this.time.delayedCall(450, () => this._enterIntro())
  }

  // ── BACKGROUND ──────────────────────────────────────────────────────────

  _drawBg() {
    // Wall (dark wood panels)
    this.add.rectangle(W/2, 155, W, 310, 0x3d1f0a)
    const gw = this.add.graphics()
    gw.lineStyle(1, 0x2a1408, 0.55)
    for (let px = 14; px < W; px += 30) gw.lineBetween(px, 0, px, 310)

    // Under-bench shadow zone
    this.add.rectangle(W/2, 255, W, 130, 0x16090200).setAlpha(1)
    const gu = this.add.graphics()
    gu.fillStyle(0x0e0604, 0.65)
    gu.fillRect(0, BENCH_Y + 30, W, 100)

    // Floor
    this.add.rectangle(W/2, H - 110, W, 220, 0x22180e)
    const gf = this.add.graphics()
    gf.lineStyle(1, 0x1a1208, 0.45)
    for (let tx = 0; tx < W; tx += 44) gf.lineBetween(tx, 320, tx, H)
    for (let ty = 328; ty < H; ty += 32) gf.lineBetween(0, ty, W, ty)
  }

  _drawSteam() {
    for (let i = 0; i < 20; i++) {
      const sx = Phaser.Math.Between(60, W - 60)
      const sy = Phaser.Math.Between(BENCH_Y - 70, BENCH_Y - 5)
      const r  = Phaser.Math.Between(3, 9)
      const steam = this.add.circle(sx, sy, r, 0xffffff, 0).setDepth(2)
      const delay = Math.random() * 3600
      this.tweens.add({
        targets: steam,
        y: sy - Phaser.Math.Between(50, 110),
        alpha: { from: 0, to: 0.18 },
        scaleX: { from: 1, to: 2.4 },
        scaleY: { from: 1, to: 2.4 },
        duration: 2600 + Math.random() * 2000,
        delay, repeat: -1, ease: 'Sine.easeOut',
      })
    }
  }

  // ── CHARACTERS ON BENCH ─────────────────────────────────────────────────

  _drawParticipants() {
    this._nameLabels = []

    this._participants.forEach((p, i) => {
      const x = SEAT_XS[i]
      const g = this.add.graphics().setDepth(3)
      p.isPlayer ? this._drawPlayerBust(g, x, SEAT_Y) : this._drawSaunaHuman(g, x, SEAT_Y, p, 1.6)

      const lbl = this.add.text(x, BENCH_Y + 38, p.name, {
        fontSize: '11px', fontFamily: 'monospace',
        color: '#c8a058', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(8)
      this._nameLabels.push(lbl)
    })
  }

  _drawSaunaHuman(g, x, y, d, S) {
    const hc = d.isYellow ? 0xf0c030 : 0xf2c88a
    // Shadow
    g.fillStyle(0x000000, 0.14)
    g.fillEllipse(x + S*2, y + S*25, S*36, S*8)
    // Legs (barely visible, bench covers most)
    g.fillStyle(hc)
    g.fillRoundedRect(x - S*9, y + S*14, S*7, S*12, S*2)
    g.fillRoundedRect(x + S*2,  y + S*14, S*7, S*12, S*2)
    // Towel (white body with colored stripe)
    g.fillStyle(0xf0ede0)
    g.fillRoundedRect(x - S*10, y - S*6, S*20, S*22, S*4)
    g.fillStyle(d.bodyColor)
    g.fillRect(x - S*10, y + S*6, S*20, S*4)
    // Head
    g.fillStyle(hc)
    g.fillCircle(x, y - S*18, S*10)
    // Hair
    g.fillStyle(d.color)
    g.fillEllipse(x, y - S*25, S*22, S*13)
    // Crown (Nixu)
    if (d.isKing) {
      g.fillStyle(0xf1c40f)
      g.fillRect(x - S*7, y - S*33, S*14, S*8)
      ;[-1, 0, 1].forEach(ci => {
        g.fillTriangle(
          x + ci*S*5.5 - S*2.5, y - S*33,
          x + ci*S*5.5,         y - S*41,
          x + ci*S*5.5 + S*2.5, y - S*33,
        )
      })
    }
    // Chubby cheeks
    if (d.isChubby) {
      g.fillStyle(hc)
      g.fillCircle(x - S*8, y - S*17, S*4)
      g.fillCircle(x + S*8, y - S*17, S*4)
    }
    // Eyes
    g.fillStyle(0x1a1a1a)
    g.fillCircle(x - S*3.5, y - S*19, S*2.0)
    g.fillCircle(x + S*3.5, y - S*19, S*2.0)
    g.fillStyle(0xffffff, 0.85)
    g.fillCircle(x - S*2.5, y - S*20, S*0.8)
    g.fillCircle(x + S*4.5, y - S*20, S*0.8)
  }

  _drawPlayerBust(g, x, y) {
    const S = 1.6
    g.fillStyle(0x000000, 0.14)
    g.fillEllipse(x + S*2, y + S*25, S*36, S*8)
    g.fillStyle(0xf2c88a)
    g.fillRoundedRect(x - S*9, y + S*14, S*7, S*12, S*2)
    g.fillRoundedRect(x + S*2,  y + S*14, S*7, S*12, S*2)
    g.fillStyle(0xf0ede0)
    g.fillRoundedRect(x - S*10, y - S*6, S*20, S*22, S*4)
    g.fillStyle(0xaa2222)
    g.fillRect(x - S*10, y + S*6, S*20, S*4)
    g.fillStyle(0xf2c88a)
    g.fillCircle(x, y - S*18, S*10)
    // Red cap
    g.fillStyle(0xcc2222)
    g.fillRect(x - S*11, y - S*27, S*22, S*11)
    g.fillRect(x - S*13, y - S*29, S*26, S*4)
    g.fillStyle(0xdd3333)
    g.fillRect(x + S*8, y - S*28, S*6, S*4)  // cap brim overhang
    g.fillStyle(0x1a1a1a)
    g.fillCircle(x - S*3.5, y - S*19, S*2.0)
    g.fillCircle(x + S*3.5, y - S*19, S*2.0)
    g.fillStyle(0xffffff, 0.85)
    g.fillCircle(x - S*2.5, y - S*20, S*0.8)
    g.fillCircle(x + S*4.5, y - S*20, S*0.8)
  }

  _drawBenches() {
    const g = this.add.graphics().setDepth(5)
    // Upper bench
    g.fillStyle(0x7a4820)
    g.fillRect(0, BENCH_Y, W, 30)
    g.fillStyle(0x8b5a2b)
    g.fillRect(0, BENCH_Y, W, 26)
    // Plank lines
    g.lineStyle(1.5, 0x6b4018, 0.5)
    for (let px = 0; px < W; px += 58) g.lineBetween(px, BENCH_Y, px, BENCH_Y + 26)
    // Bench top highlight
    g.lineStyle(1, 0xb07a40, 0.35)
    g.lineBetween(0, BENCH_Y, W, BENCH_Y)
    // Lower bench support
    g.fillStyle(0x6a3e18)
    g.fillRect(0, BENCH_Y + 34, W, 14)
  }

  // ── KLONKKU SPRITE ──────────────────────────────────────────────────────

  _buildKlonkkuSprite() {
    this._klonkkuGfx = this.add.graphics().setDepth(4)
    this._redrawKlonkku()

    this._pokeArm = this.add.text(0, 0, '👉', { fontSize: '24px' })
      .setOrigin(0.5).setDepth(6).setAlpha(0)
  }

  _redrawKlonkku() {
    const p = this._participants[this._klonkkuIdx]
    const x = this._klonkkuX
    const y = UNDER_Y
    const S = 1.3
    const g = this._klonkkuGfx
    g.clear()

    if (p.isPlayer) {
      g.fillStyle(0xf2c88a)
      g.fillCircle(x, y, S*10)
      g.fillStyle(0xcc2222)
      g.fillRect(x - S*11, y - S*10, S*22, S*11)
      g.fillRect(x - S*13, y - S*12, S*26, S*4)
    } else {
      const hc = p.isYellow ? 0xf0c030 : 0xf2c88a
      g.fillStyle(0xf0ede0)
      g.fillRoundedRect(x - S*10, y - S*4, S*20, S*18, S*3)
      g.fillStyle(p.bodyColor)
      g.fillRect(x - S*10, y + S*5, S*20, S*4)
      g.fillStyle(hc)
      g.fillCircle(x, y - S*14, S*10)
      g.fillStyle(p.color)
      g.fillEllipse(x, y - S*21, S*22, S*12)
    }

    // Glowing sneaky eyes
    g.fillStyle(0xffee00, 0.8)
    g.fillCircle(x - S*3.5, y - S*14, S*1.5)
    g.fillCircle(x + S*3.5, y - S*14, S*1.5)
  }

  // ── HUD ─────────────────────────────────────────────────────────────────

  _buildHUD() {
    // Bottom panel
    const gp = this.add.graphics().setDepth(7)
    gp.fillStyle(0x000000, 0.58)
    gp.fillRect(0, 310, W, 82)
    gp.lineStyle(1, 0x7a4820, 0.45)
    gp.lineBetween(0, 310, W, 310)
    gp.lineBetween(0, 392, W, 392)

    this.add.text(18, 320, '🧖 SAUNAKLONKKU', {
      fontSize: '14px', fontFamily: 'monospace',
      color: '#7a4820', stroke: '#000', strokeThickness: 2,
    }).setDepth(9)

    this._pokeTxt = this.add.text(W - 18, 320, '', {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#5a3010', stroke: '#000', strokeThickness: 1,
    }).setOrigin(1, 0).setDepth(9)

    this._phaseTxt = this.add.text(W/2, 334, '', {
      fontSize: '18px', fontFamily: 'monospace',
      color: '#f0c070', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9)

    this._subTxt = this.add.text(W/2, 366, '', {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#a88040', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(9)

    // Reaction area
    this._flashTxt = this.add.text(W/2, 440, '', {
      fontSize: '17px', fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(12)

    // Reaction countdown bar (fills red → flinch if full)
    this._barBg   = this.add.rectangle(W/2, 492, 420, 18, 0x1a1a1a).setAlpha(0).setDepth(11)
    this._barFill = this.add.rectangle(W/2 - 210, 492, 420, 18, 0xff4422)
      .setOrigin(0, 0.5).setAlpha(0).setDepth(11).setScale(0, 1)
    this.add.text(W/2, 548, '[ ESC ]  Leave sauna', {
      fontSize: '13px', fontFamily: 'monospace',
      color: '#c8a058', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(9)

    this._updatePokeCounter()
  }

  // ── SPEECH BUBBLES ─────────────────────────────────────────────────────

  _showBubble(idx, text) {
    const x = SEAT_XS[idx]
    const y = SEAT_Y - 60
    const t = this.add.text(x, y, text, {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#ffffff', stroke: '#000', strokeThickness: 2,
      backgroundColor: '#000000aa',
      padding: { x: 7, y: 4 },
      wordWrap: { width: 130 }, align: 'center',
    }).setOrigin(0.5).setAlpha(0).setDepth(10)
    this.tweens.add({
      targets: t, alpha: { from: 0, to: 1 }, y: y - 16,
      duration: 220, hold: 1800, yoyo: true,
      onComplete: () => t.destroy(),
    })
  }

  _showKlonkkuBubble(text) {
    const t = this.add.text(this._klonkkuX, UNDER_Y - 40, text, {
      fontSize: '10px', fontFamily: 'monospace',
      color: '#ffff88', stroke: '#000', strokeThickness: 2,
      backgroundColor: '#00000099',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setAlpha(0).setDepth(10)
    this.tweens.add({
      targets: t, alpha: 1, duration: 180, hold: 1500, yoyo: true,
      onComplete: () => t.destroy(),
    })
  }

  // ── INPUT ────────────────────────────────────────────────────────────────

  _bindKeys() {
    const kb = this.input.keyboard
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this._exit())
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => {
      if (this._phase === 'gameover') this._exit()
    })
    ;[
      [Phaser.Input.Keyboard.KeyCodes.ONE,   0],
      [Phaser.Input.Keyboard.KeyCodes.TWO,   1],
      [Phaser.Input.Keyboard.KeyCodes.THREE, 2],
    ].forEach(([code, npcIdx]) => {
      kb.addKey(code).on('down', () => {
        if (this._phase === 'klonkku_picks' && this._klonkkuIdx === 3)
          this._setTarget(npcIdx)
      })
    })
  }

  // ── PHASE: INTRO ─────────────────────────────────────────────────────────

  _enterIntro() {
    this._phase = 'intro'
    const name = this._participants[this._klonkkuIdx].name
    this._phaseTxt.setText('🧖 SAUNAKLONKKU').setColor('#f0c070')
    this._subTxt.setText(`${name} goes under the benches first...`)
    this._showKlonkkuBubble(this._pick(KLONKKU_LINES))
    this.tweens.add({
      targets: this._nameLabels[this._klonkkuIdx],
      alpha: { from: 1, to: 0.15 }, yoyo: true, repeat: 3, duration: 280,
    })
    this.time.delayedCall(2800, () => this._enterKlonkkuPicks())
  }

  // ── PHASE: PICK TARGET ───────────────────────────────────────────────────

  _enterKlonkkuPicks() {
    this._phase = 'klonkku_picks'
    const klonkku = this._participants[this._klonkkuIdx]

    if (this._klonkkuIdx === 3) {
      // Player is klonkku
      this._phaseTxt.setText('🍑 YOU ARE THE KLONKKU').setColor('#ff8844')
      const opts = this._participants.slice(0, 3).map((p, i) => `[${i+1}] ${p.name}`).join('   ')
      this._subTxt.setText(`Pick your victim:  ${opts}`)
      this._showFlash('Choose who to poke! 🍑', '#ff8844')
    } else {
      this._phaseTxt.setText(`${klonkku.name} is creeping...`).setColor('#f0c070')
      this._subTxt.setText('sneaking under the benches...')
      this._showKlonkkuBubble(this._pick(KLONKKU_LINES))
      // NPC auto-picks after short delay
      this.time.delayedCall(1200, () => {
        const options = [0, 1, 2, 3].filter(i => i !== this._klonkkuIdx && i !== this._lastTargetIdx)
        const pool = options.length ? options : [0, 1, 2, 3].filter(i => i !== this._klonkkuIdx)
        this._setTarget(pool[Math.floor(Math.random() * pool.length)])
      })
    }
  }

  _setTarget(targetIdx) {
    this._lastTargetIdx = targetIdx
    this._targetIdx = targetIdx
    this._enterCreeping()
  }

  // ── PHASE: CREEP ─────────────────────────────────────────────────────────

  _enterCreeping() {
    this._phase = 'creeping'
    const targetX = SEAT_XS[this._targetIdx]
    this._phaseTxt.setText('🐍 Creeping under the benches...').setColor('#88bb44')
    this._subTxt.setText('')
    this._flashTxt.setAlpha(0)

    const proxy = { x: this._klonkkuX }
    this.tweens.add({
      targets: proxy,
      x: targetX,
      duration: 1400,
      ease: 'Sine.easeInOut',
      onUpdate: () => { this._klonkkuX = proxy.x; this._redrawKlonkku() },
      onComplete: () => this._enterPoke(),
    })
  }

  // ── PHASE: POKE ──────────────────────────────────────────────────────────

  _enterPoke() {
    this._phase = 'poke'
    const targetX = SEAT_XS[this._targetIdx]
    const dir = this._klonkkuX <= targetX ? '👉' : '👈'

    this._pokeArm
      .setText(dir)
      .setPosition(this._klonkkuX + (dir === '👉' ? 24 : -24), UNDER_Y - 18)
      .setAlpha(1)

    this.tweens.add({
      targets: this._pokeArm,
      x: targetX,
      y: BENCH_Y + 18,
      duration: 240,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.cameras.main.shake(85, 0.008)
        this._pokeArm.setAlpha(0)

        const pok = this.add.text(targetX, BENCH_Y - 8, '🍑 POK!', {
          fontSize: '22px', fontFamily: 'monospace',
          color: '#ff6644', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0).setDepth(13)
        this.tweens.add({
          targets: pok, alpha: { from: 0, to: 1 }, y: pok.y - 24,
          duration: 160, hold: 460, yoyo: true,
          onComplete: () => pok.destroy(),
        })

        this.time.delayedCall(820, () => {
          if (this._targetIdx === 3) this._enterPlayerReaction()
          else this._enterNpcReaction()
        })
      },
    })
  }

  // ── PHASE: PLAYER REACTION ───────────────────────────────────────────────

  _enterPlayerReaction() {
    this._phase = 'player_reaction'
    this._phaseTxt.setText('🍑 YOU GOT POKED!').setColor('#ff6644')
    this._subTxt.setText('Press [ SPACE ] to resist the flinch!')
    this._showFlash('Press SPACE before the bar fills!', '#ff8844')

    this._barBg.setAlpha(1)
    this._barFill.setAlpha(1).setScale(0, 1)

    // Bar fills up — if it completes the player flinched
    this._barFillTween = this.tweens.add({
      targets: this._barFill,
      scaleX: 1,
      duration: 2500,
      ease: 'Linear',
      onComplete: () => this._onPlayerFlinch(),
    })

    // SPACE = player resists
    this._keyListener = (evt) => {
      if (evt.keyCode === 27) return   // ESC handled separately
      if (evt.keyCode === 32) this._onPlayerBrave()  // SPACE
    }
    this.input.keyboard.on('keydown', this._keyListener)
  }

  _onPlayerFlinch() {
    if (this._phase !== 'player_reaction') return
    this._clearReactionUI()
    this._phase = 'flinch'
    this._pokeCount++
    this._klonkkuCounts[3]++
    this._updatePokeCounter()

    this._phaseTxt.setText('😱 YOU FLINCHED!').setColor('#ff4444')
    this._subTxt.setText('You were too slow... now you\'re the klonkku.')
    this._showFlash('TOO SLOW — YOU FLINCHED 🍑', '#ff4444')

    this.time.delayedCall(1900, () => {
      this._klonkkuIdx = 3
      this._klonkkuX   = SEAT_XS[3]
      this._redrawKlonkku()
      this._nextRound()
    })
  }

  _onPlayerBrave() {
    if (this._phase !== 'player_reaction') return
    this._clearReactionUI()
    this._phase = 'no_flinch'
    this._pokeCount++
    this._updatePokeCounter()

    this._phaseTxt.setText('🧘 YOU RESISTED').setColor('#44ff88')
    this._subTxt.setText('Absolute unit. SPACE in time.')
    this._showFlash('Pressed SPACE in time. Respect.', '#44ff88')

    this.time.delayedCall(1900, () => this._nextRound())
  }

  // ── PHASE: NPC REACTION ──────────────────────────────────────────────────

  _enterNpcReaction() {
    this._phase = 'npc_reaction'
    const target = this._participants[this._targetIdx]
    this._phaseTxt.setText(`${target.name} got poked...`).setColor('#f0c070')
    this._subTxt.setText('')

    this.time.delayedCall(900, () => {
      const chance = FLINCH_CHANCE[target.id] ?? FLINCH_CHANCE.default
      if (Math.random() < chance) this._onNpcFlinch()
      else this._onNpcBrave()
    })
  }

  _onNpcFlinch() {
    this._phase = 'flinch'
    this._pokeCount++
    const target = this._participants[this._targetIdx]
    this._klonkkuCounts[this._targetIdx]++
    this._updatePokeCounter()

    this._phaseTxt.setText(`😱 ${target.name.toUpperCase()} FLINCHED!`).setColor('#ff4444')
    this._subTxt.setText(`${target.name} is now the klonkku!`)
    this._showFlash(`${target.name} flinched! 🍑`, '#ff4444')
    this._showBubble(this._targetIdx, this._pick(FLINCH_LINES))

    this.time.delayedCall(2000, () => {
      this._klonkkuIdx = this._targetIdx
      this._klonkkuX   = SEAT_XS[this._klonkkuIdx]
      this._redrawKlonkku()
      this._nextRound()
    })
  }

  _onNpcBrave() {
    this._phase = 'no_flinch'
    this._pokeCount++
    const target = this._participants[this._targetIdx]
    this._updatePokeCounter()

    this._phaseTxt.setText(`😤 ${target.name} held it together.`).setColor('#44ff88')
    this._subTxt.setText('Not even close.')
    this._showBubble(this._targetIdx, this._pick(BRAVE_LINES))

    this.time.delayedCall(1900, () => this._nextRound())
  }

  // ── ROUND LOOP ────────────────────────────────────────────────────────────

  _nextRound() {
    if (this._pokeCount >= TOTAL_POKES) {
      this.time.delayedCall(400, () => this._enterGameover())
    } else {
      this.time.delayedCall(300, () => this._enterKlonkkuPicks())
    }
  }

  // ── PHASE: GAMEOVER ──────────────────────────────────────────────────────

  _enterGameover() {
    this._phase = 'gameover'
    this._phaseTxt.setText('🏁 GAME OVER').setColor('#f1c40f')
    this._subTxt.setText('')
    this._flashTxt.setAlpha(0)

    // Dark overlay
    const ov = this.add.rectangle(W/2, H/2 + 30, W, H - 60, 0x000000, 0.72).setDepth(14)

    // Biggest klonkku
    let maxCount = 0, worstIdx = 0
    this._klonkkuCounts.forEach((c, i) => { if (c > maxCount) { maxCount = c; worstIdx = i } })
    const worst = this._participants[worstIdx]

    const rankings = this._participants
      .map((p, i) => `${p.name}: ${this._klonkkuCounts[i]}x`)
      .join('   ')

    this.add.text(W/2, 355, `🍑 Biggest klonkku: ${worst.name} (${maxCount}x)`, {
      fontSize: '18px', fontFamily: 'monospace',
      color: '#f1c40f', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15)

    this.add.text(W/2, 400, rankings, {
      fontSize: '12px', fontFamily: 'monospace',
      color: '#a88040', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(15)

    this.add.text(W/2, 450, '[ ENTER / ESC ]  Leave sauna', {
      fontSize: '13px', fontFamily: 'monospace',
      color: '#556677', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(15)
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  _showFlash(text, color) {
    this.tweens.killTweensOf(this._flashTxt)
    this._flashTxt.setText(text).setColor(color).setAlpha(0)
    this.tweens.add({ targets: this._flashTxt, alpha: 1, duration: 200 })
  }

  _updatePokeCounter() {
    this._pokeTxt.setText(`${this._pokeCount} / ${TOTAL_POKES} pokes`)
  }

  _clearReactionUI() {
    if (this._keyListener) {
      this.input.keyboard.off('keydown', this._keyListener)
      this._keyListener = null
    }
    if (this._barFillTween) { this._barFillTween.stop(); this._barFillTween = null }
    this._barBg.setAlpha(0)
    this._barFill.setAlpha(0)
  }

  _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  _exit() {
    if (this._exiting) return
    this._exiting = true
    this._clearReactionUI()
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.time.delayedCall(440, () => {
      this.scene.stop()
      this.scene.wake('RoomScene')
    })
  }
}
