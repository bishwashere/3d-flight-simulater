import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import type { Scene } from '@babylonjs/core/scene.js'

import {
  GAME_LEVELS,
  type GameLevelCheckpointPosition,
} from '../../config/game-levels'
import type { GeometricWorldMaterials } from './geometric-world-materials'
import type {
  GeometricCheckpoint,
  GeometricCheckpointState,
  GeometricObstacleCollider,
  GeometricWorldQuality,
} from './geometric-world-types'

const LAND_HEIGHT = 2

const DEFAULT_CHECKPOINT_POSITIONS = GAME_LEVELS[0].checkpointPositions

export const GEOMETRIC_CHECKPOINT_POSITIONS = DEFAULT_CHECKPOINT_POSITIONS.map(
  ([x, y, z]) => new Vector3(x, y, z),
)

export interface GeometricCourseContext {
  materials: GeometricWorldMaterials
  obstacles: GeometricObstacleCollider[]
  root: TransformNode
  scene: Scene
  shadowGenerator?: ShadowGenerator
}

export interface GeometricCheckpointCourseOptions {
  checkpointPositions?: readonly GameLevelCheckpointPosition[]
  /** Zero-based checkpoint index surrounded by the optional tower gate. */
  towerGateCheckpointIndex?: number
}

export interface GeometricBobbingNode {
  amplitude: number
  baseY: number
  collider?: GeometricObstacleCollider
  phase: number
  root: TransformNode
  speed: number
}

function addCourseObstacle(
  context: GeometricCourseContext,
  obstacle: GeometricObstacleCollider,
): GeometricObstacleCollider {
  context.obstacles.push(obstacle)
  return obstacle
}

