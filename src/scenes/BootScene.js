export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // no external assets — everything is drawn with graphics
  }

  create() {
    this.scene.start('MenuScene')
  }
}
