import '@babylonjs/core/Culling/Octrees/octreeSceneComponent.js'
import '@babylonjs/core/Collisions/collisionCoordinator.js'

import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js'
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture.js'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js'
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { Scene } from '@babylonjs/core/scene.js'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import { SkyMaterial } from '@babylonjs/materials/sky/skyMaterial.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'

import type { LevelOneEngine } from './create-level-one-engine'
import {
  DEFAULT_LEVEL_ONE_ASSETS,
  type LevelOneAssets,
  type ResolvedLevelOnePerformance,
} from './level-one-types'
import { loadKsqlAirport } from './world/load-ksql-airport'

export interface LevelOneWorldBounds {
  readonly maximumAltitude: number
  readonly maximumX: number
  readonly maximumZ: number
  readonly minimumAltitude: number
  readonly minimumX: number
  readonly minimumZ: number
}

export interface LevelOneWorld {
  bounds: LevelOneWorldBounds
  scene: Scene
  spawnPosition: Vector3
  spawnTarget: Vector3
  terrainHeightAt: (x: number, z: number) => number
  updateDistanceCulling: (cameraPosition: Vector3) => void
}

const KSQL_WORLD_BOUNDS: Readonly<LevelOneWorldBounds> = {
  maximumAltitude: 620,
  maximumX: 1_470,
  maximumZ: 1_390,
  minimumAltitude: 0,
  minimumX: -1_440,
  minimumZ: -1_390,
}

const KSQL_SPAWN_POSITION = new Vector3(-430, 105, 540)
const KSQL_SPAWN_TARGET = new Vector3(-460, 4, 1_100)

function createLighting(
  scene: Scene,
  settings: ResolvedLevelOnePerformance,
): ShadowGenerator | undefined {
  const ambient = new HemisphericLight(
    'airport-ambient-light',
    new Vector3(0.05, 1, 0.1),
    scene,
  )
  ambient.intensity = 0.9
  ambient.diffuse = new Color3(0.72, 0.81, 0.87)
  ambient.groundColor = new Color3(0.24, 0.27, 0.25)

  const sun = new DirectionalLight(
    'airport-sun',
    new Vector3(-0.42, -1, -0.3),
    scene,
  )
  sun.position.copyFromFloats(720, 980, 540)
  sun.intensity = 1.8
  sun.diffuse = new Color3(1, 0.93, 0.82)

  if (!settings.shadows) {
    return undefined
  }

  const shadows = new ShadowGenerator(
    settings.quality === 'high' ? 2_048 : 1_024,
    sun,
    true,
  )
  shadows.bias = 0.0008
  shadows.normalBias = 0.03
  shadows.usePercentageCloserFiltering = true
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM
  shadows.setDarkness(0.23)
  return shadows
}

function createSky(scene: Scene, renderDistance: number): void {
  const sky = MeshBuilder.CreateSphere(
    'airport-sky',
    {
      diameter: Math.max(4_200, renderDistance * 2.2),
      segments: 24,
      sideOrientation: Mesh.BACKSIDE,
    },
    scene,
  )
  const material = new SkyMaterial('airport-sky-material', scene)
  material.backFaceCulling = false
  material.turbidity = 3.6
  material.rayleigh = 1.35
  material.mieCoefficient = 0.004
  material.mieDirectionalG = 0.82
  material.luminance = 0.92
  material.inclination = 0.42
  material.azimuth = 0.18

  sky.material = material
  sky.infiniteDistance = true
  sky.isPickable = false
  sky.applyFog = false
  sky.freezeWorldMatrix()
}

function createWorldBoundaries(scene: Scene, bounds: LevelOneWorldBounds): void {
  const width = bounds.maximumX - bounds.minimumX
  const depth = bounds.maximumZ - bounds.minimumZ
  const centerX = (bounds.minimumX + bounds.maximumX) / 2
  const centerZ = (bounds.minimumZ + bounds.maximumZ) / 2
  const centerY = (bounds.minimumAltitude + bounds.maximumAltitude) / 2
  const boundaryHeight = bounds.maximumAltitude - bounds.minimumAltitude
  const walls = [
    {
      depth,
      height: boundaryHeight,
      width: 8,
      x: bounds.minimumX,
      z: centerZ,
    },
    {
      depth,
      height: boundaryHeight,
      width: 8,
      x: bounds.maximumX,
      z: centerZ,
    },
    {
      depth: 8,
      height: boundaryHeight,
      width,
      x: centerX,
      z: bounds.minimumZ,
    },
    {
      depth: 8,
      height: boundaryHeight,
      width,
      x: centerX,
      z: bounds.maximumZ,
    },
  ]

  for (const [index, wall] of walls.entries()) {
    const boundary = MeshBuilder.CreateBox(
      `airport-world-boundary-${index + 1}`,
      { depth: wall.depth, height: wall.height, width: wall.width },
      scene,
    )
    boundary.position.copyFromFloats(wall.x, centerY, wall.z)
    boundary.checkCollisions = true
    boundary.isPickable = false
    boundary.visibility = 0
    boundary.freezeWorldMatrix()
  }

  const ceiling = MeshBuilder.CreateBox(
    'airport-world-ceiling',
    { depth, height: 8, width },
    scene,
  )
  ceiling.position.copyFromFloats(centerX, bounds.maximumAltitude, centerZ)
  ceiling.checkCollisions = true
  ceiling.isPickable = false
  ceiling.visibility = 0
  ceiling.freezeWorldMatrix()
}

function applyOptionalEnvironment(
  scene: Scene,
  environmentTextureUrl?: string,
): void {
  if (!environmentTextureUrl) {
    return
  }

  const texture = CubeTexture.CreateFromPrefilteredData(
    environmentTextureUrl,
    scene,
  )
  scene.environmentTexture = texture
  scene.environmentIntensity = 0.7
}

export async function createLevelOneScene(
  engine: LevelOneEngine,
  settings: ResolvedLevelOnePerformance,
  assets: LevelOneAssets,
): Promise<LevelOneWorld> {
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.55, 0.7, 0.78, 1)
  scene.ambientColor = new Color3(0.16, 0.18, 0.18)
  scene.collisionsEnabled = true
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = new Color3(0.62, 0.72, 0.76)
  scene.fogStart = settings.renderDistance * 0.72
  scene.fogEnd = settings.renderDistance
  scene.skipPointerMovePicking = true

  const imageProcessing = scene.imageProcessingConfiguration
  imageProcessing.contrast = 1.06
  imageProcessing.exposure = 1.08
  imageProcessing.toneMappingEnabled = true
  imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
  imageProcessing.vignetteEnabled = true
  imageProcessing.vignetteWeight = 0.72
  imageProcessing.vignetteColor = new Color4(0.03, 0.05, 0.06, 0)

  applyOptionalEnvironment(scene, assets.environmentTextureUrl)
  createSky(scene, settings.renderDistance)
  const shadows = createLighting(scene, settings)
  const worldAsset = assets.world ?? DEFAULT_LEVEL_ONE_ASSETS.world

  if (!worldAsset) {
    throw new Error('Level 1 requires a terrain and buildings world asset.')
  }

  await loadKsqlAirport(scene, worldAsset, shadows)
  createWorldBoundaries(scene, KSQL_WORLD_BOUNDS)
  scene.createOrUpdateSelectionOctree(32, 3)

  return {
    bounds: KSQL_WORLD_BOUNDS,
    scene,
    spawnPosition: KSQL_SPAWN_POSITION.clone(),
    spawnTarget: KSQL_SPAWN_TARGET.clone(),
    terrainHeightAt: () => 0,
    updateDistanceCulling: () => undefined,
  }
}
