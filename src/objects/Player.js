const SPEED = 220

export class Player {
  constructor(scene, x, y) {
    this.scene = scene
    this.drunkLevel = 0
    this.highLevel  = 0
    this.facing = 'down'
    this._lastFacing = 'down'

    this._gfx = scene.add.graphics()
    this._drawSprite()

    this._body = scene.physics.add.existing(this._gfx)
    this._body.body.setSize(20, 20)
    this._body.body.reset(x - 10, y - 10)
    this._body.body.setCollideWorldBounds(true)

    this._shadow = scene.add.graphics()
    this._shadow.fillStyle(0x000000, 0.35)
    this._shadow.fillEllipse(0, 0, 15, 7)
    this._shadow.setDepth(1)

    this._isMoving    = false
    this._wobbleTween = null
    this._scaleTween  = null

    this.cursors = scene.input.keyboard.addKeys({
      up:       Phaser.Input.Keyboard.KeyCodes.W,
      down:     Phaser.Input.Keyboard.KeyCodes.S,
      left:     Phaser.Input.Keyboard.KeyCodes.A,
      right:    Phaser.Input.Keyboard.KeyCodes.D,
      upArr:    Phaser.Input.Keyboard.KeyCodes.UP,
      downArr:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftArr:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArr: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    })
  }

  _drawSprite() {
    const g = this._gfx
    g.clear()
    const OL = 0x1a1a1a
    const facing = this.facing || 'down'

    // ── OUTLINES ─────────────────────────────────────────────────────
    g.fillStyle(OL)
    g.fillRoundedRect(-11, 14, 9, 11, 2)   // leg L
    g.fillRoundedRect(2,   14, 9, 11, 2)   // leg R
    g.fillRoundedRect(-12, -8, 24, 24, 4)  // body
    g.fillCircle(0, -18, 12)               // head

    // ── LEGS ──────────────────────────────────────────────────────────
    g.fillStyle(0x1840a8)
    g.fillRoundedRect(-9, 15, 7, 9, 2)
    g.fillRoundedRect(2,  15, 7, 9, 2)

    // ── BODY ──────────────────────────────────────────────────────────
    g.fillStyle(0x3070d0)
    g.fillRoundedRect(-10, -6, 20, 22, 3)

    if (facing === 'up') {
      // Back of head — no eyes, hair visible
      g.fillStyle(0xd4a870)
      g.fillCircle(0, -18, 10)
      g.fillStyle(0x4a3010)
      g.fillCircle(0, -22, 6)
      // Hat from back — brim projects upward
      g.fillStyle(OL)
      g.fillEllipse(0, -27, 26, 13)
      g.fillStyle(0xd82018)
      g.fillEllipse(0, -27, 22, 11)
      g.fillStyle(0x880808)
      g.fillRect(-11, -29, 22, 3)
    } else {
      // Front or side face
      g.fillStyle(0xf2c88a)
      g.fillCircle(0, -18, 10)

      // Hat — brim projects downward (front/side)
      g.fillStyle(OL)
      g.fillEllipse(0, -27, 26, 13)
      g.fillStyle(0xd82018)
      g.fillEllipse(0, -27, 22, 11)
      g.fillStyle(0xa01010)
      g.fillRect(-11, -25, 22, 3)

      if (facing === 'down') {
        // Eyes front, hoodie pocket visible
        g.fillStyle(OL)
        g.fillCircle(-3, -19, 1.8)
        g.fillCircle(4,  -19, 1.8)
        g.fillStyle(0xffffff)
        g.fillCircle(-2, -20, 0.8)
        g.fillCircle(5,  -20, 0.8)
        g.fillStyle(0x2858a8)
        g.fillRoundedRect(-5, 6, 10, 8, 2)
      } else if (facing === 'left') {
        // Eyes shifted left (side profile)
        g.fillStyle(OL)
        g.fillCircle(-5, -19, 1.8)
        g.fillCircle(-1, -20, 1.8)
        g.fillStyle(0xffffff)
        g.fillCircle(-4, -20, 0.8)
        g.fillCircle(0,  -21, 0.8)
      } else if (facing === 'right') {
        // Eyes shifted right (side profile)
        g.fillStyle(OL)
        g.fillCircle(1,  -20, 1.8)
        g.fillCircle(5,  -19, 1.8)
        g.fillStyle(0xffffff)
        g.fillCircle(2,  -21, 0.8)
        g.fillCircle(6,  -20, 0.8)
      }
    }
  }

  update() {
    const speedMod = 1 - this.drunkLevel * 0.06
    const highMod  = 1 - this.highLevel  * 0.05
    const speed = SPEED * Math.max(0.3, speedMod) * Math.max(0.45, highMod)

    const { up, down, left, right, upArr, downArr, leftArr, rightArr } = this.cursors
    const goUp    = up.isDown    || upArr.isDown
    const goDown  = down.isDown  || downArr.isDown
    const goLeft  = left.isDown  || leftArr.isDown
    const goRight = right.isDown || rightArr.isDown

    let vx = 0, vy = 0
    if (goLeft)  { vx = -speed; this.facing = 'left'  }
    if (goRight) { vx =  speed; this.facing = 'right' }
    if (goUp)    { vy = -speed; this.facing = 'up'    }
    if (goDown)  { vy =  speed; this.facing = 'down'  }

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

    if (this.drunkLevel > 3) {
      vx += Math.sin(this.scene.time.now / 400) * this.drunkLevel * 4
    }

    this._body.body.setVelocity(vx, vy)

    if (this.facing !== this._lastFacing) {
      this._drawSprite()
      this._lastFacing = this.facing
    }

    const moving = vx !== 0 || vy !== 0
    if (moving !== this._isMoving) {
      this._isMoving = moving
      moving ? this._startWalkAnimation() : this._stopWalkAnimation()
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

  addDrink() { this.drunkLevel = Math.min(10, this.drunkLevel + 1) }
  addWeed()  { this.highLevel  = Math.min(10, this.highLevel  + 1) }

  getPhysicsBody() { return this._body }
}
