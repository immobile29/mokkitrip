import { Player } from '../objects/Player.js'
import { NPC } from '../objects/NPC.js'
import { TimeSystem } from '../systems/TimeSystem.js'
import { ActivitySystem } from '../systems/ActivitySystem.js'
import { DialogueSystem } from '../systems/DialogueSystem.js'
import { CHARACTER_LIST, CHARACTERS } from '../data/characters.js'
import { ACTIVITIES } from '../data/activities.js'

const MAP_W = 1600
const MAP_H = 1200

// Zone layout (x, y, w, h)
const ZONES = {
  cottage:      { x: 620, y: 180, w: 200, h: 160 },
  sauna:        { x: 160, y: 700, w: 140, h: 120 },
  dock:         { x: 1280, y: 800, w: 160, h: 100 },
  fire_pit:     { x: 720, y: 620, w: 130, h: 130 },
  molkky_field: { x: 980, y: 300, w: 220, h: 140 },
  beach:        { x: 300, y: 900, w: 400, h: 120 },
  forest:       { x: 60,  y: 200, w: 180, h: 300 },
}

const NPC_SPAWN = {
  jon:      { x: 750, y: 660 },
  alwar:    { x: 380, y: 940 },
  elliot:   { x: 680, y: 220 },
  schmaxel: { x: 1300, y: 830 },
  mark:     { x: 1310, y: 850 },
  edu:      { x: 420, y: 920 },
  robert:   { x: 1020, y: 360 },
  nixu:     { x: 700, y: 240 },
  nikkebre: { x: 210, y: 750 },
  juho:     { x: 1050, y: 330 },
  allu:     { x: 350, y: 950 },
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H)
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H)

    this._buildMap()

    this.player = new Player(this, 720, 400)
    this.cameras.main.startFollow(this.player.getPhysicsBody(), true, 0.1, 0.1)

    this.timeSystem = new TimeSystem(this)
    this.dialogueSystem = new DialogueSystem(this)
    this.dialogueSystem.create()

    this.activitySystem = new ActivitySystem(this, this.timeSystem)
    Object.entries(ZONES).forEach(([id, rect]) => this.activitySystem.registerZone(id, rect))

    this._buildNPCs()
    this._buildHUD()
    this._buildAmbientOverlay()
    this._setupInput()

    this.timeSystem.onPeriodChange((period, prev) => {
      this._onPeriodChange(period)
    })
  }

  _buildMap() {
    const g = this.add.graphics()

    // ground
    g.fillStyle(0x7dbb6b)
    g.fillRect(0, 0, MAP_W, MAP_H)

    // lake / water (bottom right half)
    g.fillStyle(0x2471a3)
    g.fillRect(750, 880, MAP_W - 750, MAP_H - 880)
    g.fillRect(0, 1020, MAP_W, MAP_H - 1020)

    // beach sand
    g.fillStyle(0xf0d090)
    g.fillRect(200, 930, 500, 90)
    g.fillRect(750, 860, 300, 60)

    // forest (dark green patch)
    g.fillStyle(0x1e6b3a)
    g.fillRect(0, 140, 280, 380)
    g.fillStyle(0x27ae60)
    for (let tx = 20; tx < 270; tx += 50) {
      for (let ty = 160; ty < 490; ty += 60) {
        g.fillCircle(tx + Math.sin(tx * ty) * 10, ty, 22)
      }
    }

    // paths
    g.fillStyle(0xc8a870)
    g.fillRect(700, 350, 36, 280)   // cottage → fire pit
    g.fillRect(400, 620, 330, 28)   // sauna → fire pit
    g.fillRect(730, 620, 270, 28)   // fire pit → dock path
    g.fillRect(950, 380, 28, 250)   // mölkky field → path

    // cottage
    g.fillStyle(0xc0392b)
    g.fillRect(ZONES.cottage.x, ZONES.cottage.y, ZONES.cottage.w, ZONES.cottage.h)
    g.fillStyle(0xe74c3c)
    g.fillRect(ZONES.cottage.x + 8, ZONES.cottage.y + 8, ZONES.cottage.w - 16, ZONES.cottage.h - 16)
    // roof
    g.fillStyle(0x6d4c41)
    g.fillTriangle(
      ZONES.cottage.x - 10, ZONES.cottage.y,
      ZONES.cottage.x + ZONES.cottage.w / 2, ZONES.cottage.y - 60,
      ZONES.cottage.x + ZONES.cottage.w + 10, ZONES.cottage.y
    )
    // door
    g.fillStyle(0x5d4e37)
    g.fillRect(ZONES.cottage.x + 85, ZONES.cottage.y + 100, 30, 60)
    // windows
    g.fillStyle(0x85c1e9)
    g.fillRect(ZONES.cottage.x + 20, ZONES.cottage.y + 30, 40, 35)
    g.fillRect(ZONES.cottage.x + 140, ZONES.cottage.y + 30, 40, 35)
    // label
    this.add.text(ZONES.cottage.x + 100, ZONES.cottage.y - 14, 'MÖKKI', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5)

    // sauna
    g.fillStyle(0x8b5e3c)
    g.fillRect(ZONES.sauna.x, ZONES.sauna.y, ZONES.sauna.w, ZONES.sauna.h)
    g.fillStyle(0x7b4f2c)
    g.fillRect(ZONES.sauna.x + 6, ZONES.sauna.y + 6, ZONES.sauna.w - 12, ZONES.sauna.h - 12)
    // chimney smoke
    g.fillStyle(0x95a5a6)
    g.fillCircle(ZONES.sauna.x + 110, ZONES.sauna.y - 20, 10)
    g.fillCircle(ZONES.sauna.x + 118, ZONES.sauna.y - 34, 8)
    g.fillCircle(ZONES.sauna.x + 112, ZONES.sauna.y - 46, 6)
    this.add.text(ZONES.sauna.x + 70, ZONES.sauna.y - 12, 'SAUNA 🧖', {
      fontSize: '12px', color: '#f0c080', fontStyle: 'bold'
    }).setOrigin(0.5)

    // dock
    g.fillStyle(0x6d4c41)
    g.fillRect(ZONES.dock.x, ZONES.dock.y, ZONES.dock.w, ZONES.dock.h)
    // dock planks
    g.lineStyle(2, 0x5d4e37, 0.6)
    for (let dy = ZONES.dock.y + 20; dy < ZONES.dock.y + ZONES.dock.h; dy += 20) {
      g.lineBetween(ZONES.dock.x, dy, ZONES.dock.x + ZONES.dock.w, dy)
    }
    this.add.text(ZONES.dock.x + 80, ZONES.dock.y - 12, 'LAITURI 🛶', {
      fontSize: '12px', color: '#85c1e9', fontStyle: 'bold'
    }).setOrigin(0.5)

    // fire pit
    g.fillStyle(0x7f8c8d)
    g.fillCircle(ZONES.fire_pit.x + 65, ZONES.fire_pit.y + 65, 50)
    g.fillStyle(0xc0392b)
    g.fillCircle(ZONES.fire_pit.x + 65, ZONES.fire_pit.y + 65, 22)
    g.fillStyle(0xe67e22)
    g.fillCircle(ZONES.fire_pit.x + 65, ZONES.fire_pit.y + 65, 14)
    g.fillStyle(0xf1c40f)
    g.fillCircle(ZONES.fire_pit.x + 65, ZONES.fire_pit.y + 65, 8)
    this.add.text(ZONES.fire_pit.x + 65, ZONES.fire_pit.y - 12, 'NUOTIO 🔥', {
      fontSize: '12px', color: '#f39c12', fontStyle: 'bold'
    }).setOrigin(0.5)

    // mölkky field
    g.fillStyle(0xd5b896)
    g.fillRect(ZONES.molkky_field.x, ZONES.molkky_field.y, ZONES.molkky_field.w, ZONES.molkky_field.h)
    // mölkky pins (small circles)
    const pinPositions = [[1000,340],[1020,360],[1040,340],[1060,360],[1080,340],[1100,360]]
    g.fillStyle(0xc8a870)
    pinPositions.forEach(([px, py]) => g.fillRect(px - 4, py - 14, 8, 28))
    this.add.text(ZONES.molkky_field.x + 110, ZONES.molkky_field.y - 12, 'MÖLKKY 🪵', {
      fontSize: '12px', color: '#f0c080', fontStyle: 'bold'
    }).setOrigin(0.5)

    // trees scattered
    const treeSpots = [
      [350,150],[450,100],[550,130],[850,140],[950,170],[1100,100],
      [1300,180],[1450,120],[1500,300],[1540,500],[60,600],[80,800]
    ]
    treeSpots.forEach(([tx, ty]) => this._drawTree(g, tx, ty))

    // zone highlight borders (subtle)
    g.lineStyle(2, 0xffffff, 0.15)
    Object.values(ZONES).forEach(z => g.strokeRect(z.x, z.y, z.w, z.h))
  }

  _drawTree(g, x, y) {
    g.fillStyle(0x5d4e37)
    g.fillRect(x - 5, y, 10, 24)
    g.fillStyle(0x1e6b3a)
    g.fillTriangle(x, y - 40, x - 20, y + 8, x + 20, y + 8)
    g.fillTriangle(x, y - 60, x - 14, y - 20, x + 14, y - 20)
  }

  _buildNPCs() {
    this.npcs = CHARACTER_LIST.map(char => {
      const pos = NPC_SPAWN[char.id] ?? { x: 700, y: 400 }
      return new NPC(this, pos.x, pos.y, char)
    })
  }

  _buildHUD() {
    const { width } = this.scale

    // time bar
    this._hudBg = this.add.rectangle(width / 2, 22, 300, 36, 0x1a1a2e, 0.82)
      .setScrollFactor(0).setDepth(15).setStrokeStyle(1, 0x34495e)

    this._timeText = this.add.text(width / 2, 22, '', {
      fontSize: '15px', color: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(16)

    // activity prompt
    this._promptText = this.add.text(width / 2, 80, '', {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#00000099',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(16).setVisible(false)

    this.activitySystem.setPromptText(this._promptText)

    // drunk/high meter (shows only when > 0)
    this._statusText = this.add.text(16, 50, '', {
      fontSize: '13px', color: '#e74c3c',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(16).setVisible(false)
  }

  _buildAmbientOverlay() {
    const { width, height } = this.scale
    this._overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000020, 0)
      .setScrollFactor(0).setDepth(10)
  }

  _setupInput() {
    this._eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this._eKey.on('down', () => this._onInteract())
  }

  _onInteract() {
    // dialogue takes priority
    if (this.dialogueSystem.isOpen) {
      this.dialogueSystem.tryInteract()
      return
    }

    // check NPCs first
    for (const npc of this.npcs) {
      if (npc.isNearPlayer(this.player.x, this.player.y)) {
        this.dialogueSystem.open(npc.data, this.timeSystem.currentPeriod)
        return
      }
    }

    // then activity zones
    this.activitySystem.tryActivate()
  }

  _onPeriodChange(period) {
    const alpha = this.timeSystem.getAmbientAlpha()
    this.tweens.add({
      targets: this._overlay,
      alpha,
      duration: 2000,
    })
  }

  update(time, delta) {
    if (!this.dialogueSystem.isOpen) {
      this.player.update()
    }

    this.timeSystem.update(delta)
    this.activitySystem.update(this.player.x, this.player.y)
    this.dialogueSystem.update(delta)

    this.npcs.forEach(npc => {
      npc.update(time, this.player.x, this.player.y, this.dialogueSystem)
    })

    // HUD updates
    this._timeText.setText(
      `🕐 ${this.timeSystem.getDisplayTime()}  •  ${this.timeSystem.getPeriodLabel()}`
    )

    const drunk = this.player.drunkLevel
    const high = this.player.highLevel
    if (drunk > 0 || high > 0) {
      const parts = []
      if (drunk > 0) parts.push(`🍺 ${'█'.repeat(drunk)}`)
      if (high > 0) parts.push(`🌿 ${'█'.repeat(high)}`)
      this._statusText.setText(parts.join('  ')).setVisible(true)
    } else {
      this._statusText.setVisible(false)
    }

    // camera wobble when drunk
    if (drunk > 5) {
      const wobble = Math.sin(time / 180) * (drunk - 4)
      this.cameras.main.setAngle(wobble)
    } else {
      this.cameras.main.setAngle(0)
    }
  }
}
