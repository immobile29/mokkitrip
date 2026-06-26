const W = 900
const H = 600

const ROW_H       = 42
const LIST_TOP    = 94
const LIST_X      = 80
const VISIBLE     = 10   // rows visible at once

export class MissionBoardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MissionBoardScene' })
  }

  create() {
    const gs = this.scene.get('GameScene')
    this._gs = gs
    this._missions    = Object.values(gs._missions)
    this._cursor      = this._firstSelectableIndex()
    this._scrollTop   = 0   // index of first visible row
    this._confirmQuit = false
    this._rowObjects  = []

    this._buildUI()
    this._buildScrollIndicators()
    this._cursorRect = this.add.rectangle(0, 0, W - LIST_X * 2 + 20, ROW_H - 4, 0xffffff, 0)
      .setScrollFactor(0).setDepth(50).setStrokeStyle(1.5, 0xf1c40f, 0.7)

    this._renderRows()
    this._bindKeys()

    this.cameras.main.fadeIn(180, 0, 0, 0)
  }

  // ── UI CHROME ─────────────────────────────────────────────────────────────

  _buildUI() {
    const gs = this._gs

    this.add.rectangle(W / 2, H / 2, W, H, 0x05050f, 0.92)
      .setScrollFactor(0).setDepth(50)

    const border = this.add.rectangle(W / 2, H / 2, W - 20, H - 20, 0x000000, 0)
      .setScrollFactor(0).setDepth(50)
    border.setStrokeStyle(2, 0x4a90d0, 0.7)

    this.add.text(W / 2, 32, '📋  MISSION BOARD', {
      fontSize: '22px', fontFamily: 'monospace',
      color: '#f1c40f',
      stroke: '#000000', strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51)

    const hintLabel = gs._activeMission
      ? '[ ↑ ↓ ]  navigate     [ ENTER ]  start / abandon active     [ ESC ]  close'
      : '[ ↑ ↓ ]  navigate     [ ENTER ]  start     [ ESC ]  close'
    this.add.text(W / 2, 62, hintLabel, {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#667788',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51)

    const div = this.add.graphics().setScrollFactor(0).setDepth(51)
    div.lineStyle(1, 0x334455, 0.7)
    div.lineBetween(LIST_X, 80, W - LIST_X, 80)
    div.lineBetween(LIST_X, LIST_TOP + VISIBLE * ROW_H + 2, W - LIST_X, LIST_TOP + VISIBLE * ROW_H + 2)

    const done = this._missions.filter(m => m.done).length
    const allDone = done === this._missions.length

    if (allDone) {
      this.add.text(W / 2, H - 26, '🏆  All missions complete! Legendary.', {
        fontSize: '14px', fontFamily: 'monospace',
        color: '#f1c40f',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(51)
    } else if (gs._activeMission) {
      const active = gs._missions[gs._activeMission]
      const secs = gs._missionSecsLeft
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

    this.add.text(W - LIST_X, 32, `${done} / ${this._missions.length}`, {
      fontSize: '15px', fontFamily: 'monospace',
      color: allDone ? '#f1c40f' : '#557799',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(51)
  }

  // ── SCROLL INDICATORS ─────────────────────────────────────────────────────

  _buildScrollIndicators() {
    this._arrowUp = this.add.text(W / 2, LIST_TOP - 14, '▲  scroll', {
      fontSize: '10px', fontFamily: 'monospace', color: '#556677',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(52).setAlpha(0)

    this._arrowDown = this.add.text(W / 2, LIST_TOP + VISIBLE * ROW_H + 16, '▼  scroll', {
      fontSize: '10px', fontFamily: 'monospace', color: '#556677',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(52).setAlpha(0)
  }

  // ── ROW RENDERING ─────────────────────────────────────────────────────────

  _renderRows() {
    // Destroy old rows
    for (const row of this._rowObjects) {
      row.icon.destroy()
      row.label.destroy()
      row.hint.destroy()
      row.tag?.destroy()
    }
    this._rowObjects = []

    const gs = this._gs
    const end = Math.min(this._scrollTop + VISIBLE, this._missions.length)

    for (let i = this._scrollTop; i < end; i++) {
      const m  = this._missions[i]
      const sy = LIST_TOP + (i - this._scrollTop) * ROW_H  // screen y

      const isActive = gs._activeMission === m.id
      const isDone   = m.done

      const iconText  = isDone ? '✓' : isActive ? '►' : '○'
      const iconColor = isDone ? '#44ff88' : isActive ? '#f1c40f' : '#556677'
      const icon = this.add.text(LIST_X, sy + ROW_H / 2, iconText, {
        fontSize: '16px', fontFamily: 'monospace',
        color: iconColor, stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(51)

      const labelColor = isDone ? '#778899' : isActive ? '#f1c40f' : '#dde4ee'
      const label = this.add.text(LIST_X + 28, sy + 8, m.label, {
        fontSize: '14px', fontFamily: 'monospace',
        color: labelColor, stroke: '#000000', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(51)

      const hint = this.add.text(LIST_X + 28, sy + 26, m.hint, {
        fontSize: '10px', fontFamily: 'monospace',
        color: isDone ? '#44aa66' : '#445566', stroke: '#000000', strokeThickness: 1,
      }).setScrollFactor(0).setDepth(51)

      let tag = null
      if (isDone) {
        tag = this.add.text(W - LIST_X, sy + ROW_H / 2, 'DONE', {
          fontSize: '10px', fontFamily: 'monospace', color: '#44ff88',
          backgroundColor: '#00330088', padding: { x: 6, y: 2 },
          stroke: '#000000', strokeThickness: 1,
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(51)
      }

      this._rowObjects.push({ icon, label, hint, tag })
    }

    // Update cursor rect
    const screenRow = this._cursor - this._scrollTop
    const cy = LIST_TOP + screenRow * ROW_H + ROW_H / 2
    this._cursorRect?.setPosition(W / 2, cy)

    // Scroll arrows
    this._arrowUp.setAlpha(this._scrollTop > 0 ? 0.7 : 0)
    this._arrowDown.setAlpha(this._scrollTop + VISIBLE < this._missions.length ? 0.7 : 0)
  }

  // ── CURSOR ────────────────────────────────────────────────────────────────

  _moveCursor(idx) {
    this._cursor = idx

    // Scroll window so cursor stays visible
    if (idx < this._scrollTop) {
      this._scrollTop = idx
    } else if (idx >= this._scrollTop + VISIBLE) {
      this._scrollTop = idx - VISIBLE + 1
    }

    this._renderRows()
  }

  _firstSelectableIndex() {
    const missions = Object.values(this.scene.get('GameScene')._missions)
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
      if (next !== this._cursor) { this._confirmQuit = false; this._moveCursor(next) }
    })

    const DOWN = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    DOWN.on('down', () => {
      const next = Math.min(this._missions.length - 1, this._cursor + 1)
      if (next !== this._cursor) { this._confirmQuit = false; this._moveCursor(next) }
    })

    const ENTER = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    ENTER.on('down', () => this._startSelected())

    const ESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    ESC.on('down', () => this.scene.stop())
  }

  _startSelected() {
    const gs = this._gs
    const m  = this._missions[this._cursor]

    if (m.done) {
      this._showFeedback('Already completed!')
      this._confirmQuit = false
      return
    }
    if (gs._activeMission && gs._activeMission !== m.id) {
      this._showFeedback('Finish your current mission first!')
      this._confirmQuit = false
      return
    }
    if (gs._activeMission === m.id) {
      if (this._confirmQuit) {
        gs._quitMission()
        this.scene.stop()
      } else {
        this._confirmQuit = true
        this._showFeedback('Press ENTER again to ABANDON this mission')
      }
      return
    }

    this._confirmQuit = false
    gs._startMission(m.id)
    this.scene.stop()
  }
}
