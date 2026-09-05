import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import type { Scene } from '@babylonjs/core/scene.js'

import type { GeometricWorldMaterials } from './geometric-world-materials'
import type {
  GeometricCoin,
  GeometricLandingZone,
  GeometricObstacleCollider,
  GeometricWorldQuality,
} from './geometric-world-types'
import {
  PROCEDURAL_LAND_HEIGHT,
  type ProceduralRegionSpec,
  getProceduralTerrainHeight,
  isInsideProceduralRunway,
  proceduralRandom,
} from './procedural-regions'

export interface ProceduralRegionChunk {
  readonly coins: readonly GeometricCoin[]
  readonly landingZone: GeometricLandingZone
  readonly obstacles: readonly GeometricObstacleCollider[]
  readonly root: TransformNode
  dispose: () => void
  update: (elapsedSeconds: number) => void
}

interface ProceduralRegionContext {
  collectedCoinIds: ReadonlySet<string>
  materials: GeometricWorldMaterials
  quality: GeometricWorldQuality
  scene: Scene
  shadowGenerator?: ShadowGenerator
}

function finishMesh(
  mesh: Mesh,
  parent: TransformNode,
  context: ProceduralRegionContext,
  castsShadow = false,
): Mesh {
  mesh.parent = parent
  mesh.isPickable = false
  mesh.receiveShadows = true
  if (castsShadow) {
    context.shadowGenerator?.addShadowCaster(mesh)
  }
  mesh.freezeWorldMatrix()
  return mesh
}

function createIsland(
  context: ProceduralRegionContext,
  region: ProceduralRegionSpec,
  root: TransformNode,
): void {
  const sand = MeshBuilder.CreateCylinder(
    `${region.id}-sand`,
    { diameter: 2, height: 12, tessellation: 24 },
    context.scene,
  )
  sand.material = context.materials.sand
  sand.position.copyFromFloats(region.centerX, -4, region.centerZ)
  sand.scaling.copyFromFloats(region.radiusX * 1.06, 1, region.radiusZ * 1.06)
  finishMesh(sand, root, context)

  const land = MeshBuilder.CreateCylinder(
    `${region.id}-land`,
    { diameter: 2, height: 4, tessellation: 24 },
    context.scene,
  )
  land.material =
    (region.x + region.z) % 2 === 0
      ? context.materials.grass
      : context.materials.grassLight
  land.position.copyFromFloats(region.centerX, 0, region.centerZ)
  land.scaling.copyFromFloats(region.radiusX, 1, region.radiusZ)
  finishMesh(land, root, context)

  for (const [index, hill] of region.hills.entries()) {
    const mountain = MeshBuilder.CreateCylinder(
      `${region.id}-hill-${index + 1}`,
      {
        diameterBottom: hill.radius * 2,
        diameterTop: hill.radius * 0.18,
        height: hill.height,
        tessellation: context.quality === 'low' ? 7 : 10,
      },
      context.scene,
    )
    mountain.material =
      index === 0 ? context.materials.grass : context.materials.rock
    mountain.position.copyFromFloats(
      hill.x,
      PROCEDURAL_LAND_HEIGHT + hill.height / 2,
      hill.z,
    )
    mountain.rotation.y = proceduralRandom(region.x, region.z, 181 + index) * Math.PI
    finishMesh(mountain, root, context, true)
  }
}

function createRunway(
  context: ProceduralRegionContext,
  region: ProceduralRegionSpec,
  root: TransformNode,
): GeometricLandingZone {
  const runway = region.runway
  const surface = MeshBuilder.CreateBox(
    `${region.id}-runway`,
    { depth: runway.length, height: 0.7, width: runway.width },
    context.scene,
  )
  surface.material = context.materials.asphalt
  surface.position.copyFromFloats(
    runway.x,
    runway.elevation - 0.35,
    runway.z,
  )
  surface.rotation.y = runway.headingRadians
  finishMesh(surface, root, context)

  for (let index = -4; index <= 4; index += 1) {
    const along = index * (runway.length / 10)
    const marking = MeshBuilder.CreateBox(
      `${region.id}-runway-marking-${index + 5}`,
      { depth: 19, height: 0.06, width: 2.4 },
      context.scene,
    )
    marking.material = context.materials.runwayMarking
    marking.position.copyFromFloats(
      runway.x + Math.sin(runway.headingRadians) * along,
      runway.elevation + 0.04,
      runway.z + Math.cos(runway.headingRadians) * along,
    )
    marking.rotation.y = runway.headingRadians
    finishMesh(marking, root, context)
  }

  return {
    center: new Vector3(runway.x, runway.elevation, runway.z),
    elevation: runway.elevation,
    headingRadians: runway.headingRadians,
    halfLength: runway.length / 2 - 18,
    halfWidth: runway.width / 2 - 5,
    id: `${region.id}-runway`,
  }
}

