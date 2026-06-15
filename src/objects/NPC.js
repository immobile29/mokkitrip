const IDLE_RADIUS = 30
const WANDER_INTERVAL = 3000

export class NPC {
  constructor(scene, x, y, characterData) {
    this.scene = scene
    this.data = characterData
    this.homeX = x
    this.homeY = y
    this._nextWander = 0
    this._targetX = x
    this._targetY = y

    this._gfx = scene.add.graphics()
    this._drawSprite()

    this._body = scene.physics.add.existing(this._gfx)
    this._body.setPosition(x, y)
    this._body.body.setSize(20, 20)
    this._body.body.setImmovable(false)

    this._nameTag = scene.add
      .text(x, y - 28, characterData.name, {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(5)

    this._exclamation = scene.add
      .text(x, y - 44, '!', { fontSize: '18px', color: '#f1c40f', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false)
  }

  _drawSprite() {
    const d = this.data
    this._gfx.clear()

    // body
    this._gfx.fillStyle(d.bodyColor)
    this._gfx.fillRect(-10, -8, 20, 22)

    // head
    const headColor = d.isYellow ? 0xf1c40f : 0xf0c080
    this._gfx.fillStyle(headColor)
    this._gfx.fillCircle(0, -16, 10)

    if (d.isSeagull) {
      // wings
      this._gfx.fillStyle(d.color)
      this._gfx.fillEllipse(-16, -10, 20, 10)
      this._gfx.fillEllipse(16, -10, 20, 10)
      // beak
      this._gfx.fillStyle(0xe67e22)
      this._gfx.fillTriangle(8, -15, 14, -13, 8, -11)
    } else {
      // eyes
      this._gfx.fillStyle(0x000000)
      this._gfx.fillCircle(-3, -17, 2)
      this._gfx.fillCircle(4, -17, 2)

      if (d.isKing) {
        // crown
        this._gfx.fillStyle(0xf1c40f)
        this._gfx.fillRect(-10, -30, 20, 8)
        this._gfx.fillTriangle(-10, -30, -5, -38, 0, -30)
        this._gfx.fillTriangle(0, -30, 5, -38, 10, -30)
      }

      if (d.isChubby) {
        // wider body
        this._gfx.fillStyle(d.bodyColor)
        this._gfx.fillRect(-14, -8, 28, 24)
      }

      if (d.hasTattoo) {
        // back tattoo hint (small marker on the sprite back)
        this._gfx.fillStyle(0x2c3e50)
        this._gfx.fillRect(-4, 2, 8, 6)
      }
    }
  }

  update(time, playerX, playerY, dialogueSystem) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY)
    const nearby = dist < 50

    this._exclamation.setVisible(nearby && !dialogueSystem.isOpen)

    // wander AI
    if (!nearby && time > this._nextWander) {
      this._nextWander = time + WANDER_INTERVAL + Math.random() * 2000
      const angle = Math.random() * Math.PI * 2
      this._targetX = this.homeX + Math.cos(angle) * (Math.random() * IDLE_RADIUS)
      this._targetY = this.homeY + Math.sin(angle) * (Math.random() * IDLE_RADIUS)
    }

    // move toward target
    const dx = this._targetX - this.x
    const dy = this._targetY - this.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len > 4) {
      const spd = this.data.speed * 0.4
      this._body.body.setVelocity((dx / len) * spd, (dy / len) * spd)
    } else {
      this._body.body.setVelocity(0, 0)
    }

    // sync graphics
    this._gfx.setPosition(this._body.x + 10, this._body.y + 10)
    this._nameTag.setPosition(this.x, this.y - 28)
    this._exclamation.setPosition(this.x, this.y - 44)
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
