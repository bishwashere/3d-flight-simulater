import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js'
import { Scene } from '@babylonjs/core/scene.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import { describe, expect, it } from 'vitest'

import {
  GEOMETRIC_COIN_SPECS,
  createGeometricCoins,
} from './create-geometric-coins'
import { createGeometricWorldMaterials } from './geometric-world-materials'

describe('createGeometricCoins', () => {
  it('builds instanced, animated coins with repeatable collection state', () => {
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
    const coins = createGeometricCoins({ materials, root, scene })

    expect(coins).toHaveLength(GEOMETRIC_COIN_SPECS.length)
    expect(new Set(coins.map((coin) => coin.id)).size).toBe(coins.length)
    expect(scene.meshes.filter((mesh) => mesh.getClassName() === 'InstancedMesh')).toHaveLength(
      coins.length * 2,
    )

    const coin = coins[0]
    expect(coin).toBeDefined()
    if (!coin) {
      return
    }

    const restingY = coin.position.y
    coin.update(0.75)
    expect(coin.root.position.y).not.toBe(restingY)
    expect(coin.root.rotation.y).toBeGreaterThan(0)

    expect(coin.collect()).toBe(true)
    expect(coin.collect()).toBe(false)
    expect(coin.collected).toBe(true)
    expect(coin.root.isEnabled()).toBe(false)

    coin.reset()
    expect(coin.collected).toBe(false)
    expect(coin.root.isEnabled()).toBe(true)
    expect(coin.root.position.equals(coin.position)).toBe(true)

    root.dispose(false)
    for (const material of Object.values(materials)) {
      material.dispose()
    }
    scene.dispose()
    engine.dispose()
  })
})
