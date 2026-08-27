import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import type { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import type { Scene } from '@babylonjs/core/scene.js'

import type {
  GameLevelCheckpointPosition,
  GameLevelTheme,
} from '../../config/game-levels'

export type GeometricWorldQuality = 'low' | 'medium' | 'high'

export type GeometricCheckpointState = 'active' | 'collected' | 'pending'

export type GeometricObstacleKind =
  | 'balloon'
  | 'building'
  | 'bridge'
  | 'hill'
  | 'rock'
  | 'tower'

export interface GeometricWorldOptions {
  checkpointPositions?: readonly GameLevelCheckpointPosition[]
  quality?: GeometricWorldQuality
  shadowGenerator?: ShadowGenerator
  theme?: GameLevelTheme
  /** Zero-based checkpoint index surrounded by the optional tower gate. */
  towerGateCheckpointIndex?: number
  vegetationCount?: number
}

export interface GeometricAircraftAnimationState {
  engineRunning: boolean
  gearRetraction: number
  pitch: number
  roll: number
  throttle: number
  yaw: number
}

export interface GeometricAircraftVisual {
  readonly root: TransformNode
  readonly cockpitAnchor: TransformNode
  readonly chaseAnchor: TransformNode
  readonly noseAnchor: TransformNode
  setCrashState: (crashed: boolean) => void
  updateAnimations: (
    state: GeometricAircraftAnimationState,
    deltaSeconds: number,
  ) => void
}

export interface GeometricCheckpoint {
  readonly index: number
  readonly position: Vector3
  readonly radius: number
  readonly root: TransformNode
  readonly state: GeometricCheckpointState
  setState: (state: GeometricCheckpointState) => void
  update: (elapsedSeconds: number) => void
}

export interface GeometricCoin {
  readonly id: string
  readonly index: number
  readonly position: Vector3
  readonly radius: number
  readonly root: TransformNode
  readonly value: number
  readonly collected: boolean
  /** Returns true only for the first collection before a reset. */
  collect: () => boolean
  reset: () => void
  update: (elapsedSeconds: number) => void
}

export interface GeometricObstacleCollider {
  readonly center: Vector3
  readonly halfExtents?: Vector3
  readonly kind: GeometricObstacleKind
  readonly radius: number
}

export interface GeometricLandingZone {
  readonly center: Vector3
  readonly elevation: number
  /** Runway direction in radians, with zero facing Babylon's +Z axis. */
  readonly headingRadians: number
  readonly halfLength: number
  readonly halfWidth: number
}

export interface GeometricWorldBounds {
  readonly maximumAltitude: number
  readonly maximumX: number
  readonly maximumZ: number
  readonly minimumAltitude: number
  readonly minimumX: number
  readonly minimumZ: number
}

export interface GeometricWorld {
  readonly aircraft: GeometricAircraftVisual
  readonly bounds: GeometricWorldBounds
  readonly checkpoints: readonly GeometricCheckpoint[]
  readonly coins: readonly GeometricCoin[]
  readonly landingZone: GeometricLandingZone
  readonly obstacles: readonly GeometricObstacleCollider[]
  readonly scene: Scene
  readonly spawnPosition: Vector3
  readonly spawnRotation: Quaternion
  clearCrashEffects: () => void
  dispose: () => void
  resetCoins: () => void
  showCrashEffects: (position: Vector3, velocity?: Vector3) => void
  terrainHeightAt: (x: number, z: number) => number
  update: (elapsedSeconds: number, deltaSeconds: number) => void
}
