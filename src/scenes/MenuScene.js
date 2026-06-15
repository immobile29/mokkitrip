export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.scale

    // sky background
    this.add.rectangle(width / 2, height / 2, width, height, 0x87ceeb)

    // sun
    this.add.circle(width - 80, 70, 40, 0xf9ca24)

    // trees decoration
    this._drawTree(60, height - 80)
    this._drawTree(120, height - 100)
    this._drawTree(width - 60, height - 80)
    this._drawTree(width - 130, height - 110)

    // lake
    this.add.rectangle(width / 2, height - 30, width, 80, 0x2471a3)

    // title box
    const titleBg = this.add.rectangle(width / 2, height / 2 - 60, 520, 130, 0x1a1a2e, 0.88)
      .setStrokeStyle(3, 0xf1c40f)

    this.add.text(width / 2, height / 2 - 90, '🏕️  MÖKKITRIP  🏕️', {
      fontSize: '36px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 - 48, 'SIMULATOR', {
      fontSize: '22px',
      color: '#ecf0f1',
      letterSpacing: 8,
    }).setOrigin(0.5)

    // start button
    const btn = this.add.rectangle(width / 2, height / 2 + 60, 240, 50, 0x27ae60)
      .setStrokeStyle(2, 0x1e8449)
      .setInteractive({ useHandCursor: true })

    const btnText = this.add.text(width / 2, height / 2 + 60, 'MENNÄÄN MÖKILLE', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    btn.on('pointerover', () => btn.setFillStyle(0x2ecc71))
    btn.on('pointerout', () => btn.setFillStyle(0x27ae60))
    btn.on('pointerdown', () => this.scene.start('GameScene'))

    // controls hint
    this.add.text(width / 2, height / 2 + 120, 'WASD / Arrow keys to move  •  E to interact', {
      fontSize: '13px',
      color: '#7f8c8d',
    }).setOrigin(0.5)

    // characters teaser
    this.add.text(width / 2, height - 95, 'Featuring: Jon • Alwar • Elliot • Schmaxel • Mark • Edu • Robert • Nixu • Nikkebre • Juho • Allu', {
      fontSize: '11px',
      color: '#bdc3c7',
    }).setOrigin(0.5)

    // keyboard shortcut
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'))
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'))
  }

  _drawTree(x, y) {
    const g = this.add.graphics()
    g.fillStyle(0x5d4e37)
    g.fillRect(x - 5, y - 20, 10, 25)
    g.fillStyle(0x27ae60)
    g.fillTriangle(x, y - 60, x - 22, y - 10, x + 22, y - 10)
    g.fillTriangle(x, y - 80, x - 16, y - 40, x + 16, y - 40)
  }
}
