import '@babylonjs/core/Meshes/instancedMesh.js'

import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import type { Scene } from '@babylonjs/core/scene.js'

import type { GeometricWorldMaterials } from './geometric-world-materials'
import type { GeometricCoin } from './geometric-world-types'

interface GeometricCoinSpec {
  id: string
  position: readonly [x: number, y: number, z: number]
  value?: number
}

export interface GeometricCoinContext {
  materials: GeometricWorldMaterials
  root: TransformNode
  scene: Scene
  shadowGenerator?: ShadowGenerator
}

/**
 * A light trail sketches the main island circuit while the higher-value coins
 * reward detours through recognizable landmarks.
 */
export const GEOMETRIC_COIN_SPECS: readonly GeometricCoinSpec[] = [
  { id: 'runway-roll', position: [-610, 6, -300] },
  { id: 'runway-climb-1', position: [-610, 30, 200] },
  { id: 'runway-climb-2', position: [-610, 48, 325] },
  { id: 'west-turn-1', position: [-535, 70, 450] },
  { id: 'west-turn-2', position: [-410, 94, 575] },
  { id: 'north-ridge-1', position: [-170, 120, 670] },
  { id: 'north-ridge-2', position: [100, 140, 710] },
  { id: 'north-ridge-3', position: [360, 150, 680] },
  { id: 'east-turn-1', position: [570, 154, 620] },
  { id: 'east-turn-2', position: [690, 136, 440] },
  { id: 'east-coast-1', position: [735, 110, 125] },
  { id: 'east-coast-2', position: [735, 93, -180] },
  { id: 'south-turn-1', position: [625, 84, -390] },
  { id: 'south-turn-2', position: [420, 76, -530] },
  { id: 'south-coast-1', position: [160, 69, -660] },
  { id: 'south-coast-2', position: [-160, 60, -720] },
  { id: 'airport-return', position: [-430, 51, -758] },
  { id: 'tower-crown', position: [-195, 94, 95], value: 50 },
  { id: 'city-canyon', position: [55, 42, -70], value: 50 },
  { id: 'crane-tip', position: [380, 120, 170], value: 50 },
  { id: 'lagoon-bridge', position: [475, 42, -285], value: 50 },
  { id: 'lagoon-islet', position: [385, 28, -285], value: 50 },
  { id: 'mountain-crown', position: [360, 265, 690], value: 75 },
] as const

const COIN_RADIUS = 7
const COIN_BOB_AMPLITUDE = 1.15
const COIN_SPIN_SPEED = 1.8

export function createGeometricCoins(
  context: GeometricCoinContext,
): GeometricCoin[] {
  const collectionRoot = new TransformNode('coin-collection-root', context.scene)
  collectionRoot.parent = context.root

  // The hidden sources retain one copy of each geometry; every visible coin is
  // a hardware instance with its own small animated transform node.
  const bodySource = MeshBuilder.CreateCylinder(
    'coin-body-source',
    { diameter: 5.8, height: 0.72, tessellation: 12 },
    context.scene,
  )
  bodySource.parent = collectionRoot
  bodySource.material = context.materials.coinGold
  bodySource.isPickable = false
  bodySource.isVisible = false

  const rimSource = MeshBuilder.CreateTorus(
    'coin-rim-source',
    { diameter: 5.9, thickness: 0.52, tessellation: 12 },
    context.scene,
  )
  rimSource.parent = collectionRoot
  rimSource.material = context.materials.runwayMarking
  rimSource.isPickable = false
  rimSource.isVisible = false

  return GEOMETRIC_COIN_SPECS.map((spec, index) => {
    const position = Vector3.FromArray(spec.position)
    const value = spec.value ?? 25
    const scale = value >= 75 ? 1.35 : value >= 50 ? 1.18 : 1
    const root = new TransformNode(`coin-${spec.id}`, context.scene)
    root.parent = collectionRoot
    root.position.copyFrom(position)
    root.scaling.copyFromFloats(scale, scale, scale)

    const body = bodySource.createInstance(`coin-body-${spec.id}`)
    body.parent = root
    body.rotation.x = Math.PI / 2
    body.isPickable = false
    body.isVisible = true

    const rim = rimSource.createInstance(`coin-rim-${spec.id}`)
    rim.parent = root
    rim.rotation.x = Math.PI / 2
    rim.isPickable = false
    rim.isVisible = true

    let collected = false
    const phase = index * 1.618

    return {
      id: spec.id,
      index,
      position,
      radius: COIN_RADIUS,
      root,
      value,
      get collected(): boolean {
        return collected
      },
      collect(): boolean {
        if (collected) {
          return false
        }
        collected = true
        root.setEnabled(false)
        return true
      },
      reset(): void {
        collected = false
        root.position.copyFrom(position)
        root.rotation.copyFromFloats(0, 0, 0)
        root.scaling.copyFromFloats(scale, scale, scale)
        root.setEnabled(true)
      },
      update(elapsedSeconds): void {
        if (collected) {
          return
        }
        root.position.y =
          position.y + Math.sin(elapsedSeconds * 2.15 + phase) * COIN_BOB_AMPLITUDE
        root.rotation.y = elapsedSeconds * COIN_SPIN_SPEED + phase
      },
    }
  })
}
