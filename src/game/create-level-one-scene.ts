import { GlowLayer } from '@babylonjs/core/Layers/glowLayer.js'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration.js'
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { Scene } from '@babylonjs/core/scene.js'
import { SkyMaterial } from '@babylonjs/materials/sky/skyMaterial.js'

import type { LevelOneEngine } from './create-level-one-engine'
import type {
  LevelOneAssets,
  ResolvedLevelOnePerformance,
} from './level-one-types'
import { createGeometricWorld } from './world/create-geometric-world'
import type { GeometricWorld } from './world/geometric-world-types'

export type LevelOneWorld = GeometricWorld

function createLighting(
  scene: Scene,
  settings: ResolvedLevelOnePerformance,
): ShadowGenerator | undefined {
  const ambient = new HemisphericLight(
    'island-ambient-light',
    new Vector3(0.1, 1, 0.18),
    scene,
  )
  ambient.intensity = 0.82
  ambient.diffuse = new Color3(0.73, 0.9, 1)
  ambient.groundColor = new Color3(0.22, 0.3, 0.2)

  const sun = new DirectionalLight(
    'island-sun',
    new Vector3(-0.44, -1, -0.32),
    scene,
  )
  sun.position.copyFromFloats(520, 760, 380)
  sun.intensity = 2.15
  sun.diffuse = new Color3(1, 0.91, 0.76)

  if (!settings.shadows) {
    return undefined
  }

  const shadowMapSize = settings.quality === 'high' ? 2_048 : 1_024
  const shadows = new ShadowGenerator(shadowMapSize, sun, true)
  shadows.bias = 0.0008
  shadows.normalBias = 0.025
  shadows.usePercentageCloserFiltering = true
  shadows.filteringQuality =
    settings.quality === 'high'
      ? ShadowGenerator.QUALITY_HIGH
      : ShadowGenerator.QUALITY_MEDIUM
  shadows.setDarkness(0.22)
  return shadows
}

function createSky(
  scene: Scene,
  renderDistance: number,
  highQuality: boolean,
): void {
  const sky = MeshBuilder.CreateSphere(
    'island-sky',
    {
      diameter: Math.max(3_600, renderDistance * 2.25),
      segments: highQuality ? 24 : 16,
      sideOrientation: Mesh.BACKSIDE,
    },
    scene,
  )
  const material = new SkyMaterial('island-sky-material', scene)
  material.backFaceCulling = false
  material.turbidity = 3.1
  material.rayleigh = 1.25
  material.mieCoefficient = 0.0045
  material.mieDirectionalG = 0.84
  material.luminance = 0.95
  material.inclination = 0.18
  material.azimuth = 0.19

  sky.material = material
  sky.infiniteDistance = true
  sky.isPickable = false
  sky.applyFog = false
  sky.freezeWorldMatrix()
}

function applyOptionalEnvironment(
  scene: Scene,
  environmentTextureUrl?: string,
): void {
  if (!environmentTextureUrl) {
    return
  }

  scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(
    environmentTextureUrl,
    scene,
  )
  scene.environmentIntensity = 0.68
}

export async function createLevelOneScene(
  engine: LevelOneEngine,
  settings: ResolvedLevelOnePerformance,
  assets: LevelOneAssets,
): Promise<LevelOneWorld> {
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.48, 0.75, 0.91, 1)
  scene.ambientColor = new Color3(0.15, 0.2, 0.22)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = new Color3(0.64, 0.81, 0.88)
  scene.fogStart = settings.renderDistance * 0.68
  scene.fogEnd = settings.renderDistance
  scene.skipPointerMovePicking = true

  const imageProcessing = scene.imageProcessingConfiguration
  imageProcessing.contrast = 1.12
  imageProcessing.exposure = 1.08
  imageProcessing.toneMappingEnabled = true
  imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
  imageProcessing.vignetteEnabled = false

  applyOptionalEnvironment(scene, assets.environmentTextureUrl)
  createSky(scene, settings.renderDistance, settings.quality === 'high')
  const shadowGenerator = createLighting(scene, settings)

  const glow = new GlowLayer('island-game-glow', scene, {
    blurKernelSize: settings.quality === 'low' ? 16 : 32,
  })
  glow.intensity = settings.quality === 'low' ? 0.22 : 0.38

  return createGeometricWorld(scene, {
    quality: settings.quality,
    shadowGenerator,
    vegetationCount: settings.vegetationCount,
  })
}
