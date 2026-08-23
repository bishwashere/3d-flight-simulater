import { Color3 } from '@babylonjs/core/Maths/math.color.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import type { Scene } from '@babylonjs/core/scene.js'

import type { GeometricWorldQuality } from './geometric-world-types'

interface CrashParticle {
  age: number
  baseScale: number
  lifetime: number
  mesh: Mesh
  phase: number
  velocity: Vector3
}

interface CrashDebris {
  age: number
  angularVelocity: Vector3
  mesh: Mesh
  velocity: Vector3
}

export interface CrashEffects {
  clear: () => void
  dispose: () => void
  show: (position: Vector3, inheritedVelocity?: Vector3) => void
  update: (deltaSeconds: number) => void
}

function setParticleVisibility(mesh: Mesh, visible: boolean): void {
  mesh.setEnabled(visible)
  mesh.visibility = visible ? 1 : 0
}

function seededDirection(index: number, vertical: number): Vector3 {
  const angle = index * 2.399963229728653
  const radius = 0.5 + ((index * 37) % 11) / 13
  return new Vector3(
    Math.cos(angle) * radius,
    vertical + ((index * 19) % 9) * 0.11,
    Math.sin(angle) * radius,
  )
}

function createEffectMaterial(
  scene: Scene,
  name: string,
  diffuse: Color3,
  emissive: Color3,
  alpha = 1,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)
  material.diffuseColor = diffuse
  material.emissiveColor = emissive
  material.specularColor = Color3.Black()
  material.alpha = alpha
  material.disableLighting = emissive.r + emissive.g + emissive.b > 0.01
  return material
}

