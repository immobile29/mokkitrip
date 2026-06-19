import { Player } from '../objects/Player.js'

const ROOMS = {
  cottage_living: {
    w: 440, h: 320, T: 24, dgW: 48,
    label: '🏠  Cottage — Living Room',
    entryX: 220, entryY: 280,
    returnTo: 'GameScene',
    returnX: 240, returnY: 592,
    internalDoors: [
      { x: 198, y: 0, w: 44, h: 24, targetRoom: 'cottage_bedroom', label: 'Bedroom ↑' },
    ],
  },
  cottage_bedroom: {
    w: 340, h: 260, T: 20, dgW: 44,
    label: '🛏️  Bedroom',
    entryX: 170, entryY: 224,
    returnTo: 'cottage_living',
    returnX: 220, returnY: 52,
  },
  sauna_lobby: {
    w: 340, h: 220, T: 20, dgW: 44,
    label: '🚿  Pukuhuone',
    entryX: 170, entryY: 192,
    returnTo: 'GameScene',
    returnX: 1189, returnY: 462,
    internalDoors: [
      { x: 148, y: 0, w: 44, h: 20, targetRoom: 'sauna', label: 'Sauna ↑' },
    ],
  },
  sauna: {
    w: 380, h: 280, T: 24, dgW: 48,
    label: '🧖  Sauna',
    entryX: 190, entryY: 244,
    returnTo: 'sauna_lobby',
    returnX: 170, returnY: 70,
  },
  rape_shack: {
    w: 260, h: 220, T: 20, dgW: 44,
    label: '🛏️  Rape Shack',
    entryX: 130, entryY: 188,
    returnTo: 'GameScene',
    returnX: 882, returnY: 174,
  },
  huussi: {
    w: 200, h: 180, T: 20, dgW: 40,
    label: '🚽  Huussi',
    entryX: 100, entryY: 150,
    returnTo: 'GameScene',
    returnX: 71, returnY: 740,
  },
}