function finishStaticMesh(
  context: GeometricCourseContext,
  mesh: Mesh,
  material: GeometricWorldMaterials[keyof GeometricWorldMaterials],
): Mesh {
  mesh.parent = context.root
  mesh.material = material
  mesh.isPickable = false
  mesh.receiveShadows = true
  context.shadowGenerator?.addShadowCaster(mesh)
  return mesh
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

    const collider = addCourseObstacle(context, {
      center: new Vector3(spec.x, spec.y, spec.z),
      kind: 'balloon',
      radius: 13,
    })
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

function createCourseTowerGate(
  context: GeometricCourseContext,
  position: Vector3,
  direction: Vector3,
): void {
  const horizontalDirection = new Vector3(direction.x, 0, direction.z).normalize()
  const right = new Vector3(horizontalDirection.z, 0, -horizontalDirection.x)
  const height = position.y + 19 - LAND_HEIGHT
  for (const side of [-1, 1]) {
    const center = position.add(right.scale(side * 25))
    center.y = LAND_HEIGHT + height / 2
    const pylon = finishStaticMesh(
      context,
      MeshBuilder.CreateCylinder(
        `course-pylon-${side < 0 ? 'left' : 'right'}`,
        {
          diameterBottom: 8,
          diameterTop: 3.2,
          height,
          tessellation: 8,
        },
        context.scene,
      ),
      side < 0 ? context.materials.hangarRed : context.materials.warning,
    )
    pylon.position.copyFrom(center)
    pylon.rotation.y = side * 0.35
    pylon.freezeWorldMatrix()
    addCourseObstacle(context, {
      center: center.clone(),
      halfExtents: new Vector3(5, height / 2, 5),
      kind: 'tower',
      radius: height / 2,
    })
  }

  const beamCenter = position.add(new Vector3(0, 22, 0))
  const beam = finishStaticMesh(
    context,
    MeshBuilder.CreateBox(
      'course-gate-top-beam',
      { depth: 5, height: 5, width: 57 },
      context.scene,
    ),
    context.materials.warning,
  )
  beam.position.copyFrom(beamCenter)
  beam.rotation.y = Math.atan2(right.x, right.z)
  beam.freezeWorldMatrix()
  addCourseObstacle(context, {
    center: beamCenter.clone(),
    halfExtents: new Vector3(28.5, 2.5, 3),
    kind: 'bridge',
    radius: 29,
  })
}

function createCheckpoint(
  context: GeometricCourseContext,
  index: number,
  position: Vector3,
  direction: Vector3,
): GeometricCheckpoint {
  const root = new TransformNode(`checkpoint-${index + 1}`, context.scene)
  root.parent = context.root
  root.position.copyFrom(position)
  root.rotationQuaternion = Quaternion.FromLookDirectionLH(
    direction.normalize(),
    Vector3.Up(),
  )

  const ring = MeshBuilder.CreateTorus(
    `checkpoint-ring-${index + 1}`,
    { diameter: 31, thickness: 1.35, tessellation: 28 },
    context.scene,
  )
  ring.parent = root
  ring.rotation.x = Math.PI / 2
  ring.material = context.materials.checkpointPending
  ring.isPickable = false

  const fins: Mesh[] = []
  for (let finIndex = 0; finIndex < 4; finIndex += 1) {
    const angle = (finIndex * Math.PI) / 2
    const fin = MeshBuilder.CreateBox(
      `checkpoint-fin-${index + 1}-${finIndex + 1}`,
      { depth: 0.8, height: 2.8, width: 1.15 },
      context.scene,
    )
    fin.parent = root
    fin.position.copyFromFloats(Math.cos(angle) * 18.5, Math.sin(angle) * 18.5, 0)
    fin.rotation.z = angle
    fin.material = context.materials.checkpointPending
    fin.isPickable = false
    fins.push(fin)
  }

  let state: GeometricCheckpointState = index === 0 ? 'active' : 'pending'
  const setState = (nextState: GeometricCheckpointState): void => {
    state = nextState
    const material =
      nextState === 'active'
        ? context.materials.checkpointActive
        : nextState === 'collected'
          ? context.materials.checkpointCollected
          : context.materials.checkpointPending
    ring.material = material
    for (const fin of fins) {
      fin.material = material
    }
    root.setEnabled(nextState !== 'collected')
  }
  setState(state)

  return {
    index,
    position: position.clone(),
    radius: 13.4,
    root,
    get state(): GeometricCheckpointState {
      return state
    },
    setState,
    update(elapsedSeconds): void {
      if (state === 'collected') {
        return
      }
      const pulse =
        state === 'active'
          ? 1 + Math.sin(elapsedSeconds * 4.4 + index) * 0.055
          : 1
      root.scaling.copyFromFloats(pulse, pulse, pulse)
      ring.rotation.z = elapsedSeconds * (state === 'active' ? 0.72 : 0.16)
    },
  }
}

export function createGeometricCheckpoints(
  context: GeometricCourseContext,
  options: GeometricCheckpointCourseOptions = {},
): GeometricCheckpoint[] {
  const requestedPositions = options.checkpointPositions
  const checkpointPositions =
    requestedPositions &&
    requestedPositions.length > 0 &&
    requestedPositions.every((position) => position.every(Number.isFinite))
      ? requestedPositions
      : DEFAULT_CHECKPOINT_POSITIONS
  const positions = checkpointPositions.map(
    ([x, y, z]) => new Vector3(x, y, z),
  )
  const checkpoints = positions.map((position, index) => {
    const previous = positions[Math.max(0, index - 1)] ?? position
    const next = positions[Math.min(positions.length - 1, index + 1)] ?? position
    const direction = next.subtract(previous)
    if (direction.lengthSquared() < 0.0001) {
      direction.copyFromFloats(0, 0, 1)
    }
    return createCheckpoint(context, index, position, direction)
  })

  const gateIndex = options.towerGateCheckpointIndex
  const gatePosition = gateIndex === undefined ? undefined : positions[gateIndex]
  if (gateIndex !== undefined && Number.isInteger(gateIndex) && gatePosition) {
    const gatePrevious = positions[Math.max(0, gateIndex - 1)] ?? gatePosition
    const gateNext =
      positions[Math.min(positions.length - 1, gateIndex + 1)] ?? gatePosition
    const gateDirection = gateNext.subtract(gatePrevious)
    if (gateDirection.lengthSquared() < 0.0001) {
      gateDirection.copyFromFloats(0, 0, 1)
    }
    createCourseTowerGate(context, gatePosition, gateDirection)
  }
  return checkpoints
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
