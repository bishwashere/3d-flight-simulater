import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import type { Scene } from '@babylonjs/core/scene.js'

import type { GeometricWorldMaterials } from './geometric-world-materials'
import type {
  GeometricObstacleCollider,
  GeometricWorldQuality,
} from './geometric-world-types'

export interface GeometricCourseContext {
  materials: GeometricWorldMaterials
  obstacles: GeometricObstacleCollider[]
  root: TransformNode
  scene: Scene
  shadowGenerator?: ShadowGenerator
}

export interface GeometricBobbingNode {
  amplitude: number
  baseY: number
  collider?: GeometricObstacleCollider
  phase: number
  root: TransformNode
  speed: number
}

export function createGeometricBalloons(
  context: GeometricCourseContext,
): GeometricBobbingNode[] {
  const specs = [
    { amplitude: 5, phase: 0, x: 620, y: 104, z: -65 },
    { amplitude: 7, phase: 1.7, x: 815, y: 128, z: -285 },
    { amplitude: 4, phase: 3.2, x: 520, y: 92, z: -420 },
    { amplitude: 5, phase: 4.6, x: -165, y: 115, z: 610 },
  ]

  return specs.map((spec, index) => {
    const root = new TransformNode(`balloon-root-${index + 1}`, context.scene)
    root.parent = context.root
    root.position.copyFromFloats(spec.x, spec.y, spec.z)

    const envelope = MeshBuilder.CreateSphere(
      `balloon-envelope-${index + 1}`,
      { diameter: 1, segments: 10 },
      context.scene,
    )
    envelope.parent = root
    envelope.scaling.copyFromFloats(9.5, 12.5, 9.5)
    envelope.material =
      index % 2 === 0 ? context.materials.hangarRed : context.materials.warning
    envelope.isPickable = false
    context.shadowGenerator?.addShadowCaster(envelope)

    const band = MeshBuilder.CreateTorus(
      `balloon-band-${index + 1}`,
      { diameter: 18, thickness: 1, tessellation: 12 },
      context.scene,
    )
    band.parent = root
    band.material = context.materials.runwayMarking
    band.isPickable = false

    const basket = MeshBuilder.CreateBox(
      `balloon-basket-${index + 1}`,
      { depth: 3.4, height: 3.5, width: 3.4 },
      context.scene,
    )
    basket.parent = root
    basket.position.y = -16
    basket.material = context.materials.treeTrunk
    basket.isPickable = false
    context.shadowGenerator?.addShadowCaster(basket)

    const rope = MeshBuilder.CreateCylinder(
      `balloon-rope-${index + 1}`,
      { diameter: 0.18, height: 8.5, tessellation: 6 },
      context.scene,
    )
    rope.parent = root
    rope.position.y = -11.2
    rope.material = context.materials.darkMetal
    rope.isPickable = false

    const collider: GeometricObstacleCollider = {
      center: new Vector3(spec.x, spec.y, spec.z),
      kind: 'balloon',
      radius: 13,
    }
    context.obstacles.push(collider)
    return {
      amplitude: spec.amplitude,
      baseY: spec.y,
      collider,
      phase: spec.phase,
      root,
      speed: 0.62 + index * 0.08,
    }
  })
}

export function createGeometricClouds(
  context: GeometricCourseContext,
  quality: GeometricWorldQuality,
): TransformNode {
  const root = new TransformNode('cloud-layer-root', context.scene)
  root.parent = context.root
  const cloudCount = quality === 'high' ? 9 : quality === 'medium' ? 6 : 4
  for (let index = 0; index < cloudCount; index += 1) {
    const cloudRoot = new TransformNode(`cloud-${index + 1}`, context.scene)
    cloudRoot.parent = root
    cloudRoot.position.copyFromFloats(
      -1_550 + index * 380,
      320 + (index % 3) * 55,
      -900 + ((index * 317) % 1_850),
    )
    for (let puff = 0; puff < 3; puff += 1) {
      const mesh = MeshBuilder.CreateSphere(
        `cloud-${index + 1}-puff-${puff + 1}`,
        { diameter: 1, segments: 7 },
        context.scene,
      )
      mesh.parent = cloudRoot
      mesh.position.copyFromFloats(
        (puff - 1) * 24,
        puff % 2 === 0 ? 0 : 8,
        0,
      )
      mesh.scaling.copyFromFloats(34 - puff * 3, 11 + puff * 3, 18 + puff * 2)
      mesh.material = context.materials.cloud
      mesh.isPickable = false
      mesh.receiveShadows = false
    }
  }
  return root
}
