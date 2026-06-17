import { DIALOGUES, REACTIONS } from '../data/dialogues.js'

const TYPEWRITER_SPEED = 28

const TONES = [
  { key: 'positive',    label: '😊 Nice  [1]', bg: 0x1a6a2a, hover: 0x22882e },
  { key: 'neutral',     label: '😐 Yeah  [2]', bg: 0x2a2a3a, hover: 0x3a3a4a },
  { key: 'provocative', label: '😤 Bring it  [3]', bg: 0x6a1a1a, hover: 0x882222 },
]

export class DialogueSystem {
  constructor(scene) {
    this.scene = scene
    this.isOpen = false
    this._phase = 'idle' // 'typing' | 'choose' | 'reaction'
    this._typeTimer = 0
    this._charIndex = 0
    this._fullText = ''
    this._onClose = null
    this._currentChar = null
  }

  create() {
    const { width, height } = this.scene.scale
    const boxH = 165
    const pad = 16
    const boxY = height - boxH - 10

    // Main background box
    this._bg = this.scene.add
      .rectangle(width / 2, boxY + boxH / 2, width - 20, boxH, 0x0d0d1e, 0.95)
      .setStrokeStyle(2, 0x4a90d0)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false)

    // Portrait circle
    this._portrait = this.scene.add
      .circle(30 + pad, boxY + 32, 24, 0xffffff)
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)

    // Portrait ring
    this._portraitRing = this.scene.add
      .circle(30 + pad, boxY + 32, 27, 0xffffff, 0)
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)

    this._portraitLetter = this.scene.add
      .text(30 + pad, boxY + 32, '', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22)
      .setVisible(false)

    this._nameTag = this.scene.add
      .text(70 + pad, boxY + 14, '', { fontSize: '13px', color: '#60c0f8', fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)

    this._bodyText = this.scene.add
      .text(70 + pad, boxY + 34, '', {
        fontSize: '14px', color: '#e8e8f0',
        wordWrap: { width: width - 130 },
        lineSpacing: 5,
      })
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)

    this._hint = this.scene.add
      .text(width - 30, boxY + boxH - 10, '[E] close', {
        fontSize: '11px', color: '#6080a0',
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)

    // ── Response buttons ─────────────────────────────────────────────
    const btnY = boxY + boxH - 44
    const btnW = Math.floor((width - 56) / 3)
    this._respBtns = TONES.map((tone, i) => {
      const bx = 10 + i * (btnW + 8) + btnW / 2
      const bg = this.scene.add
        .rectangle(bx, btnY, btnW, 34, tone.bg)
        .setStrokeStyle(1, 0xffffff, 0.25)
        .setScrollFactor(0)
        .setDepth(21)
        .setVisible(false)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(tone.hover))
        .on('pointerout', () => bg.setFillStyle(tone.bg))
        .on('pointerdown', () => this._respond(tone.key))

      const txt = this.scene.add
        .text(bx, btnY, tone.label, {
          fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(22)
        .setVisible(false)

      return { bg, txt, tone }
    })

    // Keyboard shortcuts for responses
    this._key1 = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE)
    this._key2 = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO)
    this._key3 = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)
  }

  open(character, timePeriod, onClose) {
    if (this.isOpen) return
    this.isOpen = true
    this._phase = 'typing'
    this._onClose = onClose ?? null
    this._currentChar = character

    const lines = DIALOGUES[character.id]?.[timePeriod] ?? ['...']
    this._fullText = lines[Math.floor(Math.random() * lines.length)]
    this._charIndex = 0
    this._typeTimer = 0

    this._portrait.setFillStyle(character.color)
    this._portraitRing.setStrokeStyle(3, character.color)
    this._portraitLetter.setText(character.name[0].toUpperCase())
    this._nameTag.setText(`${character.name}  —  ${character.title}`)
    this._bodyText.setText('')
    this._hint.setText('[E] skip').setVisible(true)

    this._setResponsesVisible(false)

    ;[this._bg, this._portrait, this._portraitRing, this._portraitLetter,
      this._nameTag, this._bodyText]
      .forEach(o => o.setVisible(true))
  }

  close() {
    if (!this.isOpen) return
    this.isOpen = false
    this._phase = 'idle'
    this._currentChar = null

    ;[this._bg, this._portrait, this._portraitRing, this._portraitLetter,
      this._nameTag, this._bodyText, this._hint]
      .forEach(o => o.setVisible(false))
    this._setResponsesVisible(false)

    this._onClose?.()
    this._onClose = null
  }

  update(delta) {
    if (!this.isOpen) return

    if (this._phase === 'typing' || this._phase === 'reaction') {
      if (this._charIndex < this._fullText.length) {
        this._typeTimer += delta
        const toAdd = Math.floor(this._typeTimer / TYPEWRITER_SPEED)
        if (toAdd > 0) {
          this._typeTimer -= toAdd * TYPEWRITER_SPEED
          this._charIndex = Math.min(this._charIndex + toAdd, this._fullText.length)
          this._bodyText.setText(this._fullText.slice(0, this._charIndex))
        }
      } else if (this._phase === 'typing') {
        // Text done — show response choices
        this._phase = 'choose'
        this._hint.setVisible(false)
        this._setResponsesVisible(true)
      }
    }

    if (this._phase === 'choose') {
      if (Phaser.Input.Keyboard.JustDown(this._key1)) this._respond('positive')
      else if (Phaser.Input.Keyboard.JustDown(this._key2)) this._respond('neutral')
      else if (Phaser.Input.Keyboard.JustDown(this._key3)) this._respond('provocative')
    }
  }

  tryInteract() {
    if (!this.isOpen) return false
    if (this._phase === 'typing') {
      this._charIndex = this._fullText.length
      this._bodyText.setText(this._fullText)
    } else if (this._phase === 'reaction') {
      if (this._charIndex >= this._fullText.length) {
        this.close()
      } else {
        this._charIndex = this._fullText.length
        this._bodyText.setText(this._fullText)
      }
    }
    return true
  }

  _respond(tone) {
    if (this._phase !== 'choose') return
    this._setResponsesVisible(false)

    const charReactions = REACTIONS[this._currentChar?.id]
    const pool = charReactions?.[tone] ?? ['...']
    this._fullText = pool[Math.floor(Math.random() * pool.length)]
    this._charIndex = 0
    this._typeTimer = 0
    this._bodyText.setText('')
    this._phase = 'reaction'
    this._hint.setText('[E] close').setVisible(true)
  }

  _setResponsesVisible(visible) {
    this._respBtns.forEach(({ bg, txt }) => {
      bg.setVisible(visible)
      txt.setVisible(visible)
    })
  }
}
