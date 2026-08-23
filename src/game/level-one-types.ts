export type LevelOneQuality = 'low' | 'medium' | 'high'

export interface LevelOnePerformanceSettings {
  /** Dynamically lowers internal resolution when frame rate is below target. */
  adaptiveResolution?: boolean
  /** Enables the directional-light shadow map. */
  shadows?: boolean
  /** Maximum camera and fog distance in world metres. */
  renderDistance?: number
  /** Fraction of the preset's native pixel density, from 0.5 to 1. */
  resolutionScale?: number
  /** Geometry, shadow, cloud and vegetation density preset. */
  quality?: LevelOneQuality
  /** Adaptive-resolution target. */
  targetFps?: 30 | 45 | 60
  /** Multiplier for procedural vegetation density, from 0.25 to 1.5. */
  vegetationDensity?: number
}

export interface LevelOneModelAsset {
  /** Optional collision for architectural or ground-level assets. */
  collisions?: boolean
  /** A direct .glb/.gltf URL. Failed downloads are ignored. */
  url: string
  maxDistance?: number
  position?: readonly [number, number, number]
  rotationY?: number
  scaling?: number | readonly [number, number, number]
  snapToTerrain?: boolean
}

export interface LevelOnePbrTextureSet {
  albedoUrl?: string
  normalUrl?: string
  roughnessUrl?: string
  uScale?: number
  vScale?: number
}

export interface LevelOneMaterialTextures {
  asphalt?: LevelOnePbrTextureSet
  building?: LevelOnePbrTextureSet
  concrete?: LevelOnePbrTextureSet
  grass?: LevelOnePbrTextureSet
  metal?: LevelOnePbrTextureSet
  rock?: LevelOnePbrTextureSet
  sand?: LevelOnePbrTextureSet
  terrain?: LevelOnePbrTextureSet
  waterNormalUrl?: string
}

export interface LevelOneWorldAsset {
  /** Static airport/city geometry exported as glTF. */
  buildingsUrl: string
  /** Textured ground, water, roads and runway exported as glTF. */
  terrainUrl: string
}

export interface LevelOneAssets {
  /** Optional Babylon .env file. The procedural sky remains the fallback. */
  environmentTextureUrl?: string
  /** Optional grayscale height map used for the small offshore islet. */
  heightMapUrl?: string
  /** Real projected map feature data used by the Level 1 world renderer. */
  mapDataUrl?: string
  /** Optional glTF additions. Every model is isolated behind graceful loading. */
  models?: readonly LevelOneModelAsset[]
  /** Swappable local PBR texture groups for the procedural world palette. */
  materialTextures?: LevelOneMaterialTextures
  /** Repeated terrain albedo. A generated material color remains the fallback. */
  terrainTextureUrl?: string
  /** Coherent downloadable world pack used by the Level 1 renderer. */
  world?: LevelOneWorldAsset
}

export type LevelOneBackend = 'webgl2' | 'webgpu'

export interface LevelOneTelemetry {
  altitude: number
  backend: LevelOneBackend
  fps: number
  meshCount: number
  pointerLocked: boolean
  renderScale: number
  speed: number
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

export const DEFAULT_LEVEL_ONE_ASSETS: Readonly<LevelOneAssets> = {
  world: {
    buildingsUrl: '/assets/world/ksql-airport/ksql-buildings.glb',
    terrainUrl: '/assets/world/ksql-airport/ksql-terrain.glb',
  },
}

export const EMPTY_LEVEL_ONE_TELEMETRY: Readonly<LevelOneTelemetry> = {
  altitude: 0,
  backend: 'webgl2',
  fps: 0,
  meshCount: 0,
  pointerLocked: false,
  renderScale: 1,
  speed: 0,
}
