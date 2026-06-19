const W = 900
const H = 600
const TOTAL = 11

export class HideSeekScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HideSeekScene' })
  }

  create() {
    this._foundCount = 0
    this._secondsLeft = 180
    this._ended = false
    this._exiting = false

    // ── TOP HUD BAR ───────────────────────────────────────────────────────
    this.add.rectangle(W / 2, 30, W, 60, 0x000000, 0.84)
      .setScrollFactor(0).setDepth(50)

    this._timerText = this.add.text(W / 2, 12, '3:00', {
      fontSize: '22px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000000', strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(51)

    this._foundText = this.add.text(W / 2, 38, `Found: 0 / ${TOTAL}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#d0d0d0',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(51)

    this.add.text(W - 12, 30, '👀 Hide and Seek', {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(51)

    this.add.text(W / 2, H - 14, '[ESC] Give up', {
      fontSize: '12px', fontFamily: 'monospace', color: '#555555',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51)

    // ── FOUND POPUP ───────────────────────────────────────────────────────
    this._popupBg = this.add.rectangle(W / 2, H / 2, 680, 130, 0x000000, 0.92)
      .setScrollFactor(0).setDepth(52).setVisible(false)
    this.add.rectangle(W / 2, H / 2, 680, 130, 0xffffff, 0)
      .setScrollFactor(0).setDepth(52) // placeholder; actual outline drawn per-find
    this._popupBorder = this.add.rectangle(W / 2, H / 2, 682, 132, 0xffffff, 0)
      .setScrollFactor(0).setDepth(52).setVisible(false)

    this._popupName = this.add.text(W / 2, H / 2 - 28, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000000', strokeThickness: 3, fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(53).setVisible(false)

    this._popupQuote = this.add.text(W / 2, H / 2 + 16, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#e8e4d8',
      stroke: '#000000', strokeThickness: 2,
      wordWrap: { width: 620 }, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(53).setVisible(false)

    // ── END SCREEN ────────────────────────────────────────────────────────
    this._endOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88)
      .setScrollFactor(0).setDepth(54).setVisible(false)

    this._endTitle = this.add.text(W / 2, H / 2 - 70, '', {
      fontSize: '28px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000000', strokeThickness: 4, fontStyle: 'bold',
      align: 'center', wordWrap: { width: 720 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(55).setVisible(false)

    this._endBody = this.add.text(W / 2, H / 2 + 10, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#d0cfc0',
      stroke: '#000000', strokeThickness: 2,
      align: 'center', wordWrap: { width: 700 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(55).setVisible(false)

    this._endHint = this.add.text(W / 2, H / 2 + 90, '[ESC] Back to the party', {
      fontSize: '15px', fontFamily: 'monospace', color: '#888888',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(55).setVisible(false)

    // ── TIMER ─────────────────────────────────────────────────────────────
    this._tickEvent = this.time.addEvent({
      delay: 1000,
      callback: this._onTick,
      callbackScope: this,
      repeat: 179,
    })

    // ── EVENTS FROM GAMESCENE ─────────────────────────────────────────────
    const gs = this.scene.get('GameScene')
    gs.events.on('npc_found', this._onNpcFound, this)

    // ── INPUT ─────────────────────────────────────────────────────────────
    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this._escKey.on('down', () => {
      if (this._ended) {
        this._exit()
      } else {
        this._endGame('quit')
      }
    })

    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  _onTick() {
    this._secondsLeft--
    const m = Math.floor(this._secondsLeft / 60)
    const s = this._secondsLeft % 60
    this._timerText.setText(`${m}:${String(s).padStart(2, '0')}`)
    if (this._secondsLeft <= 30) this._timerText.setColor('#e74c3c')
    if (this._secondsLeft <= 0) this._endGame('timeout')
  }

  _onNpcFound({ char, quote, foundCount }) {
    this._foundCount = foundCount
    this._foundText.setText(`Found: ${foundCount} / ${TOTAL}`)
    this._showPopup(char, quote)
    if (foundCount >= TOTAL) {
      this.time.delayedCall(2400, () => this._endGame('win'))
    }
  }

  _showPopup(char, quote) {
    this.tweens.killTweensOf([this._popupBg, this._popupBorder, this._popupName, this._popupQuote])

    const nameColor = '#' + char.color.toString(16).padStart(6, '0')
    this._popupBg.setAlpha(1).setVisible(true)
    this._popupBorder.setStrokeStyle(2, char.color, 0.7).setAlpha(1).setVisible(true)
    this._popupName.setText(`✓  Found ${char.name}!`).setColor(nameColor).setAlpha(1).setVisible(true)
    this._popupQuote.setText(`"${quote}"`).setAlpha(1).setVisible(true)

    const targets = [this._popupBg, this._popupBorder, this._popupName, this._popupQuote]
    this.time.delayedCall(2100, () => {
      this.tweens.add({
        targets,
        alpha: 0,
        duration: 400,
        onComplete: () => targets.forEach(t => t.setVisible(false)),
      })
    })
  }

  _endGame(reason) {
    if (this._ended) return
    this._ended = true
    this._reason = reason
    if (this._tickEvent) this._tickEvent.remove()

    const gs = this.scene.get('GameScene')
    gs.events.off('npc_found', this._onNpcFound, this)

    // Hide popup immediately
    ;[this._popupBg, this._popupBorder, this._popupName, this._popupQuote]
      .forEach(t => t.setVisible(false))

    let title, body
    if (reason === 'win') {
      title = '🎉 You found everyone!'
      body = 'The whole gang is impressed.\nEven Schmaxel. Barely.'
    } else if (reason === 'timeout') {
      title = "Time's up!"
      const flavour = this._foundCount < 6
        ? 'Some of them are still out there.\nPretty embarrassing, honestly.'
        : 'So close! A few managed to hide.'
      body = `You found ${this._foundCount} / ${TOTAL}.\n${flavour}`
    } else {
      title = 'You gave up.'
      body = `Found: ${this._foundCount} / ${TOTAL}\n${this._foundCount === 0 ? 'Did you even try?' : 'Not bad, not great.'}`
    }

    this._endOverlay.setVisible(true)
    this._endTitle.setText(title).setVisible(true).setAlpha(0)
    this._endBody.setText(body).setVisible(true).setAlpha(0)
    this._endHint.setVisible(true).setAlpha(0)
    this.tweens.add({
      targets: [this._endTitle, this._endBody, this._endHint],
      alpha: 1,
      duration: 700,
    })
  }

  _exit() {
    if (this._exiting) return
    this._exiting = true
    const gs = this.scene.get('GameScene')
    if (gs) gs.endHideSeek()
    gs?.events.emit('result:hideseek', { won: this._reason === 'win' })
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.time.delayedCall(450, () => this.scene.stop())
  }

  shutdown() {
    const gs = this.scene.get('GameScene')
    if (gs) gs.events.off('npc_found', this._onNpcFound, this)
    if (gs && !this._exiting) gs.endHideSeek()
  }
}