function createCoin(
  context: ProceduralRegionContext,
  region: ProceduralRegionSpec,
  root: TransformNode,
  index: number,
): GeometricCoin {
  const id = `${region.id}:coin:${index + 1}`
  const angle =
    (index / 4) * Math.PI * 2 + proceduralRandom(region.x, region.z, 223) * 0.7
  const radialScale = 0.42 + proceduralRandom(region.x, region.z, 227 + index) * 0.13
  const x = region.centerX + Math.cos(angle) * region.radiusX * radialScale
  const z = region.centerZ + Math.sin(angle) * region.radiusZ * radialScale
  const position = new Vector3(
    x,
    getProceduralTerrainHeight(x, z) + 42 + index * 7,
    z,
  )
  const coinRoot = new TransformNode(id, context.scene)
  coinRoot.parent = root
  coinRoot.position.copyFrom(position)

  const body = MeshBuilder.CreateCylinder(
    `${id}-body`,
    { diameter: 5.8, height: 0.72, tessellation: 12 },
    context.scene,
  )
  body.parent = coinRoot
  body.material = context.materials.coinGold
  body.rotation.x = Math.PI / 2
  body.isPickable = false

  const rim = MeshBuilder.CreateTorus(
    `${id}-rim`,
    { diameter: 5.9, thickness: 0.52, tessellation: 12 },
    context.scene,
  )
  rim.parent = coinRoot
  rim.material = context.materials.runwayMarking
  rim.rotation.x = Math.PI / 2
  rim.isPickable = false

  const value = index === 3 ? 75 : index === 2 ? 50 : 25
  const phase = proceduralRandom(region.x, region.z, 241 + index) * Math.PI * 2
  let collected = false
  const coin: GeometricCoin = {
    id,
    index,
    position,
    radius: 7,
    root: coinRoot,
    value,
    get collected(): boolean {
      return collected
    },
    collect(): boolean {
      if (collected) {
        return false
      }
      collected = true
      coinRoot.setEnabled(false)
      return true
    },
    reset(): void {
      collected = false
      coinRoot.position.copyFrom(position)
      coinRoot.rotation.copyFromFloats(0, 0, 0)
      coinRoot.setEnabled(true)
    },
    update(elapsedSeconds): void {
      if (collected) {
        return
      }
      coinRoot.position.y = position.y + Math.sin(elapsedSeconds * 2.15 + phase) * 1.15
      coinRoot.rotation.y = elapsedSeconds * 1.8 + phase
    },
  }

  if (context.collectedCoinIds.has(id)) {
    coin.collect()
  }
  return coin
}

function createTrees(
  context: ProceduralRegionContext,
  region: ProceduralRegionSpec,
  root: TransformNode,
): void {
  const requestedCount = context.quality === 'high' ? 7 : context.quality === 'medium' ? 5 : 3
  for (let index = 0; index < requestedCount; index += 1) {
    const angle = proceduralRandom(region.x, region.z, 301 + index * 3) * Math.PI * 2
    const radius = 0.56 + proceduralRandom(region.x, region.z, 302 + index * 3) * 0.2
    const x = region.centerX + Math.cos(angle) * region.radiusX * radius
    const z = region.centerZ + Math.sin(angle) * region.radiusZ * radius
    if (isInsideProceduralRunway(x, z, region.runway, -18)) {
      continue
    }
    const height = 16 + proceduralRandom(region.x, region.z, 303 + index * 3) * 10
    const tree = MeshBuilder.CreateCylinder(
      `${region.id}-tree-${index + 1}`,
      {
        diameterBottom: 10,
        diameterTop: 0.4,
        height,
        tessellation: 7,
      },
      context.scene,
    )
    tree.material =
      index % 2 === 0
        ? context.materials.treeCanopy
        : context.materials.treeCanopyLight
    tree.position.copyFromFloats(
      x,
      getProceduralTerrainHeight(x, z) + height / 2,
      z,
    )
    finishMesh(tree, root, context, true)
  }
}

export function createProceduralRegionChunk(
  context: ProceduralRegionContext,
  region: ProceduralRegionSpec,
): ProceduralRegionChunk {
  const root = new TransformNode(`${region.id}-root`, context.scene)
  createIsland(context, region, root)
  const landingZone = createRunway(context, region, root)
  createTrees(context, region, root)
  const coins = Array.from({ length: 4 }, (_, index) =>
    createCoin(context, region, root, index),
  )
  let disposed = false

  return {
    coins,
    landingZone,
    obstacles: [],
    root,
    dispose(): void {
      if (disposed) {
        return
      }
      disposed = true
      root.dispose(false)
    },
    update(elapsedSeconds): void {
      for (const coin of coins) {
        coin.update(elapsedSeconds)
      }
    },
  }
}
