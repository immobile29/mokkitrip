const W = 900
const H = 600

const SYMBOLS = [
  { s: '🍒', w: 30, m3:  3, name: 'cherry'  },
  { s: '🍋', w: 25, m3:  3, name: 'lemon'   },
  { s: '🍇', w: 20, m3:  5, name: 'grapes'  },
  { s: '🔔', w: 12, m3:  8, name: 'bell'    },
  { s: '⭐', w:  8, m3: 10, name: 'star'    },
  { s: '💎', w:  4, m3: 25, name: 'diamond' },
  { s: '🎰', w:  1, m3:100, name: 'jackpot' },
]
;(() => { let t = 0; SYMBOLS.forEach(s => { t += s.w; s.cum = t }) })()
const TOTAL_W = SYMBOLS[SYMBOLS.length - 1].cum

const pickSym  = () => { const r = Math.random() * TOTAL_W; return SYMBOLS.find(s => r <= s.cum) ?? SYMBOLS[0] }
const pickRand = arr => arr[Math.floor(Math.random() * arr.length)]

const BETS = [5, 10, 25, 50]

const MARK_LINES = {
  bet:   ["I've studied the patterns", "Navy officers don't lose", "This is it, boys", "Trust the process"],
  spin:  ["COME ON COME ON", "Yes yes yes yes", "The sea provides", "COME ON SEA LUCK"],
  lose:  ["Rigged. Obviously.", "One more. Now.", "I'm up if you think about it", "Machine has a vendetta"],
  win:   ["I KNEW IT. MARK KNEW IT.", "Sea level WEALTH", "Better than catching bass", "YES YES YES"],
  group: ["THE NAVY ALWAYS DELIVERS", "THREE HUNDRED EUROS. EACH."],
}

const ALLU_LINES = {
  bet:   ["Let's GOOOO", "money money money", "THIS IS THE ONE", "Allu feels it"],
  spin:  ["AAAAAAAAAA", "I can't watch. I'm watching.", "MY HEART MY HEART", "COMEEEE ONNN"],
  lose:  ["Again. Obviously.", "Machine doesn't know Allu", "ONE MORE SPIN.", "HOW. HOW."],
  win:   ["OH MY GODDDDD", "YES YES YES YES YES", "ALLU IS RICH NOW", "LETSSSS GOOO"],
  group: ["EVERYONE WINS", "WE'RE MILLIONAIRES", "BEST. NIGHT. EVER."],
}

