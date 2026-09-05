export type LevelOneQuality = 'low' | 'medium' | 'high'

export type LevelOneBackend = 'webgl2' | 'webgpu'

export type LevelOneCameraMode = 'cockpit' | 'chase'

export type LevelOneGamePhase =
  | 'ready'
  | 'playing'
  | 'crashed'
  | 'complete'

export interface LevelOnePerformanceSettings {
  /** Dynamically lowers internal resolution when frame rate is below target. */
  adaptiveResolution?: boolean
  /** Enables the directional-light shadow map. */
  shadows?: boolean
  /** Maximum camera and fog distance in world metres. */
  renderDistance?: number
  /** Fraction of the preset's native pixel density, from 0.5 to 1. */
  resolutionScale?: number
  /** Geometry, shadow and vegetation density preset. */
  quality?: LevelOneQuality
  /** Adaptive-resolution target. */
  targetFps?: 30 | 45 | 60
  /** Multiplier for procedural vegetation density, from 0 to 1. */
  vegetationDensity?: number
}

/** Reserved for future local asset packs. The world currently uses primitives. */
export interface LevelOneAssets {
  environmentTextureUrl?: string
}

export interface LevelOneControlInput {
  brakes: boolean
  pitch: number
  roll: number
  throttleDown: boolean
  throttleUp: boolean
  yaw: number
}

export interface LevelOneTelemetry {
  airborneSeconds: number
  altitude: number
  angleOfAttack: number
  airtimeScore: number
  backend: LevelOneBackend
  cameraMode: LevelOneCameraMode
  coinScore: number
  coinsCollected: number
  damage: number
  distanceScore: number
  distanceTravelled: number
  engineRunning: boolean
  explorationScore: number
  fps: number
  heading: number
  meshCount: number
  nearestRunwayDistance: number
  objective: string
  onGround: boolean
  phase: LevelOneGamePhase
  pitch: number
  pointerLocked: boolean
  powerReminder: boolean
  renderScale: number
  regionsExplored: number
  roll: number
  score: number
  speed: number
  stalled: boolean
  throttle: number
  verticalSpeed: number
}

export interface LevelOneGameStatus {
  airborneSeconds: number
  coinsCollected: number
  distanceTravelled: number
  phase: LevelOneGamePhase
  regionsExplored: number
  score: number
}

export interface ResolvedLevelOnePerformance {
  adaptiveResolution: boolean
  maxPixelRatio: number
  quality: LevelOneQuality
  renderDistance: number
  resolutionScale: number
  shadows: boolean
  targetFps: 30 | 45 | 60
  terrainSegments: number
  vegetationCount: number
}

export const DEFAULT_LEVEL_ONE_ASSETS: Readonly<LevelOneAssets> = {}

export const EMPTY_LEVEL_ONE_CONTROL_INPUT: Readonly<LevelOneControlInput> = {
  brakes: false,
  pitch: 0,
  roll: 0,
  throttleDown: false,
  throttleUp: false,
  yaw: 0,
}

export const EMPTY_LEVEL_ONE_TELEMETRY: Readonly<LevelOneTelemetry> = {
  airborneSeconds: 0,
  altitude: 0,
  angleOfAttack: 0,
  airtimeScore: 0,
  backend: 'webgl2',
  cameraMode: 'chase',
  coinScore: 0,
  coinsCollected: 0,
  damage: 0,
  distanceScore: 0,
  distanceTravelled: 0,
  engineRunning: false,
  explorationScore: 0,
  fps: 0,
  heading: 0,
  meshCount: 0,
  nearestRunwayDistance: 0,
  objective: 'Take off and explore',
  onGround: true,
  phase: 'ready',
  pitch: 0,
  pointerLocked: false,
  powerReminder: false,
  renderScale: 1,
  regionsExplored: 0,
  roll: 0,
  score: 0,
  speed: 0,
  stalled: false,
  throttle: 0,
  verticalSpeed: 0,
}
