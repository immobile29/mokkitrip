const W = 900
const H = 600

const ROW_H    = 44
const LIST_TOP = 95
const LIST_X   = 80

export class MissionBoardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MissionBoardScene' })
  }

  create() {
    const gs = this.scene.get('GameScene')
    this._gs = gs
    this._missions = Object.values(gs._missions)  // ordered array
    this._cursor   = this._firstSelectableIndex()

    this._buildUI()
    this._buildList()
    this._bindKeys()

    this.cameras.main.fadeIn(180, 0, 0, 0)
  }

  // ── UI CHROME ─────────────────────────────────────────────────────────────

  _buildUI() {
    const gs = this._gs

    // Backdrop
    this.add.rectangle(W / 2, H / 2, W, H, 0x05050f, 0.92)
      .setScrollFactor(0).setDepth(50)

    // Border
    const border = this.add.rectangle(W / 2, H / 2, W - 20, H - 20, 0x000000, 0)
      .setScrollFactor(0).setDepth(50)
    border.setStrokeStyle(2, 0x4a90d0, 0.7)

    // Title
    this.add.text(W / 2, 32, '📋  MISSION BOARD', {
      fontSize: '22px', fontFamily: 'monospace',
      color: '#f1c40f',
      stroke: '#000000', strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51)

    // Sub-hint
    this.add.text(W / 2, 62, '[ ↑ ↓ ]  navigate     [ ENTER ]  start     [ ESC ]  close', {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#667788',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51)

    // Divider
    const div = this.add.graphics().setScrollFactor(0).setDepth(51)
    div.lineStyle(1, 0x334455, 0.7)
    div.lineBetween(LIST_X, 80, W - LIST_X, 80)

    // Bottom status bar
    const hasActive = !!gs._activeMission
    const allDone   = this._missions.every(m => m.done)

    if (allDone) {
      this.add.text(W / 2, H - 26, '🏆  All missions complete! Legendary.', {
        fontSize: '14px', fontFamily: 'monospace',
        color: '#f1c40f',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(51)
    } else if (hasActive) {
      const active = gs._missions[gs._activeMission]
      const secs   = gs._missionSecsLeft
      const m = Math.floor(secs / 60)
      const s = secs % 60
      this.add.text(W / 2, H - 26, `⏱ ACTIVE: ${active.label}  —  ${m}:${String(s).padStart(2,'0')} remaining`, {
        fontSize: '12px', fontFamily: 'monospace',
        color: '#ffcc44',
        stroke: '#000000', strokeThickness: 3,
        backgroundColor: '#0a080088',
        padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(51)
    } else {
      this.add.text(W / 2, H - 26, 'Select a mission and press ENTER to start the 3-minute timer.', {
        fontSize: '11px', fontFamily: 'monospace',
        color: '#445566',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(51)
    }

    // Progress tally
    const done = this._missions.filter(m => m.done).length
    this.add.text(W - LIST_X, 32, `${done} / ${this._missions.length}`, {
      fontSize: '15px', fontFamily: 'monospace',
      color: done === this._missions.length ? '#f1c40f' : '#557799',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(51)
  }

  // ── MISSION LIST ──────────────────────────────────────────────────────────

  _buildList() {
    this._rowObjects = []

    for (let i = 0; i < this._missions.length; i++) {
      const m   = this._missions[i]
      const ry  = LIST_TOP + i * ROW_H
      const gs  = this._gs
      const isActive = gs._activeMission === m.id
      const isDone   = m.done

      // Status icon
      const iconText = isDone ? '✓' : isActive ? '►' : '○'
      const iconColor = isDone ? '#44ff88' : isActive ? '#f1c40f' : '#556677'
      const icon = this.add.text(LIST_X, ry + ROW_H / 2, iconText, {
        fontSize: '16px', fontFamily: 'monospace',
        color: iconColor,
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(51)

      // Label
      const labelColor = isDone ? '#778899' : isActive ? '#f1c40f' : '#dde4ee'
      const label = this.add.text(LIST_X + 28, ry + 10, m.label, {
        fontSize: '14px', fontFamily: 'monospace',
        color: labelColor,
        stroke: '#000000', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(51)

      // Hint
      const hint = this.add.text(LIST_X + 28, ry + 28, m.hint, {
        fontSize: '10px', fontFamily: 'monospace',
        color: isDone ? '#44aa66' : '#445566',
        stroke: '#000000', strokeThickness: 1,
      }).setScrollFactor(0).setDepth(51)

      // Completion tag
      if (isDone) {
        this.add.text(W - LIST_X, ry + ROW_H / 2, 'DONE', {
          fontSize: '10px', fontFamily: 'monospace',
          color: '#44ff88',
          backgroundColor: '#00330088',
          padding: { x: 6, y: 2 },
          stroke: '#000000', strokeThickness: 1,
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(51)
      }

      this._rowObjects.push({ icon, label, hint })
    }

    // Cursor rect (highlight)
    this._cursorRect = this.add.rectangle(0, 0, W - LIST_X * 2 + 20, ROW_H - 4, 0xffffff, 0)
      .setScrollFactor(0).setDepth(50).setStrokeStyle(1.5, 0xf1c40f, 0.7)
    this._moveCursor(this._cursor)
  }

  _moveCursor(idx) {
    this._cursor = idx
    const ry = LIST_TOP + idx * ROW_H
    this._cursorRect.setPosition(W / 2, ry + ROW_H / 2)
  }

  _firstSelectableIndex() {
    const gs = this.scene.get('GameScene')
    const missions = Object.values(gs._missions)
    const idx = missions.findIndex(m => !m.done)
    return idx >= 0 ? idx : 0
  }

  // ── FEEDBACK FLASH ────────────────────────────────────────────────────────

  _showFeedback(text) {
    const prev = this._feedbackText
    if (prev) { this.tweens.killTweensOf(prev); prev.destroy() }

    this._feedbackText = this.add.text(W / 2, H - 56, text, {
      fontSize: '12px', fontFamily: 'monospace',
      color: '#ff8844',
      backgroundColor: '#220a0088',
      padding: { x: 10, y: 4 },
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(55).setAlpha(0)

    this.tweens.add({
      targets: this._feedbackText,
      alpha: { from: 0, to: 1 },
      duration: 200, hold: 1400, yoyo: true,
      onComplete: () => this._feedbackText?.destroy(),
    })
  }

  // ── INPUT ─────────────────────────────────────────────────────────────────

  _bindKeys() {
    const UP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    UP.on('down', () => {
      const next = Math.max(0, this._cursor - 1)
      if (next !== this._cursor) this._moveCursor(next)
    })

    const DOWN = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    DOWN.on('down', () => {
      const next = Math.min(this._missions.length - 1, this._cursor + 1)
      if (next !== this._cursor) this._moveCursor(next)
    })

    const ENTER = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    ENTER.on('down', () => this._startSelected())

    const ESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    ESC.on('down', () => this.scene.stop())
  }

  _startSelected() {
    const gs  = this._gs
    const m   = this._missions[this._cursor]

    if (m.done) {
      this._showFeedback('Already completed!')
      return
    }
    if (gs._activeMission && gs._activeMission !== m.id) {
      this._showFeedback('Finish your current mission first!')
      return
    }
    if (gs._activeMission === m.id) {
      this._showFeedback('This mission is already active!')
      return
    }

    gs._startMission(m.id)
    this.scene.stop()
  }
}
