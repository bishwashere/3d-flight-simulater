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

/** Reserved for future local asset packs. Level 1 currently uses only primitives. */
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
  altitude: number
  angleOfAttack: number
  backend: LevelOneBackend
  cameraMode: LevelOneCameraMode
  checkpointCount: number
  checkpointDistance: number
  checkpointIndex: number
  damage: number
  engineRunning: boolean
  fps: number
  heading: number
  meshCount: number
  objective: string
  onGround: boolean
  phase: LevelOneGamePhase
  pitch: number
  pointerLocked: boolean
  renderScale: number
  roll: number
  score: number
  speed: number
  stalled: boolean
  throttle: number
  verticalSpeed: number
}

export interface LevelOneGameStatus {
  phase: LevelOneGamePhase
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
  altitude: 0,
  angleOfAttack: 0,
  backend: 'webgl2',
  cameraMode: 'chase',
  checkpointCount: 0,
  checkpointDistance: 0,
  checkpointIndex: 0,
  damage: 0,
  engineRunning: false,
  fps: 0,
  heading: 0,
  meshCount: 0,
  objective: 'Start engine',
  onGround: true,
  phase: 'ready',
  pitch: 0,
  pointerLocked: false,
  renderScale: 1,
  roll: 0,
  score: 0,
  speed: 0,
  stalled: false,
  throttle: 0,
  verticalSpeed: 0,
}
