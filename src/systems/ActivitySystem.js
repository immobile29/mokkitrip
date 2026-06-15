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
    for (const [zoneId, rect] of this.zones) {
      if (
        playerX >= rect.x && playerX <= rect.x + rect.width &&
        playerY >= rect.y && playerY <= rect.y + rect.height
      ) {
        const activity = this._getActivityForZone(zoneId)
        if (activity && this.timeSystem.isActivityAvailable(activity)) {
          this.activeZone = activity
          if (this.promptText) {
            this.promptText.setText(activity.prompt)
            this.promptText.setVisible(true)
          }
          return
        }
      }
    }
    if (this.promptText) this.promptText.setVisible(false)
  }

  _getActivityForZone(zoneId) {
    return Object.values(ACTIVITIES).find(a => a.zone === zoneId) ?? null
  }

  tryActivate() {
    if (this.activeZone) {
      this.scene.events.emit('activity:start', this.activeZone)
      return true
    }
    return false
  }
}
