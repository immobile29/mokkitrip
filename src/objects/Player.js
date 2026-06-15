const SPEED = 150

export class Player {
  constructor(scene, x, y) {
    this.scene = scene
    this.drunkLevel = 0 // 0-10, affects speed + camera wobble
    this.highLevel = 0  // 0-10, affects blur

    this._gfx = scene.add.graphics()
    this._drawSprite()

    this._body = scene.physics.add
      .existing(this._gfx)
    this._body.body.setSize(20, 20)
    this._body.setPosition(x, y)
    this._body.body.setCollideWorldBounds(true)

    this.cursors = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      upArr: Phaser.Input.Keyboard.KeyCodes.UP,
      downArr: Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftArr: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArr: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    })

    this.facing = 'down'
  }

  _drawSprite() {
    this._gfx.clear()
    // body
    this._gfx.fillStyle(0x3498db)
    this._gfx.fillRect(-10, -8, 20, 22)
    // head
    this._gfx.fillStyle(0xf0c080)
    this._gfx.fillCircle(0, -16, 10)
    // eyes
    this._gfx.fillStyle(0x000000)
    this._gfx.fillCircle(-3, -17, 2)
    this._gfx.fillCircle(4, -17, 2)
  }

  update() {
    const speedMod = 1 - (this.drunkLevel * 0.06)
    const speed = SPEED * Math.max(0.3, speedMod)

    const { up, down, left, right, upArr, downArr, leftArr, rightArr } = this.cursors
    const goUp = up.isDown || upArr.isDown
    const goDown = down.isDown || downArr.isDown
    const goLeft = left.isDown || leftArr.isDown
    const goRight = right.isDown || rightArr.isDown

    let vx = 0
    let vy = 0
    if (goLeft) { vx = -speed; this.facing = 'left' }
    if (goRight) { vx = speed; this.facing = 'right' }
    if (goUp) { vy = -speed; this.facing = 'up' }
    if (goDown) { vy = speed; this.facing = 'down' }

    // normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707
      vy *= 0.707
    }

    // drunk wobble
    if (this.drunkLevel > 3) {
      vx += Math.sin(this.scene.time.now / 400) * this.drunkLevel * 4
    }

    this._body.body.setVelocity(vx, vy)
    this._gfx.setPosition(this._body.x + 10, this._body.y + 10)
  }

  get x() { return this._body.x + 10 }
  get y() { return this._body.y + 10 }

  addDrink() {
    this.drunkLevel = Math.min(10, this.drunkLevel + 1)
  }

  addWeed() {
    this.highLevel = Math.min(10, this.highLevel + 1)
  }

  getPhysicsBody() {
    return this._body
  }
}
