const IDLE_RADIUS = 30
const WANDER_INTERVAL = 3000

export class NPC {
  constructor(scene, x, y, characterData) {
    this.scene   = scene
    this.data    = characterData
    this.homeX   = x
    this.homeY   = y
    this._nextWander = 0
    this._targetX = x
    this._targetY = y

    this._gfx = scene.add.graphics()
    this._drawSprite()

    this._body = scene.physics.add.existing(this._gfx)
    this._body.body.setSize(20, 20)
    this._body.body.reset(x - 10, y - 10)
    this._body.body.setImmovable(false)
    this._body.body.setCollideWorldBounds(true)

    this._shadow = scene.add.graphics()
    this._shadow.fillStyle(0x000000, 0.35)
    this._shadow.fillEllipse(0, 0, 15, 7)
    this._shadow.setDepth(1)

    this._isMoving    = false
    this._wobbleTween = null
    this._scaleTween  = null

    this._nameTag = scene.add
      .text(x, y - 30, characterData.name, {
        fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
        backgroundColor: '#00000088',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(5)

    this._exclamation = scene.add
      .text(x, y - 46, '!', { fontSize: '20px', color: '#f1c40f', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false)
  }

  _drawSprite() {
    const g = this._gfx
    const d = this.data
    g.clear()

    if (d.isSeagull) {
      this._drawSeagull(g, d)
    } else {
      this._drawHuman(g, d)
    }
  }

  _drawHuman(g, d) {
    const OL  = 0x1a1a1a
    const bw  = d.isChubby ? 26 : 20
    const bx  = -(bw / 2)

    // ── OUTLINES ──────────────────────────────────────────────────────
    g.fillStyle(OL)
    // legs
    g.fillRoundedRect(-11, 14, 9, 11, 2)
    g.fillRoundedRect(2,   14, 9, 11, 2)
    // body
    g.fillRoundedRect(bx - 2, -8, bw + 4, 24, 5)
    // head
    g.fillCircle(0, -18, 12)
    // crown outline (king)
    if (d.isKing) {
      g.fillRect(-12, -32, 24, 9)
      g.fillTriangle(-12, -32, -6, -41, 0,  -32)
      g.fillTriangle(0,   -32,  6, -41, 12, -32)
    }

    // ── LEGS ──────────────────────────────────────────────────────────
    g.fillStyle(d.color)
    g.fillRoundedRect(-9, 15, 7, 9, 2)
    g.fillRoundedRect(2,  15, 7, 9, 2)

    // ── BODY ──────────────────────────────────────────────────────────
    g.fillStyle(d.bodyColor)
    g.fillRoundedRect(bx, -6, bw, 22, 4)

    // ── HEAD ──────────────────────────────────────────────────────────
    const headColor = d.isYellow ? 0xf0c030 : 0xf2c88a
    g.fillStyle(headColor)
    g.fillCircle(0, -18, 10)

    // ── EYES ──────────────────────────────────────────────────────────
    g.fillStyle(OL)
    g.fillCircle(-3, -19, 1.8)
    g.fillCircle(4,  -19, 1.8)
    g.fillStyle(0xffffff)
    g.fillCircle(-2, -20, 0.8)
    g.fillCircle(5,  -20, 0.8)

    // ── CROWN ─────────────────────────────────────────────────────────
    if (d.isKing) {
      g.fillStyle(0xf1c40f)
      g.fillRect(-10, -31, 20, 7)
      g.fillTriangle(-10, -31, -5, -39, 0,  -31)
      g.fillTriangle(0,   -31,  5, -39, 10, -31)
      g.fillStyle(0xe8a010)
      g.fillCircle(-5, -39, 3)
      g.fillCircle(5,  -39, 3)
      g.fillCircle(0,  -39, 3)
    }

    // ── TATTOO ────────────────────────────────────────────────────────
    if (d.hasTattoo) {
      g.fillStyle(0x2c3e50)
      g.fillRect(-4, 0, 8, 5)
    }
  }

  _drawSeagull(g, d) {
    const OL = 0x1a1a1a
    // Outlines
    g.fillStyle(OL)
    g.fillEllipse(0, -4, 28, 16)
    g.fillCircle(0, -18, 11)
    g.fillEllipse(-22, -10, 24, 12)
    g.fillEllipse(22,  -10, 24, 12)
    // Wings
    g.fillStyle(d.color)
    g.fillEllipse(-19, -10, 20, 9)
    g.fillEllipse(19,  -10, 20, 9)
    // Body
    g.fillStyle(0xf0f0f0)
    g.fillEllipse(0, -4, 22, 12)
    // Head
    g.fillStyle(0xfafafa)
    g.fillCircle(0, -18, 9)
    // Beak
    g.fillStyle(0xe08820)
    g.fillTriangle(7, -17, 16, -13, 7, -10)
    // Eye
    g.fillStyle(OL)
    g.fillCircle(4, -20, 2)
    g.fillStyle(0xffffff)
    g.fillCircle(5, -21, 0.8)
  }

  update(time, playerX, playerY, dialogueSystem) {
    const dist   = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY)
    const nearby = dist < 50

    this._exclamation.setVisible(nearby && !dialogueSystem.isOpen)

    if (!nearby && time > this._nextWander) {
      this._nextWander = time + WANDER_INTERVAL + Math.random() * 2000
      const angle = Math.random() * Math.PI * 2
      this._targetX = this.homeX + Math.cos(angle) * (Math.random() * IDLE_RADIUS)
      this._targetY = this.homeY + Math.sin(angle) * (Math.random() * IDLE_RADIUS)
    }

    const dx  = this._targetX - this.x
    const dy  = this._targetY - this.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len > 4) {
      const spd = this.data.speed * 0.4
      this._body.body.setVelocity((dx / len) * spd, (dy / len) * spd)
    } else {
      this._body.body.setVelocity(0, 0)
    }

    this._nameTag.setPosition(this.x, this.y - 30)
    this._exclamation.setPosition(this.x, this.y - 46)

    const spd = this._body.body.velocity.length()
    const moving = spd > 8
    if (moving !== this._isMoving) {
      this._isMoving = moving
      if (!this.data.isSeagull) {
        moving ? this._startWalkAnimation() : this._stopWalkAnimation()
      }
    }

    this._shadow.setPosition(this._gfx.x, this._gfx.y + 10)
  }

  _startWalkAnimation() {
    if (this._wobbleTween) return
    this._wobbleTween = this.scene.tweens.add({
      targets: this._gfx,
      angle: { from: -3, to: 3 },
      duration: 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    })
    this._scaleTween = this.scene.tweens.add({
      targets: this._gfx,
      scaleY: { from: 0.96, to: 1.04 },
      duration: 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    })
  }

  _stopWalkAnimation() {
    this._wobbleTween?.stop(); this._wobbleTween = null
    this._scaleTween?.stop();  this._scaleTween  = null
    this._gfx.setAngle(0).setScale(1, 1)
  }

  get x() { return this._body.x + 10 }
  get y() { return this._body.y + 10 }

  isNearPlayer(playerX, playerY) {
    return Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) < 50
  }

  setDepth(d) {
    this._gfx.setDepth(d)
    return this
  }
}