export function createCrashEffects(
  scene: Scene,
  parent: TransformNode,
  quality: GeometricWorldQuality,
): CrashEffects {
  const root = new TransformNode('crash-effects-root', scene)
  root.parent = parent

  const fireMaterial = createEffectMaterial(
    scene,
    'material-crash-fire',
    new Color3(1, 0.18, 0.015),
    new Color3(1, 0.13, 0.005),
  )
  const hotFireMaterial = createEffectMaterial(
    scene,
    'material-crash-fire-hot',
    new Color3(1, 0.74, 0.08),
    new Color3(1, 0.46, 0.01),
  )
  const smokeMaterial = createEffectMaterial(
    scene,
    'material-crash-smoke',
    new Color3(0.08, 0.095, 0.1),
    Color3.Black(),
    0.72,
  )
  const debrisMaterial = createEffectMaterial(
    scene,
    'material-crash-debris',
    new Color3(0.055, 0.065, 0.07),
    Color3.Black(),
  )

  const fireCount = quality === 'high' ? 18 : quality === 'medium' ? 13 : 8
  const smokeCount = quality === 'high' ? 14 : quality === 'medium' ? 10 : 6
  const debrisCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4

  const fire: CrashParticle[] = Array.from({ length: fireCount }, (_, index) => {
    const mesh = MeshBuilder.CreateSphere(
      `crash-fire-${index + 1}`,
      { diameter: 1, segments: 6 },
      scene,
    )
    mesh.parent = root
    mesh.material = index % 3 === 0 ? hotFireMaterial : fireMaterial
    mesh.isPickable = false
    setParticleVisibility(mesh, false)
    return {
      age: 0,
      baseScale: 0.55 + ((index * 17) % 7) * 0.09,
      lifetime: 0.65 + ((index * 13) % 8) * 0.09,
      mesh,
      phase: index * 1.713,
      velocity: Vector3.Zero(),
    }
  })

  const smoke: CrashParticle[] = Array.from(
    { length: smokeCount },
    (_, index) => {
      const mesh = MeshBuilder.CreateSphere(
        `crash-smoke-${index + 1}`,
        { diameter: 1, segments: 7 },
        scene,
      )
      mesh.parent = root
      mesh.material = smokeMaterial
      mesh.isPickable = false
      setParticleVisibility(mesh, false)
      return {
        age: 0,
        baseScale: 0.78 + ((index * 11) % 6) * 0.1,
        lifetime: 2.8 + ((index * 7) % 9) * 0.18,
        mesh,
        phase: index * 2.17,
        velocity: Vector3.Zero(),
      }
    },
  )

  const debris: CrashDebris[] = Array.from(
    { length: debrisCount },
    (_, index) => {
      const mesh = MeshBuilder.CreateBox(
        `crash-debris-${index + 1}`,
        {
          depth: 0.12 + (index % 3) * 0.08,
          height: 0.1 + (index % 2) * 0.12,
          width: 0.35 + (index % 4) * 0.14,
        },
        scene,
      )
      mesh.parent = root
      mesh.material = debrisMaterial
      mesh.isPickable = false
      setParticleVisibility(mesh, false)
      return {
        age: 0,
        angularVelocity: seededDirection(index + 4, 0.8).scale(2.4),
        mesh,
        velocity: Vector3.Zero(),
      }
    },
  )

  let active = false
  let crashOriginY = 0
  let totalElapsed = 0

  const clear = (): void => {
    active = false
    totalElapsed = 0
    for (const particle of [...fire, ...smoke]) {
      setParticleVisibility(particle.mesh, false)
    }
    for (const fragment of debris) {
      setParticleVisibility(fragment.mesh, false)
    }
  }

  return {
    clear,
    dispose(): void {
      root.dispose(false)
      fireMaterial.dispose()
      hotFireMaterial.dispose()
      smokeMaterial.dispose()
      debrisMaterial.dispose()
    },
    show(position, inheritedVelocity = Vector3.Zero()): void {
      active = true
      totalElapsed = 0
      root.position.copyFrom(position)
      crashOriginY = position.y

      for (const [index, particle] of fire.entries()) {
        particle.age = -index * 0.035
        particle.mesh.position.copyFrom(
          seededDirection(index, 0.15).scale(0.48),
        )
        particle.velocity.copyFrom(seededDirection(index + 2, 1.2))
        particle.velocity.addInPlace(inheritedVelocity.scale(0.018))
        particle.mesh.scaling.copyFromFloats(0.1, 0.1, 0.1)
        setParticleVisibility(particle.mesh, false)
      }

      for (const [index, particle] of smoke.entries()) {
        particle.age = -0.2 - index * 0.11
        particle.mesh.position.copyFrom(
          seededDirection(index + 8, 0.2).scale(0.36),
        )
        particle.velocity.copyFrom(seededDirection(index + 12, 0.85))
        particle.velocity.x *= 0.26
        particle.velocity.z *= 0.26
        particle.mesh.scaling.copyFromFloats(0.1, 0.1, 0.1)
        setParticleVisibility(particle.mesh, false)
      }

      for (const [index, fragment] of debris.entries()) {
        fragment.age = 0
        fragment.mesh.position.copyFrom(
          seededDirection(index + 3, 0.18).scale(0.45),
        )
        fragment.velocity.copyFrom(seededDirection(index + 18, 2.4))
        fragment.velocity.scaleInPlace(2.2 + (index % 4) * 0.46)
        fragment.velocity.addInPlace(inheritedVelocity.scale(0.06))
        setParticleVisibility(fragment.mesh, true)
      }
    },
    update(deltaSeconds): void {
      if (!active) {
        return
      }

      const delta = Math.min(Math.max(deltaSeconds, 0), 0.05)
      totalElapsed += delta

      for (const particle of fire) {
        particle.age += delta
        if (particle.age < 0) {
          continue
        }
        if (particle.age >= particle.lifetime) {
          particle.age %= particle.lifetime
          particle.mesh.position.copyFrom(
            seededDirection(Math.floor(particle.phase * 10), 0.1).scale(0.4),
          )
        }
        setParticleVisibility(particle.mesh, true)
        const progress = particle.age / particle.lifetime
        const flicker = 0.78 + Math.sin(totalElapsed * 25 + particle.phase) * 0.22
        const scale = particle.baseScale * flicker * (1 - progress * 0.5)
        particle.mesh.scaling.copyFromFloats(scale, scale * 1.55, scale)
        particle.mesh.position.addInPlace(particle.velocity.scale(delta))
        particle.mesh.position.y += delta * (0.65 + progress)
        particle.mesh.visibility = Math.max(0, 1 - progress * progress)
      }

      for (const particle of smoke) {
        particle.age += delta
        if (particle.age < 0) {
          continue
        }
        if (particle.age >= particle.lifetime) {
          particle.age %= particle.lifetime
          particle.mesh.position.copyFrom(
            seededDirection(Math.floor(particle.phase * 8), 0.25).scale(0.32),
          )
        }
        setParticleVisibility(particle.mesh, true)
        const progress = particle.age / particle.lifetime
        const scale = particle.baseScale * (0.45 + progress * 2.4)
        particle.mesh.scaling.copyFromFloats(scale, scale * 0.82, scale)
        particle.mesh.position.addInPlace(particle.velocity.scale(delta))
        particle.mesh.position.x += Math.sin(totalElapsed * 0.8 + particle.phase) * delta
        particle.mesh.position.y += delta * (1.7 + progress * 1.3)
        particle.mesh.visibility = Math.max(0, 0.78 * (1 - progress))
      }

      for (const fragment of debris) {
        if (!fragment.mesh.isEnabled()) {
          continue
        }
        fragment.age += delta
        fragment.velocity.y -= 9.8 * delta
        fragment.mesh.position.addInPlace(fragment.velocity.scale(delta))
        fragment.mesh.rotation.x += fragment.angularVelocity.x * delta
        fragment.mesh.rotation.y += fragment.angularVelocity.y * delta
        fragment.mesh.rotation.z += fragment.angularVelocity.z * delta

        const worldHeight = crashOriginY - root.position.y
        if (fragment.mesh.position.y < worldHeight) {
          fragment.mesh.position.y = worldHeight
          fragment.velocity.y = Math.abs(fragment.velocity.y) * 0.28
          fragment.velocity.x *= 0.72
          fragment.velocity.z *= 0.72
        }
        if (fragment.age > 4.2) {
          setParticleVisibility(fragment.mesh, false)
        }
      }
    },
  }
}
