import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { MenuScene } from './scenes/MenuScene.js'
import { GameScene } from './scenes/GameScene.js'
import { RoomScene } from './scenes/RoomScene.js'
import { TikanheittoScene } from './scenes/TikanheittoScene.js'
import { MolkkyScene } from './scenes/MolkkyScene.js'
import { WeedScene } from './scenes/WeedScene.js'
import { DrinkingScene } from './scenes/DrinkingScene.js'
import { PaljuScene } from './scenes/PaljuScene.js'
import { SaunaScene } from './scenes/SaunaScene.js'
import { NeverScene } from './scenes/NeverScene.js'
import { HideSeekScene } from './scenes/HideSeekScene.js'
import { DockJumpScene } from './scenes/DockJumpScene.js'
import { RowingScene } from './scenes/RowingScene.js'
import { MissionBoardScene } from './scenes/MissionBoardScene.js'
import { SUPScene } from './scenes/SUPScene.js'
import { GrillingScene } from './scenes/GrillingScene.js'

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, GameScene, RoomScene, TikanheittoScene, MolkkyScene, WeedScene, DrinkingScene, PaljuScene, SaunaScene, NeverScene, HideSeekScene, DockJumpScene, RowingScene, MissionBoardScene, SUPScene, GrillingScene],
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

window.game = new Phaser.Game(config)
