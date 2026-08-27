import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js'
import { Scene } from '@babylonjs/core/scene.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import { describe, expect, it } from 'vitest'

import { GAME_LEVELS } from '../../config/game-levels'
import { GEOMETRIC_AIRCRAFT_COLLISION_RADIUS } from './create-geometric-aircraft'
import { createGeometricCheckpoints } from './create-geometric-course'
import { createGeometricWorld } from './create-geometric-world'
import { createGeometricWorldMaterials } from './geometric-world-materials'
import type {
  GeometricObstacleCollider,
  GeometricWorld,
} from './geometric-world-types'

const ROUTE_SAMPLE_COUNT = 256
const MINIMUM_OBSTACLE_CLEARANCE = 10
const MINIMUM_TERRAIN_CLEARANCE = 20

function createTestScene() {
  const engine = new NullEngine({
    deterministicLockstep: false,
    lockstepMaxSteps: 4,
    renderHeight: 64,
    renderWidth: 64,
    textureSize: 64,
  })
  const scene = new Scene(engine)
  const root = new TransformNode('test-world-root', scene)
  const materials = createGeometricWorldMaterials(scene)
  const obstacles: GeometricObstacleCollider[] = []

  return {
    context: { materials, obstacles, root, scene },
    dispose(): void {
      scene.dispose()
      engine.dispose()
    },
    obstacles,
    scene,
  }
}

function getObstacleClearance(
  x: number,
  y: number,
  z: number,
  obstacle: GeometricObstacleCollider,
): number {
  if (!obstacle.halfExtents) {
    return (
      Math.hypot(
        x - obstacle.center.x,
        y - obstacle.center.y,
        z - obstacle.center.z,
      ) -
      obstacle.radius -
      GEOMETRIC_AIRCRAFT_COLLISION_RADIUS
    )
  }

  const distanceX = Math.max(
    Math.abs(x - obstacle.center.x) - obstacle.halfExtents.x,
    0,
  )
  const distanceY = Math.max(
    Math.abs(y - obstacle.center.y) - obstacle.halfExtents.y,
    0,
  )
  const distanceZ = Math.max(
    Math.abs(z - obstacle.center.z) - obstacle.halfExtents.z,
    0,
  )
  return (
    Math.hypot(distanceX, distanceY, distanceZ) -
    GEOMETRIC_AIRCRAFT_COLLISION_RADIUS
  )
}

function getRouteClearance(world: GeometricWorld): {
  obstacle: number
  terrain: number
} {
  let obstacleClearance = Number.POSITIVE_INFINITY
  let terrainClearance = Number.POSITIVE_INFINITY

  for (let index = 0; index < world.checkpoints.length - 1; index += 1) {
    const start = world.checkpoints[index]?.position
    const end = world.checkpoints[index + 1]?.position
    if (!start || !end) {
      continue
    }

    for (let sample = 0; sample <= ROUTE_SAMPLE_COUNT; sample += 1) {
      const amount = sample / ROUTE_SAMPLE_COUNT
      const x = start.x + (end.x - start.x) * amount
      const y = start.y + (end.y - start.y) * amount
      const z = start.z + (end.z - start.z) * amount
      terrainClearance = Math.min(
        terrainClearance,
        y - world.terrainHeightAt(x, z),
      )

      for (const obstacle of world.obstacles) {
        if (obstacle.kind !== 'hill') {
          obstacleClearance = Math.min(
            obstacleClearance,
            getObstacleClearance(x, y, z, obstacle),
          )
        }
      }
    }
  }

  return { obstacle: obstacleClearance, terrain: terrainClearance }
}

describe('createGeometricCheckpoints', () => {
  it('uses the simple level-one route as its safe default', () => {
    const testScene = createTestScene()
    const checkpoints = createGeometricCheckpoints(testScene.context, {
      checkpointPositions: [],
    })

    expect(checkpoints).toHaveLength(
      GAME_LEVELS[0].checkpointPositions.length,
    )
    expect(checkpoints[0]?.position.asArray()).toEqual([-610, 55, 360])
    expect(testScene.scene.getMeshByName('course-gate-top-beam')).toBeNull()

    testScene.dispose()
  })

  it('builds a supplied route and its optional tower gate', () => {
    const testScene = createTestScene()
    const checkpointPositions = [
      [-20, 35, 10],
      [30, 50, 90],
      [110, 65, 130],
    ] as const
    const checkpoints = createGeometricCheckpoints(testScene.context, {
      checkpointPositions,
      towerGateCheckpointIndex: 1,
    })

    expect(checkpoints.map((checkpoint) => checkpoint.position.asArray())).toEqual(
      checkpointPositions,
    )
    expect(testScene.scene.getMeshByName('course-gate-top-beam')).not.toBeNull()
    expect(testScene.obstacles.filter((obstacle) => obstacle.kind === 'tower')).toHaveLength(
      2,
    )

    testScene.dispose()
  })

  it('keeps every guided route clear of terrain and obstacle collisions', () => {
    for (const level of GAME_LEVELS) {
      const engine = new NullEngine({
        deterministicLockstep: false,
        lockstepMaxSteps: 4,
        renderHeight: 64,
        renderWidth: 64,
        textureSize: 64,
      })
      const scene = new Scene(engine)
      const world = createGeometricWorld(scene, {
        checkpointPositions: level.checkpointPositions,
        quality: 'low',
        theme: level.theme,
        towerGateCheckpointIndex:
          'towerGateCheckpointIndex' in level
            ? level.towerGateCheckpointIndex
            : undefined,
        vegetationCount: 0,
      })
      const clearance = getRouteClearance(world)

      expect(clearance.terrain, `${level.id} terrain clearance`).toBeGreaterThan(
        MINIMUM_TERRAIN_CLEARANCE,
      )
      expect(
        clearance.obstacle,
        `${level.id} obstacle clearance`,
      ).toBeGreaterThan(MINIMUM_OBSTACLE_CLEARANCE)

      world.dispose()
      scene.dispose()
      engine.dispose()
    }
  })
})
