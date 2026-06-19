import { ACTIVITIES } from '../data/activities.js'

export class ActivitySystem {
  constructor(scene, timeSystem) {
    this.scene = scene
    this.timeSystem = timeSystem
    this.zones = new Map() // id → Phaser rectangle zone
    this.activeZone = null
    this.promptText = null
  }

  registerZone(id, rect) {
    this.zones.set(id, rect)
  }

  setPromptText(textObj) {
    this.promptText = textObj
  }

  update(playerX, playerY) {
    this.activeZone = null
    let bestArea = Infinity

    for (const [zoneId, rect] of this.zones) {
      if (
        playerX >= rect.x && playerX <= rect.x + rect.width &&
        playerY >= rect.y && playerY <= rect.y + rect.height
      ) {
        const activity = this._getActivityForZone(zoneId)
        if (activity) {
          const area = rect.width * rect.height
          if (area < bestArea) {
            bestArea = area
            this.activeZone = activity
          }
        }
      }
    }

    if (this.promptText) {
      if (this.activeZone) {
        this.promptText.setText(this.activeZone.prompt)
        this.promptText.setVisible(true)
      } else {
        this.promptText.setVisible(false)
      }
    }
  }

  _getActivityForZone(zoneId) {
    return Object.values(ACTIVITIES).find(
      a => a.zone === zoneId && this.timeSystem.isActivityAvailable(a)
    ) ?? null
  }

  tryActivate() {
    if (this.activeZone) {
      this.scene.events.emit('activity:start', this.activeZone)
      return true
    }
    return false
  }
}