export class GamblingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GamblingScene' })
  }

  preload() {
    if (!this.cache.audio.has('degenerate_gamblers')) {
      this.load.audio('degenerate_gamblers', 'assets/sounds/degenerate_gamblers.mp3')
    }
  }

  create() {
    this._balance        = 200
    this._betIdx         = 1
    this._phase          = 'betting'
    this._finalSyms      = [null, null, null]
    this._reelLocked     = [false, false, false]
    this._groupEventUsed = false
    this._isGroupEvent   = false
    this._exiting        = false
    this._spinCycleTimer = null
    this._commentObjs    = { left: null, right: null }
    this._groupObjects   = []

    this._drawBg()
    this._drawTitle()
    this._drawMark()
    this._drawAllu()
    this._buildSlot()
    this._buildHUD()
    this._bindKeys()

    this._showComment('left',  'bet')
    this._showComment('right', 'bet')

    this._music = this.sound.add('degenerate_gamblers', { loop: true, volume: 0.6 })
    this._music.play()

    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  // ── BACKGROUND ──────────────────────────────────────────────────────────

  _drawBg() {
    this.add.rectangle(W/2, H/2, W, H, 0x060812)
    this.add.rectangle(W/2, H - 50, W, 100, 0x0c1020)

    const g = this.add.graphics()
    g.fillStyle(0x1133cc, 0.05)
    g.fillRoundedRect(260, 115, 380, 210, 12)
    g.fillStyle(0x1133cc, 0.03)
    g.fillRoundedRect(230, 100, 440, 240, 14)
  }

  _drawTitle() {
    this.add.text(W/2 + 2, 38, '🎰  ONLINE CASINO  🎰', {
      fontSize: '26px', fontFamily: 'monospace', color: '#001055',
    }).setOrigin(0.5)
    this.add.text(W/2, 36, '🎰  ONLINE CASINO  🎰', {
      fontSize: '26px', fontFamily: 'monospace',
      color: '#44aaff',
      stroke: '#001133', strokeThickness: 4,
    }).setOrigin(0.5)
    const gd = this.add.graphics()
    gd.lineStyle(1, 0x223355, 0.6)
    gd.lineBetween(40, 63, W - 40, 63)
  }

  // ── CHARACTERS ──────────────────────────────────────────────────────────

  _drawMark() {
    const g = this.add.graphics()
    this._drawHuman(g, 130, 274, { bodyColor: 0x1a6fa8, legColor: 0x2980b9, isYellow: false, hasTattoo: false }, 2.0)
    this.add.text(130, 167, 'Mark', {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#4a9ad4', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5)
  }

  _drawAllu() {
    const g = this.add.graphics()
    this._drawHuman(g, 770, 274, { bodyColor: 0xd4ac0d, legColor: 0xf1c40f, isYellow: true, hasTattoo: true }, 2.0)
    this.add.text(770, 167, 'Allu', {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#e8c010', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5)
  }

  _drawHuman(g, x, y, d, S) {
    const hc = d.isYellow ? 0xf0c030 : 0xf2c88a
    g.fillStyle(0x000000, 0.15)
    g.fillEllipse(x + S * 3, y + S * 25, S * 38, S * 9)
    g.fillStyle(d.legColor)
    g.fillRoundedRect(x - S * 9, y + S * 15, S * 7, S * 9, S * 2)
    g.fillRoundedRect(x + S * 2,  y + S * 15, S * 7, S * 9, S * 2)
    g.fillStyle(d.bodyColor)
    g.fillRoundedRect(x - S * 10, y - S * 6, S * 20, S * 22, S * 4)
    if (d.hasTattoo) {
      g.fillStyle(0x2c3e50)
      g.fillRect(x - S * 4, y, S * 8, S * 5)
    }
    g.fillStyle(hc)
    g.fillCircle(x, y - S * 18, S * 10)
    g.fillStyle(0x1a1a1a)
    g.fillCircle(x - S * 3.5, y - S * 19, S * 2)
    g.fillCircle(x + S * 3.5, y - S * 19, S * 2)
    g.fillStyle(0xffffff, 0.85)
    g.fillCircle(x - S * 2.5, y - S * 20, S * 0.8)
    g.fillCircle(x + S * 4.5, y - S * 20, S * 0.8)
  }

  // ── SLOT MACHINE ────────────────────────────────────────────────────────

  _buildSlot() {
    const CX = W / 2, CY = 244
    const RW = 76, RH = 76, GAP = 10
    const XS = [CX - RW - GAP, CX, CX + RW + GAP]

    const g = this.add.graphics()
    g.fillStyle(0x080818, 0.96)
    g.fillRoundedRect(CX - 168, CY - 52, 336, 104, 12)
    g.lineStyle(2, 0x2244bb, 0.65)
    g.strokeRoundedRect(CX - 168, CY - 52, 336, 104, 12)
    g.lineStyle(1, 0x3366dd, 0.15)
    g.lineBetween(CX - 158, CY - 42, CX + 158, CY - 42)

    this._reelSlots = XS.map((rx) => {
      const rg = this.add.graphics()
      rg.fillStyle(0x0d1235)
      rg.fillRoundedRect(rx - RW/2, CY - RH/2, RW, RH, 6)
      rg.lineStyle(1.5, 0x2a3a66, 0.9)
      rg.strokeRoundedRect(rx - RW/2, CY - RH/2, RW, RH, 6)

      const t = this.add.text(rx, CY, '🎰', {
        fontSize: '36px',
      }).setOrigin(0.5).setDepth(2)

      return { t, x: rx, rg }
    })
  }

  // ── HUD ─────────────────────────────────────────────────────────────────

  _buildHUD() {
    const HY = 350
    this._hudY = HY

    this._balText = this.add.text(W/2, HY, '💰 200€', {
      fontSize: '22px', fontFamily: 'monospace',
      color: '#f1c40f',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5)

    this.add.text(W/2, HY + 38, 'BET:', {
      fontSize: '11px', fontFamily: 'monospace', color: '#445566',
    }).setOrigin(0.5)

    this._betObjs = BETS.map((b, i) => {
      const tx = W/2 + (i - 1.5) * 78
      return this.add.text(tx, HY + 58, `${b}€`, {
        fontSize: '14px', fontFamily: 'monospace',
        color: '#556677', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5)
    })

    const BY = HY + 98
    this._btnY  = BY
    this._btnGfx = this.add.graphics()
    this._btnTxt = this.add.text(W/2, BY, 'SPIN  [ ENTER ]', {
      fontSize: '14px', fontFamily: 'monospace',
      color: '#77ffaa', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5)
    this._drawBtn(true)

    this.add.text(W/2, BY + 46, '[ ESC ]  Leave table', {
      fontSize: '10px', fontFamily: 'monospace', color: '#2a3a4a',
    }).setOrigin(0.5)

    this._resultTxt = this.add.text(W/2, 178, '', {
      fontSize: '18px', fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#000000aa',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(20)

    this._refreshHUD()
  }

  _drawBtn(enabled) {
    this._btnGfx.clear()
    const col = enabled ? 0x1a5e22 : 0x1c1c1c
    const rim = enabled ? 0x44cc66 : 0x303030
    this._btnGfx.fillStyle(col)
    this._btnGfx.fillRoundedRect(W/2 - 106, this._btnY - 19, 212, 38, 9)
    this._btnGfx.lineStyle(1.5, rim, enabled ? 0.65 : 0.25)
    this._btnGfx.strokeRoundedRect(W/2 - 106, this._btnY - 19, 212, 38, 9)
    this._btnTxt.setColor(enabled ? '#77ffaa' : '#445544')
  }

  _refreshHUD() {
    this._balText.setText(`💰 ${this._balance}€`)
    this.scene.get('GameScene')?.events.emit('balance:gambling', this._balance)
    this._betObjs.forEach((t, i) => {
      const sel = i === this._betIdx
      t.setColor(sel ? '#f1c40f' : '#556677')
      t.setStyle({ fontSize: sel ? '17px' : '13px' })
    })
  }

  // ── COMMENT BUBBLES ─────────────────────────────────────────────────────

  _showComment(side, moment) {
    const lines = side === 'left' ? MARK_LINES : ALLU_LINES
    const arr = lines[moment]
    if (!arr?.length) return
    const cx = side === 'left' ? 130 : 770

    const prev = this._commentObjs[side]
    if (prev) { this.tweens.killTweensOf(prev); prev.destroy() }

    const t = this.add.text(cx, 122, `"${pickRand(arr)}"`, {
      fontSize: '10px', fontFamily: 'monospace',
      color: '#dde8ff',
      stroke: '#000000', strokeThickness: 2,
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 },
      wordWrap: { width: 150 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0).setDepth(6)

    this._commentObjs[side] = t
    this.tweens.add({
      targets: t,
      alpha: { from: 0, to: 1 },
      duration: 180, hold: 2600, yoyo: true,
      onComplete: () => { if (this._commentObjs[side] === t) this._commentObjs[side] = null },
    })
  }

  // ── INPUT ────────────────────────────────────────────────────────────────

  _bindKeys() {
    const kb = this.input.keyboard
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT).on('down', () => {
      if (this._phase !== 'betting') return
      this._betIdx = Math.max(0, this._betIdx - 1)
      this._refreshHUD()
    })
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT).on('down', () => {
      if (this._phase !== 'betting') return
      this._betIdx = Math.min(BETS.length - 1, this._betIdx + 1)
      this._refreshHUD()
    })
    const onAction = () => {
      if (this._phase === 'betting') this._startSpin()
      else if (this._phase === 'result') this._backToBetting()
    }
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', onAction)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', onAction)
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this._exit())
  }

  // ── SPIN ─────────────────────────────────────────────────────────────────

  _startSpin() {
    const bet = BETS[this._betIdx]
    if (bet > this._balance) {
      this._showResultText("Not enough money 💸", '#ff6644')
      return
    }

    this._balance -= bet
    this._phase = 'spinning'
    this._drawBtn(false)

    const doGroup = !this._groupEventUsed && Math.random() < 0.20
    if (doGroup) this._groupEventUsed = true
    this._isGroupEvent = doGroup

    this._finalSyms  = [pickSym(), pickSym(), pickSym()]
    this._reelLocked = [false, false, false]

    this._spinCycleTimer = this.time.addEvent({
      delay: 75, repeat: -1,
      callback: () => {
        for (let i = 0; i < 3; i++) {
          if (!this._reelLocked[i])
            this._reelSlots[i].t.setText(pickRand(SYMBOLS).s)
        }
      },
    })

    this._showComment('left',  'spin')
    this._showComment('right', 'spin')

    ;[1000, 1360, 1720].forEach((ms, i) => {
      this.time.delayedCall(ms, () => {
        this._reelLocked[i] = true
        this._reelSlots[i].t.setText(this._finalSyms[i].s)
        this.cameras.main.shake(55, 0.004)
      })
    })

    this.time.delayedCall(2020, () => {
      if (this._spinCycleTimer) { this._spinCycleTimer.remove(); this._spinCycleTimer = null }
      if (this._isGroupEvent) this._doGroupEvent(bet)
      else this._resolveNormal(bet)
    })
  }

  _resolveNormal(bet) {
    const [a, b, c] = this._finalSyms
    let gain = 0, msg = '', col = '#ff5533'

    if (a.name === b.name && b.name === c.name) {
      gain = Math.round(bet * a.m3)
      msg  = `${a.s}${a.s}${a.s}   +${gain}€ !`
      col  = a.name === 'jackpot' ? '#f1c40f' : '#88ff88'
      this._showComment('left',  'win')
      this._showComment('right', 'win')
    } else if (a.name === b.name || b.name === c.name || a.name === c.name) {
      gain = Math.round(bet * 1.5)
      msg  = `Two of a kind!   +${gain}€`
      col  = '#aaee88'
      this._showComment('left',  'win')
      this._showComment('right', 'win')
    } else {
      msg  = `No match  –${bet}€`
      this._showComment('left',  'lose')
      this._showComment('right', 'lose')
    }

    this._balance += gain
    this._refreshHUD()
    this._showResultText(msg, col)
    this._phase = 'result'
    this._drawBtn(true)

    if (this._balance <= 0) {
      this.time.delayedCall(1800, () => {
        this._showResultText('COMPLETELY BROKE 💸', '#ff3333')
        this.time.delayedCall(2200, () => this._exit())
      })
    }
  }

  // ── GROUP EVENT ──────────────────────────────────────────────────────────

  _doGroupEvent() {
    const banner = this.add.text(W/2, 90, '🎉  THE BOYS ARE ALL IN  🎉', {
      fontSize: '19px', fontFamily: 'monospace',
      color: '#f1c40f',
      stroke: '#000', strokeThickness: 4,
      backgroundColor: '#000000aa',
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setAlpha(0).setDepth(12)
    this._groupObjects.push(banner)
    this.tweens.add({ targets: banner, alpha: 1, duration: 300 })

    const extras = [
      { name: 'Jon',      bc: 0x6c3483, lc: 0x9b59b6, x: 258, y: 298 },
      { name: 'Robert',   bc: 0x922b21, lc: 0xe74c3c, x: 308, y: 310 },
      { name: 'Nikkebre', bc: 0x1d6a27, lc: 0x27ae60, x: 592, y: 310 },
      { name: 'Immobile', bc: 0x17a589, lc: 0x1abc9c, x: 642, y: 298 },
    ]

    extras.forEach((ch, i) => {
      const g = this.add.graphics()
      this._drawHuman(g, ch.x, ch.y, {
        bodyColor: ch.bc, legColor: ch.lc, isYellow: false, hasTattoo: false,
      }, 1.35)
      g.setAlpha(0).setDepth(4)
      this._groupObjects.push(g)
      this.tweens.add({ targets: g, alpha: 1, duration: 220, delay: 80 + i * 70 })

      const lbl = this.add.text(ch.x, ch.y - 55, ch.name, {
        fontSize: '9px', fontFamily: 'monospace',
        color: '#aabbcc', stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5).setAlpha(0).setDepth(7)
      this._groupObjects.push(lbl)
      this.tweens.add({ targets: lbl, alpha: 1, duration: 180, delay: 180 + i * 70 })
    })

    this.time.delayedCall(1050, () => {
      this._reelSlots.forEach(r => r.t.setText('💎'))

      this._showResultText('💎💎💎   ALL BOYS WIN  +300€ !', '#f1c40f')
      this._balance += 300
      this._refreshHUD()
      this._showComment('left',  'group')
      this._showComment('right', 'group')

      // Immobile gets nothing
      this.time.delayedCall(650, () => {
        const imBadge = this.add.text(642, 198, '❌❌❌\nINVALID TICKET', {
          fontSize: '10px', fontFamily: 'monospace',
          color: '#ff3333',
          backgroundColor: '#110000cc',
          padding: { x: 7, y: 5 },
          align: 'center',
          stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5).setAlpha(0).setDepth(15)
        this._groupObjects.push(imBadge)
        this.tweens.add({ targets: imBadge, alpha: 1, duration: 200 })

        const imSpeech = this.add.text(642, 140, '"What... where\'s mine?"', {
          fontSize: '9px', fontFamily: 'monospace',
          color: '#ff9999',
          backgroundColor: '#00000088',
          padding: { x: 5, y: 3 },
          stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5).setAlpha(0).setDepth(15)
        this._groupObjects.push(imSpeech)
        this.tweens.add({ targets: imSpeech, alpha: 1, duration: 200, delay: 280 })
      })

      this._phase = 'result'
      this._drawBtn(true)
    })
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  _showResultText(text, color) {
    this.tweens.killTweensOf(this._resultTxt)
    this._resultTxt.setText(text).setColor(color).setAlpha(0)
    this.tweens.add({ targets: this._resultTxt, alpha: 1, duration: 220 })
  }

  _backToBetting() {
    this._groupObjects.forEach(o => { try { o.destroy() } catch (_) {} })
    this._groupObjects = []
    this.tweens.add({ targets: this._resultTxt, alpha: 0, duration: 180 })
    this._phase = 'betting'
    this._showComment('left',  'bet')
    this._showComment('right', 'bet')
  }

  _exit() {
    if (this._exiting) return
    this._exiting = true
    if (this._spinCycleTimer) { this._spinCycleTimer.remove(); this._spinCycleTimer = null }
    this._music?.stop()
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.time.delayedCall(440, () => {
      this.scene.stop()
      this.scene.wake('RoomScene')
    })
  }
}
