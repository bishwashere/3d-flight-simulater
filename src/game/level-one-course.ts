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
  insideLandingZone: boolean
  onGround: boolean
  position: CourseVector
  speed: number
  verticalSpeed: number
}

export type LevelOneCourseEvent =
  | { score: number; type: 'checkpoint' }
  | { score: number; type: 'complete' }

export interface LevelOneCourseSnapshot {
  checkpointCount: number
  checkpointDistance: number
  checkpointIndex: number
  objective: string
  phase: LevelOneGamePhase
  score: number
}

const CHECKPOINT_SCORE = 150
const LANDING_SCORE = 600

function distance(left: CourseVector, right: CourseVector): number {
  return Math.hypot(
    left.x - right.x,
    left.y - right.y,
    left.z - right.z,
  )
}

export class LevelOneCourse {
  private checkpointIndex = 0
  private readonly checkpoints: readonly LevelOneCourseCheckpoint[]
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
    this.checkpointIndex = 0
    this.phase = 'ready'
    this.score = 0
  }

  update(frame: LevelOneCourseFrame): LevelOneCourseEvent | undefined {
    if (this.phase !== 'playing') {
      return undefined
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
      checkpointCount: this.checkpoints.length,
      checkpointDistance,
      checkpointIndex: this.checkpointIndex,
      objective,
      phase: this.phase,
      score: this.score,
    }
  }
}
