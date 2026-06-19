import Phaser from 'phaser'
import { CHARACTERS } from '../data/characters.js'

const W = 900
const H = 600

// Head center positions for each participant
const SEATS = {
  elliot: { x: 200, y: 155 },
  robert: { x: 700, y: 155 },
  jon:    { x: 295, y: 260 },
  nixu:   { x: 605, y: 260 },
  player: { x: 450, y: 345 },
}

const NPC_COLOR_HEX = {
  elliot: '#27ae60',
  robert: '#f39c12',
  jon:    '#9b59b6',
  nixu:   '#c0392b',
}

const CHAR_DATA = {
  elliot: CHARACTERS.ELLIOT,
  robert: CHARACTERS.ROBERT,
  jon:    CHARACTERS.JON,
  nixu:   CHARACTERS.NIXU,
}

const TURN_ORDER  = ['elliot', 'jon', 'player', 'nixu', 'robert']
const TOTAL_TURNS = 5  // 1 round × 5 players

const NPC_STATEMENTS = {
  elliot: [
    { text: "...fallen asleep before midnight at a mökki.",        drinkers: ['robert'] },
    { text: "...mixed drinks that ended someone's night early.",    drinkers: ['jon', 'nixu'] },
  ],
  jon: [
    { text: "...asked someone to turn the music down.",            drinkers: ['elliot', 'nixu'] },
    { text: "...lost my speaker privileges for the night.",        drinkers: ['robert'] },
  ],
  nixu: [
    { text: "...refused a swim because the water was too cold.",   drinkers: ['elliot', 'robert'] },
    { text: "...left a mökki without helping clean up.",           drinkers: ['jon', 'robert'] },
  ],
  robert: [
    { text: "...pitched a business idea at a party.",              drinkers: ['nixu'] },
    { text: "...convinced myself one more drink was a good idea.", drinkers: ['elliot', 'jon', 'nixu'] },
  ],
}

const PLAYER_OPTIONS = [
  [
    { text: "...gone skinny dipping.",                             drinkers: ['jon', 'robert'] },
    { text: "...been the last one standing at a party.",           drinkers: ['elliot', 'nixu'] },
    { text: "...broken something at a party.",                     drinkers: ['robert', 'jon'] },
  ],
  [
    { text: "...woken up not knowing where I was.",                drinkers: ['jon', 'robert', 'nixu'] },
    { text: "...pretended to know a song I'd never heard.",        drinkers: ['elliot', 'nixu'] },
    { text: "...said 'never again' and fully meant it.",           drinkers: ['elliot', 'jon', 'nixu', 'robert'] },
  ],
]

const DRINK_REACTIONS = [
  "...yeah, that's me.",
  "Okay fine, I'm drinking.",
  "Did not expect to be called out.",
  "Cheers. I'm guilty.",
  "That one hits close to home.",
]

