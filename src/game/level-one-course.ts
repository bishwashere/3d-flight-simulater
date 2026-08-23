import type { LevelOneGamePhase } from './level-one-types'

export interface CourseVector {
  x: number
  y: number
  z: number
}

export interface LevelOneCourseCheckpoint {
  position: CourseVector
  radius: number
}

export interface LevelOneCourseFrame {
  airborne: boolean
  deltaSeconds: number
  insideLandingZone: boolean
  onGround: boolean
  position: CourseVector
  speed: number
  verticalSpeed: number
}

export type LevelOneCourseEvent =
  | { score: number; type: 'checkpoint' }
  | { coinId: string; points: number; score: number; type: 'coin' }
  | { score: number; type: 'complete' }

export interface LevelOneCourseSnapshot {
  airborneSeconds: number
  airtimeScore: number
  checkpointCount: number
  checkpointDistance: number
  checkpointIndex: number
  coinScore: number
  coinsCollected: number
  objective: string
  phase: LevelOneGamePhase
  score: number
}

const AIRTIME_SCORE_INTERVAL_SECONDS = 3
const AIRTIME_SCORE_ROUNDING_TOLERANCE_SECONDS = 1e-9
const CHECKPOINT_SCORE = 150
const COIN_SCORE = 25
const LANDING_SCORE = 600

function distance(left: CourseVector, right: CourseVector): number {
  return Math.hypot(
    left.x - right.x,
    left.y - right.y,
    left.z - right.z,
  )
}

export class LevelOneCourse {
  private airborneSeconds = 0
  private airtimeScore = 0
  private checkpointIndex = 0
  private readonly checkpoints: readonly LevelOneCourseCheckpoint[]
  private coinScore = 0
  private readonly collectedCoinIds = new Set<string>()
  private phase: LevelOneGamePhase = 'ready'
  private score = 0

  constructor(checkpoints: readonly LevelOneCourseCheckpoint[]) {
    this.checkpoints = checkpoints
  }

  start(): void {
    if (this.phase === 'ready') {
      this.phase = 'playing'
    }
  }

  crash(): void {
    if (this.phase !== 'complete') {
      this.phase = 'crashed'
    }
  }

  reset(): void {
    this.airborneSeconds = 0
    this.airtimeScore = 0
    this.checkpointIndex = 0
    this.coinScore = 0
    this.collectedCoinIds.clear()
    this.phase = 'ready'
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

    if (
      frame.airborne &&
      Number.isFinite(frame.deltaSeconds) &&
      frame.deltaSeconds > 0
    ) {
      this.airborneSeconds += frame.deltaSeconds
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

    const checkpoint = this.checkpoints[this.checkpointIndex]
    if (checkpoint && distance(frame.position, checkpoint.position) <= checkpoint.radius) {
      this.checkpointIndex += 1
      this.score += CHECKPOINT_SCORE
      return { score: this.score, type: 'checkpoint' }
    }

    if (
      this.checkpointIndex === this.checkpoints.length &&
      frame.insideLandingZone &&
      frame.onGround &&
      frame.speed <= 20 &&
      Math.abs(frame.verticalSpeed) <= 3.5
    ) {
      const smoothLandingBonus = Math.max(
        0,
        Math.round((3.5 - Math.abs(frame.verticalSpeed)) * 40),
      )
      this.score += LANDING_SCORE + smoothLandingBonus
      this.phase = 'complete'
      return { score: this.score, type: 'complete' }
    }

    return undefined
  }

  getSnapshot(position: CourseVector): LevelOneCourseSnapshot {
    const checkpoint = this.checkpoints[this.checkpointIndex]
    const checkpointDistance = this.phase === 'playing' && checkpoint
      ? distance(position, checkpoint.position)
      : 0

    let objective = 'START ENGINE  [I]'
    if (this.phase === 'playing') {
      objective = checkpoint
        ? `CHECKPOINT ${this.checkpointIndex + 1}`
        : 'LAND ON THE RUNWAY'
    } else if (this.phase === 'crashed') {
      objective = 'RESTART  [R]'
    } else if (this.phase === 'complete') {
      objective = 'COURSE COMPLETE'
    }

    return {
      airborneSeconds: this.airborneSeconds,
      airtimeScore: this.airtimeScore,
      checkpointCount: this.checkpoints.length,
      checkpointDistance,
      checkpointIndex: this.checkpointIndex,
      coinScore: this.coinScore,
      coinsCollected: this.collectedCoinIds.size,
      objective,
      phase: this.phase,
      score: this.score,
    }
  }
}
