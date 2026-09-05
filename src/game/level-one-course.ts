import type { LevelOneGamePhase } from './level-one-types'

export interface CourseVector {
  x: number
  y: number
  z: number
}

export interface LevelOneCourseFrame {
  airborne: boolean
  deltaSeconds: number
  insideLandingZone: boolean
  onGround: boolean
  position: CourseVector
  regionId: string
  speed: number
  verticalSpeed: number
}

export type LevelOneCourseEvent =
  | { coinId: string; points: number; score: number; type: 'coin' }
  | { regionId: string; score: number; type: 'region' }
  | { score: number; type: 'complete' }

export interface LevelOneCourseSnapshot {
  airborneSeconds: number
  airtimeScore: number
  coinScore: number
  coinsCollected: number
  distanceScore: number
  distanceTravelled: number
  explorationScore: number
  objective: string
  phase: LevelOneGamePhase
  regionsExplored: number
  score: number
}

const AIRTIME_SCORE_INTERVAL_SECONDS = 3
const AIRTIME_SCORE_ROUNDING_TOLERANCE_SECONDS = 1e-9
const DISTANCE_SCORE_INTERVAL_METERS = 100
const DISTANCE_SCORE_PER_INTERVAL = 10
const REGION_SCORE = 100
const COIN_SCORE = 25
const LANDING_SCORE = 500
const STOP_SPEED_METERS_PER_SECOND = 3.5

function horizontalDistance(left: CourseVector, right: CourseVector): number {
  return Math.hypot(left.x - right.x, left.z - right.z)
}

function isFiniteVector(vector: CourseVector): boolean {
  return [vector.x, vector.y, vector.z].every(Number.isFinite)
}

/**
 * Scorekeeper for one open-ended flight. There is no route to clear: time,
 * distance, discoveries and coins accumulate until the pilot lands on any
 * runway and brakes to a stop.
 */
export class LevelOneCourse {
  private airborneSeconds = 0
  private airtimeScore = 0
  private coinScore = 0
  private readonly collectedCoinIds = new Set<string>()
  private distanceScore = 0
  private distanceTravelled = 0
  private explorationScore = 0
  private readonly exploredRegionIds = new Set<string>()
  private hasBeenAirborne = false
  private landingVerticalSpeed: number | null = null
  private lastPosition: CourseVector | null = null
  private objective = 'TAKE OFF · EXPLORE ANY DIRECTION'
  private phase: LevelOneGamePhase = 'ready'
  private previouslyOnGround = true
  private score = 0

  start(): void {
    if (this.phase === 'ready') {
      this.phase = 'playing'
      this.objective = 'TAKE OFF · EXPLORE ANY DIRECTION'
    }
  }

  crash(): void {
    if (this.phase !== 'complete') {
      this.phase = 'crashed'
      this.objective = 'RESTART  [R]'
    }
  }

  reset(): void {
    this.airborneSeconds = 0
    this.airtimeScore = 0
    this.coinScore = 0
    this.collectedCoinIds.clear()
    this.distanceScore = 0
    this.distanceTravelled = 0
    this.explorationScore = 0
    this.exploredRegionIds.clear()
    this.hasBeenAirborne = false
    this.landingVerticalSpeed = null
    this.lastPosition = null
    this.objective = 'TAKE OFF · EXPLORE ANY DIRECTION'
    this.phase = 'ready'
    this.previouslyOnGround = true
    this.score = 0
  }

  collectCoin(
    coinId: string,
    points = COIN_SCORE,
  ): LevelOneCourseEvent | undefined {
    if (this.phase !== 'playing') {
      return undefined
    }

    const normalizedCoinId = coinId.trim()
    if (!normalizedCoinId) {
      throw new TypeError('Coin IDs must not be empty.')
    }
    if (!Number.isSafeInteger(points) || points <= 0) {
      throw new RangeError('Coin points must be a positive safe integer.')
    }
    if (this.collectedCoinIds.has(normalizedCoinId)) {
      return undefined
    }

    this.collectedCoinIds.add(normalizedCoinId)
    this.coinScore += points
    this.score += points

    return {
      coinId: normalizedCoinId,
      points,
      score: this.score,
      type: 'coin',
    }
  }

