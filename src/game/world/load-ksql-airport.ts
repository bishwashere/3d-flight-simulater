import '@babylonjs/loaders/glTF/index.js'

import { Color3 } from '@babylonjs/core/Maths/math.color.js'
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js'
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader.js'

import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js'
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import type { ISceneLoaderAsyncResult } from '@babylonjs/core/Loading/sceneLoader.js'
import type { Scene } from '@babylonjs/core/scene.js'

import type { LevelOneWorldAsset } from '../level-one-types'

const MAP_VERTICAL_OFFSET = -3.5

const BUILDING_COLORS = {
  brick: '#8d6f61',
  commercial: '#a9a7a0',
  concrete: '#888e8e',
  glass: '#526d78',
  metal: '#717b7e',
  plaster: '#b7ad9d',
  residential: '#9d8778',
} as const

function configureImportedMeshes(
  result: ISceneLoaderAsyncResult,
  collisions: boolean,
  shadows?: ShadowGenerator,
): AbstractMesh {
  const root = result.meshes.find((mesh) => mesh.parent === null) ?? result.meshes[0]

  if (!root) {
    throw new Error('The KSQL airport asset did not contain a scene root.')
  }

  root.position.y += MAP_VERTICAL_OFFSET

  for (const mesh of result.meshes) {
    const hasGeometry = mesh.getTotalVertices() > 0
    mesh.checkCollisions = collisions && hasGeometry
    mesh.isPickable = false
    mesh.receiveShadows = hasGeometry

    if (hasGeometry && shadows) {
      shadows.addShadowCaster(mesh)
    }

    mesh.freezeWorldMatrix()
  }

  return root
}

function tuneMapMaterials(scene: Scene): void {
  for (const material of scene.materials) {
    if (!(material instanceof PBRMaterial)) {
      continue
    }

    const materialName = material.name.toLowerCase()
    const colorEntry = Object.entries(BUILDING_COLORS).find(([key]) =>
      materialName.includes(key),
    )

    if (colorEntry) {
      material.albedoColor = Color3.FromHexString(colorEntry[1])
      material.metallic = materialName.includes('metal') ? 0.18 : 0
      material.roughness = materialName.includes('glass') ? 0.38 : 0.86
    } else if (materialName.includes('terrain')) {
      material.albedoColor.copyFromFloats(0.96, 0.96, 0.96)
      material.metallic = 0
      material.roughness = 0.94
    }

    material.freeze()
  }
}

export async function loadKsqlAirport(
  scene: Scene,
  asset: LevelOneWorldAsset,
  shadows?: ShadowGenerator,
): Promise<void> {
  const [terrain, buildings] = await Promise.all([
    ImportMeshAsync(asset.terrainUrl, scene),
    ImportMeshAsync(asset.buildingsUrl, scene),
  ])

  configureImportedMeshes(terrain, true)
  configureImportedMeshes(buildings, true, shadows)
  tuneMapMaterials(scene)
}
