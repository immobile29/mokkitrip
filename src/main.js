import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { MenuScene } from './scenes/MenuScene.js'
import { GameScene } from './scenes/GameScene.js'

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, GameScene],
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

new Phaser.Game(config)