export class RoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RoomScene' })
  }

  init(data) {
    this._roomId = data.roomId
    this._exiting = false
    this._entryOverrideX = (data.entryOverrideX !== undefined) ? data.entryOverrideX : null
    this._entryOverrideY = (data.entryOverrideY !== undefined) ? data.entryOverrideY : null
  }

  create() {
    const def = ROOMS[this._roomId]
    const vw = this.scale.width
    const vh = this.scale.height
    const ox = Math.floor((vw - def.w) / 2)
    const oy = Math.floor((vh - def.h) / 2)
    this._ox = ox
    this._oy = oy
    this._def = def

    this.physics.world.setBounds(ox, oy, def.w, def.h)
    this.add.rectangle(vw / 2, vh / 2, vw, vh, 0x050508)

    const g = this.add.graphics()
    this._drawRoom(g, def, ox, oy)

    const spawnLocalX = this._entryOverrideX !== null ? this._entryOverrideX : def.entryX
    const spawnLocalY = this._entryOverrideY !== null ? this._entryOverrideY : def.entryY
    this._player = new Player(this, ox + spawnLocalX, oy + spawnLocalY)
    this._player._body.body.setCollideWorldBounds(true)

    this._buildRoomColliders(def, ox, oy)

    if (this._roomId === 'sauna') this._addSteam(def, ox, oy)

    this.add.text(vw / 2, oy - 28, def.label, {
      fontSize: '17px', color: '#f1c40f', fontStyle: 'bold',
      stroke: '#1a0800', strokeThickness: 5,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
      backgroundColor: '#00000066',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10)

    const exitLabel = def.returnTo === 'GameScene' ? '↓  Walk south to exit' : '↓  Walk south to go back'
    this._exitPrompt = this.add.text(vw / 2, oy + def.h + 18, exitLabel, {
      fontSize: '12px', color: '#cccccc',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10).setVisible(false)

    this._internalDoorPrompts = []
    if (def.internalDoors) {
      def.internalDoors.forEach(door => {
        const dCenterX = ox + door.x + door.w / 2
        const prompt = this.add.text(dCenterX, oy - 10, `↑  ${door.label}`, {
          fontSize: '11px', color: '#f1c40f', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10).setVisible(false)
        this._internalDoorPrompts.push({ prompt, door })
      })
    }

    // Prevent re-triggering north door immediately when spawning near it
    this._internalDoorReady = false
    this.time.delayedCall(500, () => { this._internalDoorReady = true })

    // Never Have I Ever prompt — only shown in cottage_living at night/late night
    this._neverPrompt = null
    if (this._roomId === 'cottage_living') {
      this._neverPrompt = this.add.text(vw / 2, oy + def.h - 52, '[E] Play Never Have I Ever', {
        fontSize: '14px', color: '#f0e8c8',
        backgroundColor: '#00000099',
        padding: { x: 14, y: 8 },
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10).setVisible(false)
    }

    this._eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this._escKey.on('down', () => this._exit())

    // When waking from a minigame launched inside the room (e.g. NeverScene),
    // reset exiting flag and fade back in so the room is usable again.
    this.events.on('wake', () => {
      this._exiting = false
      this.cameras.main.fadeIn(300, 0, 0, 0)
    })

    this.cameras.main.fadeIn(220, 0, 0, 0)
  }

  _buildRoomColliders(def, ox, oy) {
    const { w, h, T, dgW } = def
    const dgX = Math.floor((w - dgW) / 2)
    const walls = []

    const addWall = (lx, ly, lw, lh) => {
      const r = this.add.rectangle(ox + lx + lw / 2, oy + ly + lh / 2, lw, lh, 0, 0)
      this.physics.add.existing(r, true)
      walls.push(r)
    }

    const northDoor = def.internalDoors?.find(d => d.y === 0)
    if (northDoor) {
      if (northDoor.x > 0) addWall(0, 0, northDoor.x, T)
      const rs = northDoor.x + northDoor.w
      if (rs < w) addWall(rs, 0, w - rs, T)
    } else {
      addWall(0, 0, w, T)
    }

    addWall(0, 0, T, h)
    addWall(w - T, 0, T, h)
    addWall(0, h - T, dgX, T)
    addWall(dgX + dgW, h - T, w - dgX - dgW, T)

    this.physics.add.collider(this._player.getPhysicsBody(), walls)
    this._walls = walls
  }

  _addSteam(def, ox, oy) {
    for (let i = 0; i < 6; i++) {
      const sx = ox + def.T + 60 + Math.random() * 80
      const sy = oy + def.h - def.T - 60 - i * 18
      const s = this.add.graphics().setDepth(5)
      s.fillStyle(0xffffff, 0.35)
      s.fillCircle(0, 0, 5 + Math.random() * 4)
      s.x = sx; s.y = sy
      this.tweens.add({
        targets: s, y: s.y - 40, alpha: { from: 0.3, to: 0 },
        x: s.x + (Math.random() > 0.5 ? 8 : -8),
        duration: 1800 + i * 200, delay: i * 300, repeat: -1, ease: 'Sine.easeOut',
        onRepeat: (_, t) => { t.y = sy; t.alpha = 0.3; t.x = sx },
      })
    }
  }

  // ── ROOM DRAWING ──────────────────────────────────────────────────────────

  _drawRoom(g, def, ox, oy) {
    switch (this._roomId) {
      case 'cottage_living':  this._drawCottage(g, def, ox, oy);    break
      case 'cottage_bedroom': this._drawBedroom(g, def, ox, oy);    break
      case 'sauna_lobby':     this._drawSaunaLobby(g, def, ox, oy); break
      case 'sauna':           this._drawSauna(g, def, ox, oy);      break
      case 'rape_shack':      this._drawShack(g, def, ox, oy);      break
      case 'huussi':          this._drawHuussi(g, def, ox, oy);     break
    }
  }

  _drawCottage(g, def, ox, oy) {
    const { w, h, T, dgW } = def
    const dgX = Math.floor((w - dgW) / 2)
    const px = (lx) => ox + lx
    const py = (ly) => oy + ly
    const bd = def.internalDoors[0]  // bedroom door: x=280, w=44

    // Floor planks
    for (let fy = T; fy < h - T; fy += 20) {
      g.fillStyle(Math.floor(fy / 20) & 1 ? 0xc89040 : 0xd4a850)
      g.fillRect(px(T), py(fy), w - T * 2, 20)
    }
    g.lineStyle(1, 0xa07030, 0.3)
    for (let fy = T + 20; fy < h - T; fy += 20) g.lineBetween(px(T), py(fy), px(w - T), py(fy))
    g.lineStyle(0, 0, 0)

    // Rug
    g.fillStyle(0x8a2020, 0.5)
    g.fillEllipse(px(w / 2), py(h / 2 + 10), 170, 100)

    // Walls — north split for bedroom door
    g.fillStyle(0xf0e898)
    g.fillRect(px(0), py(0), bd.x, T)
    g.fillRect(px(bd.x + bd.w), py(0), w - bd.x - bd.w, T)
    g.fillRect(px(0), py(0), T, h)
    g.fillRect(px(w - T), py(0), T, h)
    g.fillRect(px(0), py(h - T), dgX, T)
    g.fillRect(px(dgX + dgW), py(h - T), w - dgX - dgW, T)
    // Roof trim (split)
    g.fillStyle(0xb82018)
    g.fillRect(px(0), py(0), bd.x, 6)
    g.fillRect(px(bd.x + bd.w), py(0), w - bd.x - bd.w, 6)

    // Bedroom door frame + arrow
    g.fillStyle(0x5a2810)
    g.fillRect(px(bd.x - 4), py(0), 4, T + 4)
    g.fillRect(px(bd.x + bd.w), py(0), 4, T + 4)
    g.fillStyle(0xf1c40f, 0.7)
    g.fillTriangle(px(bd.x + bd.w / 2), py(-1), px(bd.x + bd.w / 2 - 10), py(12), px(bd.x + bd.w / 2 + 10), py(12))

    // Sofa (left side, ends before centered bedroom door at x=198)
    g.fillStyle(0x1a1a1a)
    g.fillRoundedRect(px(T + 4), py(T + 2), 166, 36, 5)
    g.fillStyle(0x2a6a2a)
    g.fillRoundedRect(px(T + 6), py(T + 2), 162, 34, 5)
    g.fillStyle(0x1a5020)
    g.fillRect(px(T + 6), py(T + 2), 162, 10)
    g.fillStyle(0x1a5020)
    g.fillRect(px(T + 6), py(T + 2), 14, 34)
    g.fillRect(px(T + 154), py(T + 2), 14, 34)
    // Side table right of bedroom door
    g.fillStyle(0x1a1a1a)
    g.fillRoundedRect(px(248), py(T + 4), 54, 28, 3)
    g.fillStyle(0x7a4820)
    g.fillRoundedRect(px(250), py(T + 6), 50, 24, 3)
    g.fillStyle(0xf1c40f, 0.7)
    g.fillCircle(px(275), py(T + 10), 5)

    // Dining table
    g.fillStyle(0x000000, 0.18)
    g.fillRect(px(160), py(128), 122, 72)
    g.fillStyle(0x7a4820)
    g.fillRect(px(158), py(126), 122, 70)
    g.fillStyle(0x9a6030)
    g.fillRect(px(162), py(130), 114, 62)
    ;[[142,138],[142,166],[272,138],[272,166]].forEach(([cx, cy]) => {
      g.fillStyle(0x1a1a1a)
      g.fillRoundedRect(px(cx - 1), py(cy - 1), 22, 22, 3)
      g.fillStyle(0x5a3010)
      g.fillRoundedRect(px(cx), py(cy), 20, 20, 3)
    })

    // Fireplace (NW corner)
    g.fillStyle(0x222222)
    g.fillRect(px(T + 4), py(96), 66, 84)
    g.fillStyle(0x554444)
    g.fillRect(px(T + 6), py(98), 62, 80)
    g.fillStyle(0xd02010)
    g.fillRect(px(T + 12), py(138), 50, 36)
    const fire1 = this.add.graphics().setDepth(4)
    fire1.fillStyle(0xe06010, 1); fire1.fillRect(-19, -13, 38, 26)
    fire1.x = px(T + 18) + 19; fire1.y = py(144) + 13
    this.tweens.add({ targets: fire1, scaleX: { from: 0.88, to: 1.12 }, scaleY: { from: 0.9, to: 1.1 }, alpha: { from: 0.72, to: 1.0 }, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' })
    const fire2 = this.add.graphics().setDepth(4)
    fire2.fillStyle(0xffe030, 1); fire2.fillCircle(0, 0, 9)
    fire2.x = px(T + 37); fire2.y = py(152)
    this.tweens.add({ targets: fire2, scaleX: { from: 0.7, to: 1.3 }, scaleY: { from: 0.7, to: 1.3 }, alpha: { from: 0.45, to: 1.0 }, yoyo: true, repeat: -1, duration: 500, delay: 110, ease: 'Sine.easeInOut' })
    g.fillStyle(0x8a5020)
    g.fillRect(px(T + 2), py(94), 70, 10)

    // Kitchen counter (E wall)
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(w - T - 40), py(76), 40, 148)
    g.fillStyle(0x888888)
    g.fillRect(px(w - T - 38), py(78), 36, 144)
    g.fillStyle(0xaaaaaa)
    g.fillRect(px(w - T - 36), py(80), 32, 140)
    g.fillStyle(0x777777)
    g.fillRect(px(w - T - 32), py(88), 24, 18)
    g.fillStyle(0x9999aa)
    g.fillRect(px(w - T - 30), py(90), 20, 14)

    // Windows (N wall — left and right of centered bedroom door)
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(56), py(0), 58, T)
    g.fillStyle(0x7ac8f0)
    g.fillRect(px(58), py(2), 54, T - 4)
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(83), py(2), 2, T - 4)
    g.fillStyle(0xffffff, 0.45)
    g.fillRect(px(59), py(3), 10, 5)
    // Right window (possible now that bedroom door moved to center)
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(w - 116), py(0), 58, T)
    g.fillStyle(0x7ac8f0)
    g.fillRect(px(w - 114), py(2), 54, T - 4)
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(w - 89), py(2), 2, T - 4)
    g.fillStyle(0xffffff, 0.45)
    g.fillRect(px(w - 113), py(3), 10, 5)

    // South door frame + exit arrow
    g.fillStyle(0x5a2810)
    g.fillRect(px(dgX - 4), py(h - T - 4), 4, T + 4)
    g.fillRect(px(dgX + dgW), py(h - T - 4), 4, T + 4)
    g.fillStyle(0xf1c40f, 0.6)
    g.fillTriangle(px(w / 2), py(h - 1), px(w / 2 - 10), py(h - 13), px(w / 2 + 10), py(h - 13))
  }

  _drawBedroom(g, def, ox, oy) {
    const { w, h, T, dgW } = def
    const dgX = Math.floor((w - dgW) / 2)
    const px = (lx) => ox + lx
    const py = (ly) => oy + ly

    // Carpet floor
    for (let fy = T; fy < h - T; fy += 18) {
      g.fillStyle(Math.floor(fy / 18) & 1 ? 0xd0b890 : 0xc8ae82)
      g.fillRect(px(T), py(fy), w - T * 2, 18)
    }
    g.fillStyle(0x7a4060, 0.35)
    g.fillEllipse(px(w / 2), py(h / 2 + 10), 160, 90)

    // Walls
    g.fillStyle(0xe8ddb8)
    g.fillRect(px(0), py(0), w, T)
    g.fillRect(px(0), py(0), T, h)
    g.fillRect(px(w - T), py(0), T, h)
    g.fillRect(px(0), py(h - T), dgX, T)
    g.fillRect(px(dgX + dgW), py(h - T), w - dgX - dgW, T)
    g.fillStyle(0x9a6828)
    g.fillRect(px(0), py(0), w, 5)

    // Double bed (center-north)
    const bedX = Math.floor((w - 160) / 2)
    const bedY = T + 12
    g.fillStyle(0x1a1a1a)
    g.fillRoundedRect(px(bedX - 2), py(bedY - 2), 164, 106, 4)
    g.fillStyle(0x5a3018)
    g.fillRoundedRect(px(bedX), py(bedY), 160, 14, 3)
    g.fillStyle(0xf8f4e8)
    g.fillRect(px(bedX), py(bedY + 14), 160, 88)
    g.fillStyle(0xeeeadf)
    g.fillRect(px(bedX + 4), py(bedY + 18), 152, 80)
    g.fillStyle(0xffffff)
    g.fillRoundedRect(px(bedX + 10), py(bedY + 16), 58, 24, 6)
    g.fillRoundedRect(px(bedX + 92), py(bedY + 16), 58, 24, 6)
    g.fillStyle(0xeeeeee)
    g.fillRoundedRect(px(bedX + 13), py(bedY + 18), 52, 20, 5)
    g.fillRoundedRect(px(bedX + 95), py(bedY + 18), 52, 20, 5)

    // Nightstand + lamp (east of bed)
    const nsX = bedX + 168, nsY = bedY + 20
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(nsX - 1), py(nsY - 1), 42, 42)
    g.fillStyle(0x7a4820)
    g.fillRect(px(nsX), py(nsY), 40, 40)
    g.fillStyle(0x888888)
    g.fillRect(px(nsX + 16), py(nsY - 14), 8, 18)
    g.fillStyle(0xf0c060)
    g.fillEllipse(px(nsX + 20), py(nsY - 16), 28, 14)
    g.fillStyle(0xf8c040, 0.18)
    g.fillCircle(px(nsX + 20), py(nsY), 24)

    // Wardrobe (west wall)
    const wdX = T + 6, wdY = T + 20
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(wdX - 2), py(wdY - 2), 64, 112)
    g.fillStyle(0x3a2010)
    g.fillRect(px(wdX), py(wdY), 60, 108)
    g.fillStyle(0x4a2818)
    g.fillRect(px(wdX + 2), py(wdY + 2), 56, 104)
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(wdX + 28), py(wdY), 4, 108)
    g.fillStyle(0xaaaaaa)
    g.fillCircle(px(wdX + 24), py(wdY + 52), 3)
    g.fillCircle(px(wdX + 36), py(wdY + 52), 3)

    // Window (east wall)
    const winY = T + 60
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(w - T), py(winY), T, 52)
    g.fillStyle(0x7ac8f0)
    g.fillRect(px(w - T + 2), py(winY + 2), T - 4, 48)
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(w - T + 2), py(winY + 24), T - 4, 2)
    g.fillStyle(0xffffff, 0.45)
    g.fillRect(px(w - T + 3), py(winY + 3), 6, 8)

    // South door frame + exit arrow
    g.fillStyle(0x5a2810)
    g.fillRect(px(dgX - 4), py(h - T - 4), 4, T + 4)
    g.fillRect(px(dgX + dgW), py(h - T - 4), 4, T + 4)
    g.fillStyle(0xf1c40f, 0.6)
    g.fillTriangle(px(w / 2), py(h - 1), px(w / 2 - 10), py(h - 13), px(w / 2 + 10), py(h - 13))
  }

  _drawSaunaLobby(g, def, ox, oy) {
    const { w, h, T, dgW } = def
    const dgX = Math.floor((w - dgW) / 2)
    const px = (lx) => ox + lx
    const py = (ly) => oy + ly
    const sd = def.internalDoors[0]  // sauna door: x=148, w=44

    // Warm wood floor
    for (let fy = T; fy < h - T; fy += 16) {
      g.fillStyle(Math.floor(fy / 16) & 1 ? 0xa06828 : 0xb07830)
      g.fillRect(px(T), py(fy), w - T * 2, 16)
    }
    g.lineStyle(1, 0x7a4a1a, 0.3)
    for (let fy = T + 16; fy < h - T; fy += 16) g.lineBetween(px(T), py(fy), px(w - T), py(fy))
    g.lineStyle(0, 0, 0)

    // Walls (cedar tone), north split for sauna door
    g.fillStyle(0xc88840)
    g.fillRect(px(0), py(0), sd.x, T)
    g.fillRect(px(sd.x + sd.w), py(0), w - sd.x - sd.w, T)
    g.fillRect(px(0), py(0), T, h)
    g.fillRect(px(w - T), py(0), T, h)
    g.fillRect(px(0), py(h - T), dgX, T)
    g.fillRect(px(dgX + dgW), py(h - T), w - dgX - dgW, T)
    g.lineStyle(1, 0xa06820, 0.35)
    for (let wy = T + 8; wy < h - T; wy += 8) g.lineBetween(px(T), py(wy), px(w - T), py(wy))
    g.lineStyle(0, 0, 0)

    // Sauna door frame + arrow
    g.fillStyle(0x3a1808)
    g.fillRect(px(sd.x - 4), py(0), 4, T + 4)
    g.fillRect(px(sd.x + sd.w), py(0), 4, T + 4)
    g.fillStyle(0xf1c40f, 0.7)
    g.fillTriangle(px(sd.x + sd.w / 2), py(-1), px(sd.x + sd.w / 2 - 10), py(12), px(sd.x + sd.w / 2 + 10), py(12))

    // Bench along east wall
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(w - T - 30), py(T + 4), 30, h - T * 2 - 8)
    g.fillStyle(0xa06020)
    g.fillRect(px(w - T - 28), py(T + 6), 26, h - T * 2 - 12)
    g.fillStyle(0xb87030)
    g.fillRect(px(w - T - 26), py(T + 8), 22, h - T * 2 - 16)
    g.lineStyle(1, 0x886018, 0.4)
    for (let bl = T + 24; bl < h - T; bl += 20) g.lineBetween(px(w - T - 26), py(bl), px(w - T - 4), py(bl))
    g.lineStyle(0, 0, 0)

    // Clothes hooks on west wall
    ;[T + 36, T + 64, T + 92, T + 120].forEach(hy => {
      g.fillStyle(0x888888)
      g.fillRect(px(T), py(hy), 10, 4)
      g.fillCircle(px(T + 10), py(hy + 2), 4)
      g.fillStyle(0x555555)
      g.fillCircle(px(T + 10), py(hy + 2), 2)
    })

    // Birch twig bundle (near bench)
    const bx = T + 28, by = T + 56
    g.fillStyle(0xd4c870)
    g.fillEllipse(px(bx), py(by), 24, 40)
    g.fillStyle(0xc8b850)
    g.fillEllipse(px(bx + 6), py(by - 4), 16, 32)
    g.lineStyle(2, 0xa09040, 0.8)
    ;[[-4,14,-2,24],[0,16,0,24],[4,14,2,24]].forEach(([x1,y1,x2,y2]) => g.lineBetween(px(bx+x1), py(by+y1), px(bx+x2), py(by+y2)))
    g.lineStyle(0, 0, 0)

    // Thermometer (north wall, west side)
    g.fillStyle(0xf0f0f0)
    g.fillRect(px(58), py(4), 6, 16)
    g.fillStyle(0xcc2020)
    g.fillRect(px(59), py(8), 4, 10)
    g.fillCircle(px(61), py(18), 5)
    g.lineStyle(1, 0x888888, 0.8)
    ;[0,4,8].forEach(tl => g.lineBetween(px(64), py(8+tl), px(67), py(8+tl)))
    g.lineStyle(0, 0, 0)

    // South door frame + exit arrow
    g.fillStyle(0x3a1808)
    g.fillRect(px(dgX - 4), py(h - T - 4), 4, T + 4)
    g.fillRect(px(dgX + dgW), py(h - T - 4), 4, T + 4)
    g.fillStyle(0xf1c40f, 0.6)
    g.fillTriangle(px(w / 2), py(h - 1), px(w / 2 - 10), py(h - 13), px(w / 2 + 10), py(h - 13))
  }

  _drawSauna(g, def, ox, oy) {
    const { w, h, T, dgW } = def
    const dgX = Math.floor((w - dgW) / 2)
    const px = (lx) => ox + lx
    const py = (ly) => oy + ly

    for (let fy = T; fy < h - T; fy += 18) {
      g.fillStyle(Math.floor(fy / 18) & 1 ? 0x1e0e06 : 0x160a04)
      g.fillRect(px(T), py(fy), w - T * 2, 18)
    }

    g.fillStyle(0x2a1808)
    g.fillRect(px(0), py(0), w, T)
    g.fillRect(px(0), py(0), T, h)
    g.fillRect(px(w - T), py(0), T, h)
    g.fillRect(px(0), py(h - T), dgX, T)
    g.fillRect(px(dgX + dgW), py(h - T), w - dgX - dgW, T)

    g.lineStyle(1, 0x1a0c04, 0.5)
    for (let wy = T + 5; wy < h - T; wy += 10) g.lineBetween(px(T + 2), py(wy), px(w - T - 2), py(wy))
    g.lineStyle(0, 0, 0)

    g.fillStyle(0x7a4820)
    g.fillRect(px(T + 2), py(T + 2), w - T * 2 - 4, 32)
    g.fillStyle(0x9a6030)
    g.fillRect(px(T + 4), py(T + 4), w - T * 2 - 8, 28)
    g.fillStyle(0x7a4820)
    g.fillRect(px(T + 2), py(T + 34), w - T * 2 - 4, 24)
    g.fillStyle(0x9a6030)
    g.fillRect(px(T + 4), py(T + 36), w - T * 2 - 8, 20)
    g.lineStyle(1, 0x6a3810, 0.4)
    for (let bx = T + 28; bx < w - T; bx += 24) g.lineBetween(px(bx), py(T + 4), px(bx), py(T + 56))
    g.lineStyle(0, 0, 0)

    ;[[T + 2, T + 60, 26, h - T * 2 - 90], [w - T - 28, T + 60, 26, h - T * 2 - 90]].forEach(([bx, by, bw, bh]) => {
      g.fillStyle(0x7a4820)
      g.fillRect(px(bx), py(by), bw, bh)
      g.fillStyle(0x9a6030)
      g.fillRect(px(bx + 2), py(by + 2), bw - 4, bh - 4)
    })

    const kx = T + 8, ky = h - T - 78
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(kx), py(ky), 62, 64)
    g.fillStyle(0x2e2e2e)
    g.fillRect(px(kx + 2), py(ky + 2), 58, 60)
    g.fillStyle(0x555555)
    g.fillRect(px(kx + 4), py(ky + 4), 54, 20)
    ;[[8,6],[20,6],[32,6],[44,6],[14,13],[26,13],[38,13]].forEach(([sx, sy]) => {
      g.fillStyle(0x686868)
      g.fillCircle(px(kx + sx + 4), py(ky + sy + 4), 5)
    })
    g.fillStyle(0xe03000, 0.72)
    g.fillRect(px(kx + 12), py(ky + 30), 38, 24)
    const ember1 = this.add.graphics().setDepth(4)
    ember1.fillStyle(0xff6000, 1); ember1.fillRect(-13, -7, 26, 14)
    ember1.x = px(kx + 18) + 13; ember1.y = py(ky + 35) + 7; ember1.alpha = 0.5
    this.tweens.add({ targets: ember1, alpha: { from: 0.3, to: 0.78 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' })
    const ember2 = this.add.graphics().setDepth(4)
    ember2.fillStyle(0xffe000, 1); ember2.fillCircle(0, 0, 7)
    ember2.x = px(kx + 31); ember2.y = py(ky + 40); ember2.alpha = 0.3
    this.tweens.add({ targets: ember2, scaleX: { from: 0.8, to: 1.35 }, scaleY: { from: 0.8, to: 1.35 }, alpha: { from: 0.2, to: 0.58 }, yoyo: true, repeat: -1, duration: 650, delay: 200, ease: 'Sine.easeInOut' })
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(kx + 10), py(ky + 26), 42, 32)
    g.fillStyle(0x888888)
    g.fillRect(px(kx + 14), py(ky + 30), 10, 8)

    const bkx = kx + 70, bky = ky + 30
    g.fillStyle(0x1a1a1a)
    g.fillCircle(px(bkx), py(bky), 14)
    g.fillStyle(0x4488cc)
    g.fillCircle(px(bkx), py(bky), 12)
    g.fillStyle(0x66aaee)
    g.fillCircle(px(bkx - 3), py(bky - 3), 6)
    g.lineStyle(2, 0x8a5020, 1)
    g.lineBetween(px(bkx), py(bky - 12), px(bkx + 22), py(bky - 28))
    g.lineStyle(0, 0, 0)

    g.fillStyle(0xc84000, 0.07)
    g.fillRect(px(T), py(T), w - T * 2, h - T * 2)

    g.fillStyle(0xf1c40f, 0.6)
    g.fillTriangle(px(w / 2), py(h - 1), px(w / 2 - 10), py(h - 13), px(w / 2 + 10), py(h - 13))
  }

  _drawShack(g, def, ox, oy) {
    const { w, h, T, dgW } = def
    const dgX = Math.floor((w - dgW) / 2)
    const px = (lx) => ox + lx
    const py = (ly) => oy + ly

    // Dark, oppressive floor planks
    for (let fy = T; fy < h - T; fy += 16) {
      g.fillStyle(Math.floor(fy / 16) & 1 ? 0x1e0e06 : 0x160c04)
      g.fillRect(px(T), py(fy), w - T * 2, 16)
    }
    // Plank grain lines
    g.lineStyle(1, 0x0a0604, 0.5)
    for (let fy = T + 16; fy < h - T; fy += 16) g.lineBetween(px(T), py(fy), px(w - T), py(fy))
    g.lineStyle(0, 0, 0)

    // Blood splatter on floor
    g.fillStyle(0x660000, 0.55)
    g.fillEllipse(px(T + 80), py(h - T - 60), 48, 22)
    g.fillStyle(0x880000, 0.4)
    g.fillEllipse(px(T + 52), py(h - T - 80), 18, 10)
    g.fillEllipse(px(T + 100), py(h - T - 38), 12, 8)
    g.fillStyle(0x440000, 0.7)
    g.fillCircle(px(T + 68), py(h - T - 90), 5)
    g.fillCircle(px(T + 76), py(h - T - 100), 3)

    // Walls (very dark)
    g.fillStyle(0x180808)
    g.fillRect(px(0), py(0), w, T)
    g.fillRect(px(0), py(0), T, h)
    g.fillRect(px(w - T), py(0), T, h)
    g.fillRect(px(0), py(h - T), dgX, T)
    g.fillRect(px(dgX + dgW), py(h - T), w - dgX - dgW, T)

    // Tally marks scratched on west wall (inside)
    g.lineStyle(1.5, 0x442222, 0.85)
    const tx = T + 5
    ;[0,1,2,3,5,6,7,8].forEach(i => {
      const bx = tx + (Math.floor(i / 4) * 30), bi = i % 4
      g.lineBetween(px(bx + bi * 6), py(52), px(bx + bi * 6), py(82))
    })
    // Cross-through every 5th
    g.lineBetween(px(tx + 24), py(50), px(tx + 6), py(84))
    g.lineBetween(px(tx + 54), py(50), px(tx + 36), py(84))
    g.lineStyle(0, 0, 0)

    // Blood drips on north wall
    g.fillStyle(0x880000, 0.5)
    g.fillRect(px(T + 40), py(T), 3, 16)
    g.fillRect(px(T + 44), py(T), 2, 11)
    g.fillRect(px(T + 120), py(T), 3, 20)
    g.fillRect(px(T + 126), py(T), 2, 9)
    g.fillRect(px(T + 168), py(T), 3, 14)
    g.fillStyle(0x660000, 0.6)
    g.fillCircle(px(T + 41), py(T + 17), 3)
    g.fillCircle(px(T + 121), py(T + 21), 3)

    // Strange corkboard with torn notes
    g.fillStyle(0x0a0a0a)
    g.fillRect(px(T + 4), py(T + 4), 140, 50)
    g.fillStyle(0x3a2218)
    g.fillRect(px(T + 6), py(T + 6), 136, 46)
    // Torn paper notes
    g.fillStyle(0xe8e0d0)
    g.fillRect(px(T + 10), py(T + 9), 36, 24)
    g.fillRect(px(T + 54), py(T + 8), 30, 28)
    g.fillRect(px(T + 92), py(T + 11), 38, 20)
    // Writing lines on notes
    g.lineStyle(1, 0x444444, 0.7)
    g.lineBetween(px(T + 12), py(T + 17), px(T + 44), py(T + 17))
    g.lineBetween(px(T + 12), py(T + 23), px(T + 42), py(T + 23))
    g.lineStyle(0, 0, 0)
    // Red X on one note
    g.lineStyle(2, 0xcc0000, 0.9)
    g.lineBetween(px(T + 56), py(T + 10), px(T + 82), py(T + 34))
    g.lineBetween(px(T + 82), py(T + 10), px(T + 56), py(T + 34))
    g.lineStyle(0, 0, 0)

    // Old shelf on east wall (darker)
    g.fillStyle(0x0a0a0a)
    g.fillRect(px(w - T - 50), py(T + 58), 46, 128)
    g.fillStyle(0x1a0e08)
    g.fillRect(px(w - T - 48), py(T + 60), 42, 124)
    // Shelf dividers
    g.fillStyle(0x080604)
    g.fillRect(px(w - T - 48), py(T + 100), 42, 4)
    g.fillRect(px(w - T - 48), py(T + 144), 42, 4)
    // Ominous jar
    g.fillStyle(0x1a2a18)
    g.fillRoundedRect(px(w - T - 44), py(T + 64), 24, 30, 4)
    g.fillStyle(0x2a4828, 0.7)
    g.fillRoundedRect(px(w - T - 42), py(T + 66), 20, 14, 3)
    // Something dark in the jar
    g.fillStyle(0x000000, 0.8)
    g.fillEllipse(px(w - T - 38), py(T + 82), 14, 10)

    // Table with candle
    g.fillStyle(0x0a0a0a)
    g.fillRect(px(T + 4), py(T + 128), 68, 44)
    g.fillStyle(0x1e0c04)
    g.fillRect(px(T + 6), py(T + 130), 64, 40)
    // Candle
    g.fillStyle(0xd0c8a0)
    g.fillRect(px(T + 28), py(T + 118), 8, 18)
    g.fillStyle(0x880000, 0.4)
    g.fillRect(px(T + 24), py(T + 155), 16, 8)
    const candleFlame = this.add.graphics().setDepth(4)
    candleFlame.fillStyle(0xf1c40f, 1); candleFlame.fillCircle(0, 0, 6)
    candleFlame.fillStyle(0xe05000, 1); candleFlame.fillCircle(0, 0, 4)
    candleFlame.fillStyle(0xff8800, 0.5); candleFlame.fillCircle(0, 0, 7)
    candleFlame.x = px(T + 32); candleFlame.y = py(T + 116)
    this.tweens.add({ targets: candleFlame, alpha: { from: 0.5, to: 1.0 }, scaleY: { from: 0.7, to: 1.4 }, scaleX: { from: 0.85, to: 1.15 }, yoyo: true, repeat: -1, duration: 220, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: candleFlame, x: { from: px(T + 31), to: px(T + 33) }, yoyo: true, repeat: -1, duration: 170, delay: 40, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: candleFlame, alpha: { from: 0.6, to: 1.0 }, yoyo: true, repeat: -1, duration: 80, delay: 0, ease: 'Linear' })

    // Strange locked box on table
    g.fillStyle(0x0a0808)
    g.fillRoundedRect(px(T + 42), py(T + 132), 22, 16, 2)
    g.fillStyle(0x1e1010)
    g.fillRoundedRect(px(T + 44), py(T + 134), 18, 12, 2)
    g.fillStyle(0x8a7a30)
    g.fillCircle(px(T + 53), py(T + 140), 3)

    // Mattress (very dirty/dark)
    g.fillStyle(0x0a0a12)
    g.fillRoundedRect(px(T + 88), py(T + 118), 48, 58, 6)
    g.fillStyle(0x14121e)
    g.fillRoundedRect(px(T + 90), py(T + 120), 44, 54, 5)
    // Stains
    g.fillStyle(0x3a1010, 0.7)
    g.fillEllipse(px(T + 104), py(T + 142), 22, 14)
    g.fillStyle(0x1a0808, 0.8)
    g.fillEllipse(px(T + 112), py(T + 158), 14, 10)

    // Small grimy window (north wall)
    g.fillStyle(0x0a0808)
    g.fillRect(px(T + 90), py(0), 52, T)
    g.fillStyle(0x2a3a1a)
    g.fillRect(px(T + 92), py(2), 48, T - 4)
    g.fillStyle(0x1a2a12)
    g.fillRect(px(T + 116), py(2), 2, T - 4)
    g.fillStyle(0xd0e8c0, 0.2)
    g.fillRect(px(T + 94), py(3), 10, 5)

    // Cobwebs in corners
    g.lineStyle(1, 0x888888, 0.35)
    ;[[T, T],[w - T, T]].forEach(([cx, cy]) => {
      for (let a = 0; a < 5; a++) {
        const len = 12 + a * 6
        g.lineBetween(px(cx), py(cy), px(cx + (cx < w / 2 ? len : -len)), py(cy + len * 0.7))
      }
      for (let a = 1; a < 5; a++) {
        const r = a * 6
        g.lineBetween(
          px(cx + (cx < w / 2 ? r : -r) * 0.5), py(cy + r * 0.35),
          px(cx + (cx < w / 2 ? r + 6 : -(r + 6)) * 0.5), py(cy + (r + 6) * 0.35)
        )
      }
    })
    g.lineStyle(0, 0, 0)

    // Pulsing red glow overlay (horror atmosphere)
    const redGlow = this.add.rectangle(ox + w / 2, oy + h / 2, w, h, 0x660000, 0)
    redGlow.setDepth(5)
    this.tweens.add({ targets: redGlow, alpha: { from: 0.04, to: 0.10 }, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.easeInOut' })

    // Cryptic wall text
    this.add.text(px(T + 8), py(h - T - 28), 'DO NOT SLEEP', {
      fontSize: '8px', color: '#550000', fontStyle: 'bold',
      alpha: 0.7,
    }).setDepth(4)
    this.add.text(px(T + 8), py(h - T - 18), 'THEY KNOW', {
      fontSize: '7px', color: '#440000', alpha: 0.6,
    }).setDepth(4)

    g.fillStyle(0xf1c40f, 0.5)
    g.fillTriangle(px(w / 2), py(h - 1), px(w / 2 - 10), py(h - 13), px(w / 2 + 10), py(h - 13))
  }

  _drawHuussi(g, def, ox, oy) {
    const { w, h, T, dgW } = def
    const dgX = Math.floor((w - dgW) / 2)
    const px = (lx) => ox + lx
    const py = (ly) => oy + ly

    for (let fy = T; fy < h - T; fy += 14) {
      g.fillStyle(Math.floor(fy / 14) & 1 ? 0x7a5030 : 0x886040)
      g.fillRect(px(T), py(fy), w - T * 2, 14)
    }

    g.fillStyle(0x2a1808)
    g.fillRect(px(0), py(0), w, T)
    g.fillRect(px(0), py(0), T, h)
    g.fillRect(px(w - T), py(0), T, h)
    g.fillRect(px(0), py(h - T), dgX, T)
    g.fillRect(px(dgX + dgW), py(h - T), w - dgX - dgW, T)

    const tx = Math.floor(w / 2) - 22, ty = h - T - 72
    g.fillStyle(0x1a1a1a)
    g.fillEllipse(px(tx + 2), py(ty + 2), 54, 66)
    g.fillStyle(0xf0eee0)
    g.fillEllipse(px(tx), py(ty), 52, 64)
    g.fillStyle(0xe8e6d8)
    g.fillEllipse(px(tx), py(ty + 4), 44, 52)
    g.fillStyle(0x1a1a1a)
    g.fillRect(px(tx - 22), py(ty - 44), 48, 30)
    g.fillStyle(0xf0eee0)
    g.fillRect(px(tx - 20), py(ty - 42), 44, 26)
    g.fillStyle(0x888888)
    g.fillCircle(px(tx + 14), py(ty - 34), 5)

    const mx = w - T / 2, my = Math.floor(h / 2)
    g.fillStyle(0xf1c40f)
    g.fillCircle(px(mx), py(my), 13)
    g.fillStyle(0x2a1808)
    g.fillCircle(px(mx + 5), py(my - 4), 10)

    g.fillStyle(0x5a3818)
    g.fillRect(px(T + 8), py(T + 6), w - T * 2 - 16, 14)
    g.fillStyle(0xf0e8d0)
    g.fillRect(px(T + 16), py(T + 2), 12, 12)
    g.fillStyle(0x446644)
    g.fillRect(px(T + 36), py(T + 4), 8, 10)

    g.fillStyle(0xf0e8c0)
    g.fillRect(px(T + 10), py(ty + 14), 38, 30)
    g.lineStyle(1, 0xccbbaa, 0.5)
    for (let li = 0; li < 3; li++) g.lineBetween(px(T + 14), py(ty + 20 + li * 6), px(T + 44), py(ty + 20 + li * 6))
    g.lineStyle(0, 0, 0)

    g.fillStyle(0xf1c40f, 0.6)
    g.fillTriangle(px(w / 2), py(h - 1), px(w / 2 - 10), py(h - 13), px(w / 2 + 10), py(h - 13))
  }

  // ── UPDATE / EXIT ──────────────────────────────────────────────────────────

  update(time, delta) {
    this._player.update()

    const def = this._def
    const ox = this._ox, oy = this._oy
    const dgX = Math.floor((def.w - def.dgW) / 2)
    const exitY = oy + def.h - def.T - 6
    const plx = this._player.x
    const ply = this._player.y
    const nearExit = ply >= exitY && plx >= ox + dgX - 6 && plx <= ox + dgX + def.dgW + 6

    this._exitPrompt.setVisible(ply > exitY - 40 && plx >= ox + dgX - 20 && plx <= ox + dgX + def.dgW + 20)

    if (nearExit && !this._exiting) this._exit()

    if (this._neverPrompt) {
      const gs = this.scene.get('GameScene')
      const period = gs?.timeSystem?.currentPeriod
      const isNight = period === 'night' || period === 'late_night'
      this._neverPrompt.setVisible(isNight)
    }

    if (!this._exiting && Phaser.Input.Keyboard.JustDown(this._eKey)) {
      if (this._neverPrompt?.visible) {
        this._launchNeverScene()
      } else if (ply > exitY - 50) {
        this._exit()
      }
    }

    if (this._internalDoorReady) this._checkInternalDoors(plx, ply)
  }

  _launchNeverScene() {
    if (this._exiting) return
    this._exiting = true
    this.cameras.main.fadeOut(200, 0, 0, 0)
    this.time.delayedCall(220, () => {
      this.scene.launch('NeverScene')
      this.scene.sleep()
    })
  }

  _checkInternalDoors(plx, ply) {
    const def = this._def
    if (!def.internalDoors || this._exiting) return
    const ox = this._ox, oy = this._oy
    for (const door of def.internalDoors) {
      if (door.y === 0) {
        const inX = plx >= ox + door.x - 8 && plx <= ox + door.x + door.w + 8
        const nearNorth = ply <= oy + def.T + 18
        const promptEntry = this._internalDoorPrompts.find(p => p.door === door)
        if (promptEntry) promptEntry.prompt.setVisible(ply <= oy + def.T + 60 && inX)
        if (nearNorth && inX) {
          this._enterRoom(door.targetRoom)
          return
        }
      }
    }
  }

  _enterRoom(targetRoomId) {
    if (this._exiting) return
    this._exiting = true
    this.cameras.main.fadeOut(200, 0, 0, 0)
    this.time.delayedCall(220, () => {
      this.scene.restart({ roomId: targetRoomId })
    })
  }

  _exit() {
    if (this._exiting) return
    this._exiting = true
    const def = ROOMS[this._roomId]
    this.cameras.main.fadeOut(200, 0, 0, 0)
    this.time.delayedCall(220, () => {
      if (def.returnTo === 'GameScene') {
        const gs = this.scene.get('GameScene')
        gs.player._body.body.reset(def.returnX - 10, def.returnY - 10)
        this.scene.stop()
        this.scene.wake('GameScene')
      } else {
        this.scene.restart({
          roomId: def.returnTo,
          entryOverrideX: def.returnX,
          entryOverrideY: def.returnY,
        })
      }
    })
  }
}
