import { TIME_PERIODS, TIME_RANGES } from '../data/activities.js'

const GAME_HOUR_MS = 8000 // 1 in-game hour = 8 real seconds (full day = ~3.2 minutes)

export class TimeSystem {
  constructor(scene) {
    this.scene = scene
    this.gameHour = 10 // start at 10am
    this.currentPeriod = TIME_PERIODS.DAY
    this._elapsed = 0
    this._listeners = []
  }

  update(delta) {
    this._elapsed += delta
    if (this._elapsed >= GAME_HOUR_MS) {
      this._elapsed -= GAME_HOUR_MS
      this.gameHour++
      if (this.gameHour >= 32) this.gameHour = 8 // loop back to morning
      this._checkPeriodChange()
    }
  }

  _checkPeriodChange() {
    const prev = this.currentPeriod
    this.currentPeriod = this._getPeriodForHour(this.gameHour)
    if (prev !== this.currentPeriod) {
      this._listeners.forEach(cb => cb(this.currentPeriod, prev))
    }
  }

  _getPeriodForHour(hour) {
    for (const [period, range] of Object.entries(TIME_RANGES)) {
      if (hour >= range.start && hour < range.end) return period
    }
    return TIME_PERIODS.LATE_NIGHT
  }

  onPeriodChange(callback) {
    this._listeners.push(callback)
  }

  getDisplayTime() {
    const h = this.gameHour % 24
    return `${String(h).padStart(2, '0')}:00`
  }

  getPeriodLabel() {
    return TIME_RANGES[this.currentPeriod]?.label ?? 'Night'
  }

  getAmbientAlpha() {
    return TIME_RANGES[this.currentPeriod]?.ambientAlpha ?? 0
  }

  getSkyColor() {
    return TIME_RANGES[this.currentPeriod]?.skyColor ?? 0x1a1a2e
  }

  isActivityAvailable(activity) {
    return activity.timePeriods.includes(this.currentPeriod)
  }

  jumpToHour(hour) {
    this.gameHour = hour
    this._elapsed = 0
    const prev = this.currentPeriod
    this.currentPeriod = this._getPeriodForHour(hour)
    if (prev !== this.currentPeriod) {
      this._listeners.forEach(cb => cb(this.currentPeriod, prev))
    }
  }
}