  update(frame: LevelOneCourseFrame): LevelOneCourseEvent | undefined {
    if (this.phase !== 'playing') {
      return undefined
    }

    const deltaSeconds =
      Number.isFinite(frame.deltaSeconds) && frame.deltaSeconds > 0
        ? frame.deltaSeconds
        : 0

    if (frame.airborne) {
      this.hasBeenAirborne = true
      this.airborneSeconds += deltaSeconds
      const earnedAirtimeScore = Math.floor(
        (this.airborneSeconds + AIRTIME_SCORE_ROUNDING_TOLERANCE_SECONDS) /
          AIRTIME_SCORE_INTERVAL_SECONDS,
      )
      const newPoints = earnedAirtimeScore - this.airtimeScore
      if (newPoints > 0) {
        this.airtimeScore = earnedAirtimeScore
        this.score += newPoints
      }
    }

    if (isFiniteVector(frame.position)) {
      if (this.lastPosition && frame.airborne) {
        const travelled = horizontalDistance(frame.position, this.lastPosition)
        if (Number.isFinite(travelled) && travelled < 500) {
          this.distanceTravelled += travelled
          const earnedDistanceScore =
            Math.floor(
              this.distanceTravelled / DISTANCE_SCORE_INTERVAL_METERS,
            ) * DISTANCE_SCORE_PER_INTERVAL
          const newPoints = earnedDistanceScore - this.distanceScore
          if (newPoints > 0) {
            this.distanceScore = earnedDistanceScore
            this.score += newPoints
          }
        }
      }
      this.lastPosition = { ...frame.position }
    }

    let regionEvent: LevelOneCourseEvent | undefined
    const regionId = frame.regionId.trim()
    if (regionId && !this.exploredRegionIds.has(regionId)) {
      const firstRegion = this.exploredRegionIds.size === 0
      this.exploredRegionIds.add(regionId)
      if (!firstRegion) {
        this.explorationScore += REGION_SCORE
        this.score += REGION_SCORE
        regionEvent = { regionId, score: this.score, type: 'region' }
      }
    }

    if (
      !this.previouslyOnGround &&
      frame.onGround &&
      frame.insideLandingZone
    ) {
      this.landingVerticalSpeed = Math.abs(frame.verticalSpeed)
    }
    if (!frame.onGround) {
      this.landingVerticalSpeed = null
    }
    this.previouslyOnGround = frame.onGround

    if (
      this.hasBeenAirborne &&
      frame.insideLandingZone &&
      frame.onGround &&
      frame.speed <= STOP_SPEED_METERS_PER_SECOND
    ) {
      const touchdownSpeed = this.landingVerticalSpeed ?? Math.abs(frame.verticalSpeed)
      const smoothLandingBonus = Math.max(
        0,
        Math.round((3.5 - Math.min(3.5, touchdownSpeed)) * 40),
      )
      this.score += LANDING_SCORE + smoothLandingBonus
      this.phase = 'complete'
      this.objective = 'FLIGHT SCORE BANKED'
      return { score: this.score, type: 'complete' }
    }

    this.objective = !this.hasBeenAirborne
      ? 'TAKE OFF · EXPLORE ANY DIRECTION'
      : frame.insideLandingZone && frame.onGround
        ? 'HOLD B TO STOP AND BANK SCORE'
        : 'EXPLORE FREELY · LAND AT ANY RUNWAY'

    return regionEvent
  }

  getSnapshot(): LevelOneCourseSnapshot {
    return {
      airborneSeconds: this.airborneSeconds,
      airtimeScore: this.airtimeScore,
      coinScore: this.coinScore,
      coinsCollected: this.collectedCoinIds.size,
      distanceScore: this.distanceScore,
      distanceTravelled: this.distanceTravelled,
      explorationScore: this.explorationScore,
      objective: this.objective,
      phase: this.phase,
      regionsExplored: this.exploredRegionIds.size,
      score: this.score,
    }
  }
}