export class NeverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NeverScene' })
  }

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  create() {
    this._phase            = 'intro'
    this._turnIdx          = 0
    this._exiting          = false
    this._drinks           = { elliot: 0, robert: 0, jon: 0, nixu: 0, player: 0 }
    this._currentStatement = null

    this._bgGfx   = this.add.graphics().setDepth(0)
    this._bodyGfx = this.add.graphics().setDepth(3)
    this._headGfx = this.add.graphics().setDepth(5)

    this._drawBackground()
    this._drawBodies()
    this._drawHeads()
    this._buildTexts()
    this._bindKeys()

    this.cameras.main.fadeIn(400, 0, 0, 0)

    this.time.delayedCall(1800, () => {
      if (this._exiting) return
      if (this._phase === 'intro') this._startTurn()
    })
  }

  // ── BACKGROUND ─────────────────────────────────────────────────────────────

  _drawBackground() {
    const g = this._bgGfx

    // Ceiling planks
    g.fillStyle(0x1e1008)
    g.fillRect(0, 0, W, 55)
    g.lineStyle(1, 0x120a04, 0.55)
    for (let x = 30; x < W; x += 20) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 55); g.strokePath()
    }

    // Ceiling light glow (warm center)
    for (let i = 7; i > 0; i--) {
      g.fillStyle(0xffe080, 0.018 + i * 0.008)
      g.fillEllipse(W / 2, 30, 200 + i * 60, 60 + i * 24)
    }

    // Walls (55 → 480)
    g.fillStyle(0x2c1a0c)
    g.fillRect(0, 55, W, 425)
    g.lineStyle(1, 0x1e1006, 0.3)
    for (let x = 40; x < W; x += 16) {
      g.beginPath(); g.moveTo(x, 55); g.lineTo(x, 480); g.strokePath()
    }

    // ── FIREPLACE (left wall) ─────────────────────────────────────────────────
    const fpX = 28, fpY = 72, fpW = 128, fpH = 220

    // Stone surround
    g.fillStyle(0x504846)
    g.fillRect(fpX, fpY, fpW, fpH)
    g.fillStyle(0x645856)
    g.fillRect(fpX + 4, fpY + 4, fpW - 8, fpH - 8)

    // Mantle shelf
    g.fillStyle(0x7a4820)
    g.fillRect(fpX - 8, fpY - 14, fpW + 16, 16)
    g.fillStyle(0x9a5c2c, 0.55)
    g.fillRect(fpX - 8, fpY - 14, fpW + 16, 5)

    // Firebox interior
    g.fillStyle(0x140a02)
    g.fillRect(fpX + 28, fpY + 40, fpW - 56, fpH - 60)

    // Ember glow
    for (let i = 7; i > 0; i--) {
      g.fillStyle(0xd03000, 0.03 + i * 0.022)
      g.fillEllipse(fpX + fpW / 2, fpY + fpH - 24, 60 + i * 12, 32 + i * 6)
    }
    // Flames
    const fc = fpX + fpW / 2
    const fb = fpY + fpH - 30
    g.fillStyle(0xff7700, 0.88)
    g.fillTriangle(fc - 22, fb, fc, fpY + 65, fc + 22, fb)
    g.fillStyle(0xffcc00, 0.72)
    g.fillTriangle(fc - 14, fb, fc, fpY + 88, fc + 14, fb)
    g.fillStyle(0xffffff, 0.38)
    g.fillTriangle(fc - 6, fb, fc, fpY + 110, fc + 6, fb)

    // Room glow from fireplace
    for (let i = 9; i > 0; i--) {
      g.fillStyle(0xcc3800, 0.005 + i * 0.0022)
      g.fillEllipse(fpX + fpW / 2, fpY + fpH, 340 + i * 48, 260 + i * 36)
    }

    // ── NIGHT WINDOW (right wall) ─────────────────────────────────────────────
    const wX = 760, wY = 82, wW = 112, wH = 120

    // Night sky
    g.fillStyle(0x0a1222)
    g.fillRect(wX, wY, wW, wH)
    // Stars
    g.fillStyle(0xffffff, 0.85)
    ;[[773,100],[790,118],[815,95],[838,107],[848,130],[775,148],[825,155],[860,92]].forEach(([sx, sy]) => {
      g.fillRect(sx, sy, 2, 2)
    })
    // Moon
    g.fillStyle(0xffeecc, 0.9)
    g.fillCircle(850, 100, 11)
    g.fillStyle(0x0a1222, 1)
    g.fillCircle(855, 97, 10)

    // Window frame
    g.lineStyle(5, 0x6a3c18, 1)
    g.strokeRect(wX, wY, wW, wH)
    g.lineStyle(2.5, 0x6a3c18, 1)
    g.beginPath(); g.moveTo(wX + wW / 2, wY); g.lineTo(wX + wW / 2, wY + wH); g.strokePath()
    g.beginPath(); g.moveTo(wX, wY + wH / 2); g.lineTo(wX + wW, wY + wH / 2); g.strokePath()

    // Curtains
    g.fillStyle(0x5a1010, 0.7)
    g.fillRect(wX - 18, wY - 6, 26, wH + 12)
    g.fillRect(wX + wW - 8, wY - 6, 26, wH + 12)

    // ── FLOOR (480 → H) ───────────────────────────────────────────────────────
    g.fillStyle(0x3e2408)
    g.fillRect(0, 480, W, H - 480)
    g.lineStyle(1, 0x2e1a06, 0.55)
    for (let py = 494; py < H; py += 14) {
      g.beginPath(); g.moveTo(0, py); g.lineTo(W, py); g.strokePath()
    }

    // Floor-wall edge strip
    g.fillStyle(0x1e0e04)
    g.fillRect(0, 478, W, 4)

    // ── COFFEE TABLE (center) ─────────────────────────────────────────────────
    const tX = 320, tY = 400, tW = 260, tH = 72

    g.fillStyle(0x5e3214)
    g.fillRoundedRect(tX, tY, tW, tH, 6)
    g.fillStyle(0x7a4422, 0.55)
    g.fillRoundedRect(tX + 4, tY + 4, tW - 8, 14, 4)
    g.lineStyle(1.5, 0x3c1e08, 0.6)
    g.strokeRoundedRect(tX, tY, tW, tH, 6)

    // Beer cans on table
    ;[[365, tY + 12], [402, tY + 8], [443, tY + 12], [481, tY + 9], [516, tY + 13]].forEach(([cx, cy]) => {
      g.fillStyle(0xb8b8b8)
      g.fillRoundedRect(cx - 7, cy - 14, 14, 24, 2)
      g.fillStyle(0xcc3300)
      g.fillRect(cx - 7, cy - 8, 14, 10)
      g.fillStyle(0xb8b8b8, 0.4)
      g.fillRect(cx - 5, cy - 13, 10, 4)
    })

    // Rug under table
    g.fillStyle(0x6a1818, 0.22)
    g.fillEllipse(W / 2, tY + tH / 2 + 10, 400, 140)
  }

  // ── CHARACTER BODIES ────────────────────────────────────────────────────────

  _drawBodies() {
    const g = this._bodyGfx
    for (const id of ['elliot', 'robert', 'jon', 'nixu']) {
      const pos = SEATS[id]
      const ch  = CHAR_DATA[id]
      g.fillStyle(ch.bodyColor)
      g.fillRoundedRect(pos.x - 22, pos.y + 16, 44, 30, { tl: 4, tr: 4, bl: 8, br: 8 })
    }
    // Player body
    const pp = SEATS.player
    g.fillStyle(0x3070d0)
    g.fillRoundedRect(pp.x - 22, pp.y + 16, 44, 30, { tl: 4, tr: 4, bl: 8, br: 8 })
  }

  // ── CHARACTER HEADS ─────────────────────────────────────────────────────────

  _drawHeads() {
    const g = this._headGfx
    for (const id of ['elliot', 'robert', 'jon', 'nixu']) this._drawNpcHead(g, id)
    this._drawPlayerHead(g)
  }

  _drawNpcHead(g, id) {
    const pos  = SEATS[id]
    const ch   = CHAR_DATA[id]
    const r    = 20
    const cx   = pos.x
    const cy   = pos.y
    const skin = 0xf2c88a

    g.fillStyle(0x000000, 0.18); g.fillCircle(cx + 2, cy + 2, r)
    g.fillStyle(skin);            g.fillCircle(cx, cy, r)

    // Hair / hat
    g.fillStyle(ch.color)
    g.fillEllipse(cx, cy - r * 0.48, r * 1.9, r * 0.85)

    // Eyes
    const eyeS = r * 0.36
    const eyeY = cy + 2
    g.fillStyle(0x111111)
    g.fillCircle(cx - eyeS, eyeY, 2.8)
    g.fillCircle(cx + eyeS, eyeY, 2.8)
    g.fillStyle(0xffffff, 0.55)
    g.fillCircle(cx - eyeS - 1, eyeY - 1, 1)
    g.fillCircle(cx + eyeS - 1, eyeY - 1, 1)

    // Crown for Nixu
    if (id === 'nixu') {
      const cr = r + 4
      g.fillStyle(0xffd700)
      g.fillRect(cx - cr * 0.52, cy - cr - 4, cr * 1.04, 10)
      ;[-0.44, 0, 0.44].forEach(offset => {
        g.fillTriangle(
          cx + offset * cr - 5, cy - cr - 4,
          cx + offset * cr,     cy - cr - 14,
          cx + offset * cr + 5, cy - cr - 4
        )
      })
      g.fillStyle(0xff3300, 0.85)
      ;[-0.44, 0, 0.44].forEach(offset => {
        g.fillCircle(cx + offset * cr, cy - cr - 8, 2)
      })
    }

    g.lineStyle(1.5, 0x1a1a1a, 0.45); g.strokeCircle(cx, cy, r)
  }

  _drawPlayerHead(g) {
    const pos = SEATS.player
    const r   = 20
    const cx  = pos.x
    const cy  = pos.y

    g.fillStyle(0x000000, 0.18); g.fillCircle(cx + 2, cy + 2, r)
    g.fillStyle(0xf2c88a);        g.fillCircle(cx, cy, r)

    // Red cap
    g.fillStyle(0xd82018)
    g.fillEllipse(cx, cy - r * 0.52, r * 2.2, r * 0.76)
    g.fillRoundedRect(cx - r * 0.82, cy - r - 3, r * 1.64, r * 0.6, 3)

    g.fillStyle(0x111111)
    g.fillCircle(cx - 6, cy + 3, 2.5)
    g.fillCircle(cx + 6, cy + 3, 2.5)
    g.fillStyle(0xffffff, 0.55)
    g.fillCircle(cx - 7, cy + 2, 1)
    g.fillCircle(cx + 5, cy + 2, 1)

    g.lineStyle(1.5, 0x1a1a1a, 0.45); g.strokeCircle(cx, cy, r)
  }

  // ── TEXTS / HUD ────────────────────────────────────────────────────────────

  _buildTexts() {
    // Title
    this.add.text(W / 2, 28, '🍺  N E V E R  H A V E  I  E V E R', {
      fontSize: '20px', fontFamily: 'monospace', color: '#f0c040',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)

    // Round counter
    this._roundText = this.add.text(W - 20, 28, 'Turn 1 / 5', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaaaa',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(10)

    // Nametags
    const NS = { fontSize: '11px', fontFamily: 'monospace', color: '#d8d8d8', stroke: '#000', strokeThickness: 3 }
    const allIds = ['elliot', 'robert', 'jon', 'nixu', 'player']
    const names  = { elliot: 'Elliot', robert: 'Robert', jon: 'Jon', nixu: 'Nixu', player: 'You' }
    for (const id of allIds) {
      this.add.text(SEATS[id].x, SEATS[id].y - 32, names[id], NS).setOrigin(0.5, 1).setDepth(6)
    }

    // Drink counters (top-right badge per character, depth 7)
    this._drinkTexts = {}
    const DS = { fontSize: '11px', fontFamily: 'monospace', color: '#f0c040', stroke: '#000', strokeThickness: 2 }
    for (const id of allIds) {
      const pos = SEATS[id]
      this._drinkTexts[id] = this.add.text(pos.x + 26, pos.y - 18, '🍺×0', DS)
        .setOrigin(0, 1).setDepth(7)
    }

    // Speaker indicator arrow
    this._speakerArrow = this.add.text(0, 0, '▼', {
      fontSize: '14px', fontFamily: 'monospace', color: '#f0c040',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11).setVisible(false)

    // ── Statement area (y ≈ 420–520) ─────────────────────────────────────────

    this._statBg = this.add.rectangle(W / 2, 468, 780, 100, 0x000000, 0.68)
      .setOrigin(0.5).setDepth(9).setVisible(false)

    this._statLabel = this.add.text(W / 2, 428, 'Never have I ever…', {
      fontSize: '13px', fontFamily: 'monospace', color: '#888888',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10).setVisible(false)

    this._statText = this.add.text(W / 2, 468, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#f0e8d0',
      stroke: '#000', strokeThickness: 2,
      wordWrap: { width: 720 }, align: 'center',
    }).setOrigin(0.5).setDepth(10).setAlpha(0)

    // ── Player choose UI ─────────────────────────────────────────────────────

    this._yourTurnText = this.add.text(W / 2, 422, 'YOUR TURN — pick a statement:', {
      fontSize: '14px', fontFamily: 'monospace', color: '#f0c040',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setVisible(false)

    this._optionTexts = []
    const optYs = [452, 484, 516]
    for (let i = 0; i < 3; i++) {
      const bg = this.add.rectangle(W / 2, optYs[i], 700, 28, 0x000000, 0.55)
        .setOrigin(0.5).setDepth(9).setVisible(false)
      const t = this.add.text(W / 2, optYs[i], '', {
        fontSize: '15px', fontFamily: 'monospace', color: '#f0e8d0',
        stroke: '#000', strokeThickness: 2,
        wordWrap: { width: 660 }, align: 'center',
      }).setOrigin(0.5).setDepth(10).setVisible(false)
      this._optionTexts.push({ bg, t })
    }

    // ── Bottom hint bar ───────────────────────────────────────────────────────

    this._hintText = this.add.text(W / 2, H - 22, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#888888',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10)

    // ── Intro overlay ─────────────────────────────────────────────────────────

    this._introBg  = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setDepth(11)
    this._introTxt = this.add.text(W / 2, H / 2, 'Never Have I Ever\nEveryone gathers around…', {
      fontSize: '22px', fontFamily: 'monospace', color: '#f0c040',
      stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(12)

    this.time.delayedCall(1300, () => {
      if (this._exiting) return
      this.tweens.add({
        targets: [this._introBg, this._introTxt], alpha: 0, duration: 500,
        onComplete: () => { this._introBg.destroy(); this._introTxt.destroy() },
      })
    })

    // ── Gameover text ─────────────────────────────────────────────────────────

    this._gameoverText = this.add.text(W / 2, H / 2 - 20, '', {
      fontSize: '19px', fontFamily: 'monospace', color: '#f0e8d0',
      stroke: '#000', strokeThickness: 3,
      align: 'center', wordWrap: { width: 680 },
    }).setOrigin(0.5).setDepth(13).setAlpha(0)
  }

  // ── KEY BINDINGS ────────────────────────────────────────────────────────────

  _bindKeys() {
    const SPACE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    SPACE.on('down', () => {
      if (this._phase === 'react_prompt') this._resolvePlayer(true)
    })

    const E = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    E.on('down', () => {
      if (this._phase === 'react_prompt') this._resolvePlayer(false)
    })

    const ESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    ESC.on('down', () => {
      if (this._phase !== 'intro') this._exit()
    })

    const ONE   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE)
    const TWO   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO)
    const THREE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)

    ONE.on('down',   () => { if (this._phase === 'player_choose') this._selectOption(0) })
    TWO.on('down',   () => { if (this._phase === 'player_choose') this._selectOption(1) })
    THREE.on('down', () => { if (this._phase === 'player_choose') this._selectOption(2) })
  }

  // ── TURN LOGIC ──────────────────────────────────────────────────────────────

  _startTurn() {
    if (this._exiting) return
    if (this._turnIdx >= TOTAL_TURNS) {
      this._showGameover()
      return
    }

    const round  = Math.floor(this._turnIdx / 5)
    const whoIdx = this._turnIdx % 5
    const who    = TURN_ORDER[whoIdx]

    this._roundText.setText(`Turn ${this._turnIdx + 1} / ${TOTAL_TURNS}`)

    // Bounce arrow above current speaker
    this.tweens.killTweensOf(this._speakerArrow)
    const sp = SEATS[who]
    this._speakerArrow.setPosition(sp.x, sp.y - 46).setVisible(true)
    this.tweens.add({
      targets: this._speakerArrow, y: sp.y - 52,
      duration: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    })

    if (who === 'player') {
      this._phase = 'player_choose'
      this._showPlayerChoose(round)
    } else {
      this._phase = 'npc_turn'
      this._showStatement(NPC_STATEMENTS[who][round])
    }
  }

  _showStatement(stmt) {
    this._currentStatement = stmt
    this._statBg.setVisible(true)
    this._statLabel.setVisible(true)
    this._statText.setText(stmt.text).setAlpha(0)

    this.tweens.add({
      targets: this._statText, alpha: 1, duration: 600,
      onComplete: () => {
        if (this._exiting) return
        this._phase = 'react_prompt'
        this._hintText.setText('[SPACE] I\'ve done this   [E] Never   [ESC] Leave')
      },
    })
  }

  _showPlayerChoose(round) {
    this._statBg.setVisible(false)
    this._statLabel.setVisible(false)
    this._statText.setAlpha(0)
    this._yourTurnText.setVisible(true)
    this._hintText.setText('Press [1] [2] or [3] to choose')

    const opts = PLAYER_OPTIONS[round]
    for (let i = 0; i < 3; i++) {
      const { bg, t } = this._optionTexts[i]
      bg.setVisible(true)
      t.setText(`[${i + 1}]  ${opts[i].text}`).setVisible(true)
    }
  }

  _selectOption(idx) {
    if (this._exiting) return
    const round = Math.floor(this._turnIdx / 5)
    const stmt  = PLAYER_OPTIONS[round][idx]

    this._yourTurnText.setVisible(false)
    for (const { bg, t } of this._optionTexts) { bg.setVisible(false); t.setVisible(false) }
    this._hintText.setText('')

    this._phase = 'player_statement'
    this._showStatement(stmt)
  }

  // ── PLAYER DRINK DECISION ──────────────────────────────────────────────────

  _resolvePlayer(didIt) {
    if (this._exiting) return
    this._phase = 'react_resolve'
    this._hintText.setText('')

    if (didIt) {
      this._drinks.player++
      this._drinkTexts.player.setText(`🍺×${this._drinks.player}`)
      this._showBubble('player', '"...that\'s me."', '#f0c040')
    }

    // Staggered NPC drink reactions
    const drinkers = (this._currentStatement.drinkers || []).filter(d => d !== 'player')
    drinkers.forEach((npc, i) => {
      this.time.delayedCall(380 + i * 360, () => {
        if (this._exiting) return
        this._drinks[npc]++
        this._drinkTexts[npc].setText(`🍺×${this._drinks[npc]}`)
        this._showBubble(npc, `"${Phaser.Utils.Array.GetRandom(DRINK_REACTIONS)}"`, NPC_COLOR_HEX[npc] || '#ffffff')
      })
    })

    const totalDelay = 460 + drinkers.length * 360 + 1300
    this.time.delayedCall(totalDelay, () => {
      if (this._exiting) return
      this._endTurn()
    })
  }

  _endTurn() {
    this.tweens.killTweensOf(this._speakerArrow)
    this._speakerArrow.setVisible(false)
    this._statBg.setVisible(false)
    this._statLabel.setVisible(false)
    this._statText.setAlpha(0)
    this._hintText.setText('')
    this._phase = 'turn_end'
    this._turnIdx++
    this.time.delayedCall(800, () => {
      if (this._exiting) return
      this._startTurn()
    })
  }

  // ── SPEECH BUBBLES ──────────────────────────────────────────────────────────

  _showBubble(id, text, color) {
    const pos = SEATS[id]
    const qt  = this.add.text(pos.x, pos.y - 38, text, {
      fontSize: '13px', fontFamily: 'monospace', color,
      backgroundColor: '#00000099', padding: { x: 10, y: 5 },
      stroke: '#000000', strokeThickness: 1,
      wordWrap: { width: 240 }, align: 'center',
    }).setOrigin(0.5, 1).setDepth(12).setAlpha(0)

    this.tweens.add({
      targets: qt,
      alpha: { from: 0, to: 1 },
      y:     { from: pos.y - 38, to: pos.y - 58 },
      duration: 280, hold: 1900, yoyo: true, ease: 'Sine.easeInOut',
      onComplete: () => qt.destroy(),
    })
  }

  // ── GAMEOVER ────────────────────────────────────────────────────────────────

  _showGameover() {
    this._phase = 'gameover'
    this.tweens.killTweensOf(this._speakerArrow)
    this._speakerArrow.setVisible(false)
    this._statBg.setVisible(false)
    this._statLabel.setVisible(false)
    this._statText.setAlpha(0)

    const pd    = this._drinks.player
    const total = Object.values(this._drinks).reduce((a, b) => a + b, 0)
    const line  = pd >= 6 ? 'You had quite the past.' : pd >= 3 ? 'A few stories came out.' : pd >= 1 ? 'You kept it mostly clean.' : 'Clean conscience. Or good secrets.'
    const msg   = `Game over!\n\nYou drank ${pd} time${pd !== 1 ? 's' : ''}.\nTotal drinks across everyone: ${total}.\n\n${line}`

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(11)
    this._gameoverText.setText(msg)
    this.tweens.add({ targets: this._gameoverText, alpha: 1, duration: 700 })
    this._hintText.setText('[ESC] Head back outside').setDepth(14)
  }

  // ── EXIT ────────────────────────────────────────────────────────────────────

  _exit() {
    if (this._exiting) return
    this._exiting = true

    const gs = this.scene.get('GameScene')
    if (gs && gs.player) {
      for (let i = 0; i < this._drinks.player; i++) gs.player.addDrink()
    }

    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.time.delayedCall(450, () => {
      const returnTo = this.scene.isSleeping('RoomScene') ? 'RoomScene' : 'GameScene'
      this.scene.stop()
      this.scene.wake(returnTo)
    })
  }
}
