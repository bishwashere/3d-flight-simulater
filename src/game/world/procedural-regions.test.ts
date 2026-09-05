import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { Scene } from '@babylonjs/core/scene.js'
import { describe, expect, it } from 'vitest'

import { createGeometricWorld } from './create-geometric-world'
import {
  PROCEDURAL_REGION_SIZE,
  getProceduralRegionCoordinates,
  getProceduralRegionId,
  getProceduralRegionSpec,
  getProceduralTerrainHeight,
} from './procedural-regions'

describe('procedural unlimited world', () => {
  it('maps coordinates to stable regions in every direction', () => {
    expect(getProceduralRegionCoordinates(0, 0)).toEqual({ x: 0, z: 0 })
    expect(
      getProceduralRegionCoordinates(PROCEDURAL_REGION_SIZE, 0),
    ).toEqual({ x: 1, z: 0 })
    expect(
      getProceduralRegionCoordinates(-PROCEDURAL_REGION_SIZE, 0),
    ).toEqual({ x: -1, z: 0 })
    expect(getProceduralRegionId(0, -PROCEDURAL_REGION_SIZE)).toBe(
      'region:0:-1',
    )
  })

  it('generates deterministic islands and usable runways at arbitrary distances', () => {
    for (const [x, z] of [
      [12, 7],
      [-18, 4],
      [3, -25],
      [-30, -19],
    ] as const) {
      const first = getProceduralRegionSpec(x, z)
      const second = getProceduralRegionSpec(x, z)
      expect(second).toEqual(first)
      expect(getProceduralTerrainHeight(first.centerX, first.centerZ)).toBeGreaterThanOrEqual(2)
      expect(
        getProceduralTerrainHeight(first.runway.x, first.runway.z),
      ).toBe(first.runway.elevation)
      const runwaySine = Math.sin(first.runway.headingRadians)
      const runwayCosine = Math.cos(first.runway.headingRadians)
      for (const hill of first.hills) {
        const offsetX = hill.x - first.runway.x
        const offsetZ = hill.z - first.runway.z
        const acrossRunway = Math.abs(
          offsetX * runwayCosine - offsetZ * runwaySine,
        )
        expect(acrossRunway).toBeGreaterThan(
          hill.radius + first.runway.width / 2,
        )
      }
    }
  })

  it('streams a bounded set of regions around the aircraft', () => {
    const engine = new NullEngine({
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
      renderHeight: 64,
      renderWidth: 64,
      textureSize: 64,
    })
    const scene = new Scene(engine)
    const world = createGeometricWorld(scene, {
      quality: 'low',
      renderDistance: 600,
      vegetationCount: 24,
    })

    const initialRunwayIds = new Set(
      world.landingZones.map((zone) => zone.id),
    )
    expect(initialRunwayIds.size).toBe(9)

    world.update(
      10,
      1 / 60,
      new Vector3(PROCEDURAL_REGION_SIZE * 20, 100, -PROCEDURAL_REGION_SIZE * 12),
    )
    const distantRunwayIds = new Set(
      world.landingZones.map((zone) => zone.id),
    )
    expect(distantRunwayIds.size).toBeLessThanOrEqual(10)
    expect(
      [...distantRunwayIds].some((id) => id.includes('region:20:-12')),
    ).toBe(true)
    expect([...distantRunwayIds].some((id) => initialRunwayIds.has(id))).toBe(
      true,
    )

    world.dispose()
    scene.dispose()
    engine.dispose()
  })
})
