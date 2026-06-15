import { DIALOGUES } from '../data/dialogues.js'

const TYPEWRITER_SPEED = 30 // ms per character

export class DialogueSystem {
  constructor(scene) {
    this.scene = scene
    this.isOpen = false
    this._typeTimer = 0
    this._charIndex = 0
    this._fullText = ''
    this._onClose = null
    this._container = null
  }

  create() {
    const { width, height } = this.scene.scale
    const boxH = 130
    const pad = 16
    const boxY = height - boxH - 10

    this._bg = this.scene.add
      .rectangle(width / 2, boxY + boxH / 2, width - 20, boxH, 0x1a1a2e, 0.92)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false)

    this._portrait = this.scene.add
      .circle(30 + pad, boxY + 30, 22, 0xffffff)
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)

    this._portraitLetter = this.scene.add
      .text(30 + pad, boxY + 30, '', { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22)
      .setVisible(false)

    this._nameTag = this.scene.add
      .text(70 + pad, boxY + 16, '', { fontSize: '13px', color: '#f1c40f', fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)

    this._bodyText = this.scene.add
      .text(70 + pad, boxY + 36, '', {
        fontSize: '14px', color: '#ecf0f1',
        wordWrap: { width: width - 120 },
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)

    this._hint = this.scene.add
      .text(width - 30, boxY + boxH - 16, '[E] close', { fontSize: '11px', color: '#95a5a6' })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false)
  }

  open(character, timePeriod, onClose) {
    if (this.isOpen) return
    this.isOpen = true
    this._onClose = onClose ?? null

    const lines = DIALOGUES[character.id]?.[timePeriod] ?? ['...']
    this._fullText = lines[Math.floor(Math.random() * lines.length)]
    this._charIndex = 0
    this._typeTimer = 0

    this._portrait.setFillStyle(character.color)
    this._portraitLetter.setText(character.name[0].toUpperCase())
    this._nameTag.setText(`${character.name} — ${character.title}`)
    this._bodyText.setText('')

    ;[this._bg, this._portrait, this._portraitLetter, this._nameTag, this._bodyText, this._hint]
      .forEach(o => o.setVisible(true))
  }

  close() {
    if (!this.isOpen) return
    this.isOpen = false
    ;[this._bg, this._portrait, this._portraitLetter, this._nameTag, this._bodyText, this._hint]
      .forEach(o => o.setVisible(false))
    this._onClose?.()
    this._onClose = null
  }

  update(delta) {
    if (!this.isOpen) return
    if (this._charIndex < this._fullText.length) {
      this._typeTimer += delta
      const charsToAdd = Math.floor(this._typeTimer / TYPEWRITER_SPEED)
      if (charsToAdd > 0) {
        this._typeTimer -= charsToAdd * TYPEWRITER_SPEED
        this._charIndex = Math.min(this._charIndex + charsToAdd, this._fullText.length)
        this._bodyText.setText(this._fullText.slice(0, this._charIndex))
      }
    }
  }

  tryInteract() {
    if (!this.isOpen) return false
    if (this._charIndex < this._fullText.length) {
      // skip to end
      this._charIndex = this._fullText.length
      this._bodyText.setText(this._fullText)
    } else {
      this.close()
    }
    return true
  }
}
