import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js'
import type { Scene } from '@babylonjs/core/scene.js'

import type { GeometricWorldMaterials } from './geometric-world-materials'
import type { GeometricAircraftVisual } from './geometric-world-types'

interface AircraftPartOptions {
  castsShadow?: boolean
  material: StandardMaterial
  parent: TransformNode
  receiveShadows?: boolean
}

function attachAircraftPart(
  mesh: Mesh,
  options: AircraftPartOptions,
  shadowGenerator?: ShadowGenerator,
): Mesh {
  mesh.parent = options.parent
  mesh.material = options.material
  mesh.isPickable = false
  mesh.receiveShadows = options.receiveShadows ?? true

  if (options.castsShadow ?? true) {
    shadowGenerator?.addShadowCaster(mesh)
  }

  return mesh
}

function createStrut(
  name: string,
  parent: TransformNode,
  materials: GeometricWorldMaterials,
  scene: Scene,
  shadowGenerator?: ShadowGenerator,
): void {
  const strut = attachAircraftPart(
    MeshBuilder.CreateCylinder(
      `${name}-strut`,
      { diameter: 0.12, height: 1.45, tessellation: 8 },
      scene,
    ),
    { material: materials.darkMetal, parent },
    shadowGenerator,
  )
  strut.position.y = -0.66

  const wheel = attachAircraftPart(
    MeshBuilder.CreateTorus(
      `${name}-wheel`,
      { diameter: 0.54, tessellation: 12, thickness: 0.16 },
      scene,
    ),
    { material: materials.aircraftDark, parent },
    shadowGenerator,
  )
  wheel.position.y = -1.38
  wheel.rotation.z = Math.PI / 2

  const hub = attachAircraftPart(
    MeshBuilder.CreateCylinder(
      `${name}-wheel-hub`,
      { diameter: 0.2, height: 0.2, tessellation: 10 },
      scene,
    ),
    { material: materials.darkMetal, parent },
    shadowGenerator,
  )
  hub.position.y = -1.38
  hub.rotation.z = Math.PI / 2
}

function damp(current: number, target: number, speed: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * delta))
}

export function createGeometricAircraft(
  scene: Scene,
  materials: GeometricWorldMaterials,
  shadowGenerator?: ShadowGenerator,
): GeometricAircraftVisual {
  const root = new TransformNode('aircraft-root', scene)

  const fuselage = attachAircraftPart(
    MeshBuilder.CreateCylinder(
      'aircraft-fuselage',
      {
        diameterBottom: 1.12,
        diameterTop: 1.5,
        height: 7.8,
        tessellation: 16,
      },
      scene,
    ),
    { material: materials.aircraftBody, parent: root },
    shadowGenerator,
  )
  fuselage.position.z = 0.25
  fuselage.rotation.x = Math.PI / 2

  const nose = attachAircraftPart(
    MeshBuilder.CreateSphere(
      'aircraft-nose',
      { diameter: 1.5, segments: 12 },
      scene,
    ),
    { material: materials.aircraftAccent, parent: root },
    shadowGenerator,
  )
  nose.position.z = 4.18
  nose.scaling.copyFromFloats(0.88, 0.88, 1.15)

  const tailCone = attachAircraftPart(
    MeshBuilder.CreateCylinder(
      'aircraft-tail-cone',
      {
        diameterBottom: 0.48,
        diameterTop: 1.1,
        height: 2.4,
        tessellation: 12,
      },
      scene,
    ),
    { material: materials.aircraftBody, parent: root },
    shadowGenerator,
  )
  tailCone.position.z = -4.5
  tailCone.rotation.x = -Math.PI / 2

  const wing = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-main-wing',
      { depth: 2.1, height: 0.2, width: 13.8 },
      scene,
    ),
    { material: materials.aircraftBody, parent: root },
    shadowGenerator,
  )
  wing.position.copyFromFloats(0, -0.03, 0.25)

  const wingAccent = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-wing-accent',
      { depth: 0.5, height: 0.23, width: 10.6 },
      scene,
    ),
    { material: materials.aircraftAccent, parent: root },
    shadowGenerator,
  )
  wingAccent.position.copyFromFloats(0, 0.02, -0.53)

  for (const side of [-1, 1] as const) {
    const tip = attachAircraftPart(
      MeshBuilder.CreateBox(
        `aircraft-wing-tip-${side < 0 ? 'left' : 'right'}`,
        { depth: 2.14, height: 0.26, width: 0.42 },
        scene,
      ),
      {
        material:
          side < 0 ? materials.aircraftWarning : materials.checkpointCollected,
        parent: root,
      },
      shadowGenerator,
    )
    tip.position.copyFromFloats(side * 6.82, 0.01, 0.24)
  }

  const stabilizer = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-tail-wing',
      { depth: 1.25, height: 0.16, width: 5 },
      scene,
    ),
    { material: materials.aircraftAccent, parent: root },
    shadowGenerator,
  )
  stabilizer.position.copyFromFloats(0, 0.28, -4.68)

  const verticalTail = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-vertical-tail',
      { depth: 1.65, height: 2.05, width: 0.2 },
      scene,
    ),
    { material: materials.aircraftAccent, parent: root },
    shadowGenerator,
  )
  verticalTail.position.copyFromFloats(0, 1.08, -4.5)
  verticalTail.rotation.x = -0.2

  const canopy = attachAircraftPart(
    MeshBuilder.CreateSphere(
      'aircraft-canopy',
      { diameter: 1.55, segments: 12 },
      scene,
    ),
    {
      castsShadow: false,
      material: materials.aircraftGlass,
      parent: root,
    },
    shadowGenerator,
  )
  canopy.position.copyFromFloats(0, 0.72, 1.45)
  canopy.scaling.copyFromFloats(0.82, 0.62, 1.38)

  const engineStripe = attachAircraftPart(
    MeshBuilder.CreateTorus(
      'aircraft-engine-stripe',
      { diameter: 1.43, tessellation: 16, thickness: 0.12 },
      scene,
    ),
    { material: materials.aircraftWarning, parent: root },
    shadowGenerator,
  )
  engineStripe.position.z = 3.72
  engineStripe.rotation.x = Math.PI / 2

  const propeller = new TransformNode('aircraft-propeller', scene)
  propeller.parent = root
  propeller.position.z = 5.07

  const propellerHub = attachAircraftPart(
    MeshBuilder.CreateSphere(
      'aircraft-propeller-hub',
      { diameter: 0.42, segments: 10 },
      scene,
    ),
    { material: materials.aircraftDark, parent: propeller },
    shadowGenerator,
  )
  propellerHub.scaling.z = 1.3

  const propellerBlade = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-propeller-blade',
      { depth: 0.12, height: 3.7, width: 0.18 },
      scene,
    ),
    { material: materials.aircraftDark, parent: propeller },
    shadowGenerator,
  )
  propellerBlade.position.z = 0.1

  const bladeTips = [-1.62, 1.62].map((y, index) => {
    const tip = attachAircraftPart(
      MeshBuilder.CreateBox(
        `aircraft-propeller-tip-${index + 1}`,
        { depth: 0.13, height: 0.46, width: 0.21 },
        scene,
      ),
      { material: materials.aircraftWarning, parent: propeller },
      shadowGenerator,
    )
    tip.position.copyFromFloats(0, y, 0.11)
    return tip
  })
  void bladeTips

  const leftAileron = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-aileron-left',
      { depth: 0.55, height: 0.12, width: 3.45 },
      scene,
    ),
    { material: materials.aircraftAccent, parent: root },
    shadowGenerator,
  )
  leftAileron.position.copyFromFloats(-4.55, 0, -0.98)

  const rightAileron = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-aileron-right',
      { depth: 0.55, height: 0.12, width: 3.45 },
      scene,
    ),
    { material: materials.aircraftAccent, parent: root },
    shadowGenerator,
  )
  rightAileron.position.copyFromFloats(4.55, 0, -0.98)

  const elevator = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-elevator',
      { depth: 0.5, height: 0.12, width: 4.3 },
      scene,
    ),
    { material: materials.aircraftBody, parent: root },
    shadowGenerator,
  )
  elevator.position.copyFromFloats(0, 0.28, -5.3)

  const rudder = attachAircraftPart(
    MeshBuilder.CreateBox(
      'aircraft-rudder',
      { depth: 0.55, height: 1.55, width: 0.16 },
      scene,
    ),
    { material: materials.aircraftWarning, parent: root },
    shadowGenerator,
  )
  rudder.position.copyFromFloats(0, 1.25, -5.25)

  const leftGear = new TransformNode('aircraft-gear-left', scene)
  leftGear.parent = root
  leftGear.position.copyFromFloats(-2.15, -0.28, -0.35)
  createStrut('aircraft-gear-left', leftGear, materials, scene, shadowGenerator)

  const rightGear = new TransformNode('aircraft-gear-right', scene)
  rightGear.parent = root
  rightGear.position.copyFromFloats(2.15, -0.28, -0.35)
  createStrut('aircraft-gear-right', rightGear, materials, scene, shadowGenerator)

  const noseGear = new TransformNode('aircraft-gear-nose', scene)
  noseGear.parent = root
  noseGear.position.copyFromFloats(0, -0.3, 3.15)
  createStrut('aircraft-gear-nose', noseGear, materials, scene, shadowGenerator)

  const cockpitAnchor = new TransformNode('aircraft-cockpit-anchor', scene)
  cockpitAnchor.parent = root
  cockpitAnchor.position.copyFromFloats(0, 1.02, 2.15)

  const chaseAnchor = new TransformNode('aircraft-chase-anchor', scene)
  chaseAnchor.parent = root
  chaseAnchor.position.copyFromFloats(0, 3.4, -13.5)

  const noseAnchor = new TransformNode('aircraft-nose-anchor', scene)
  noseAnchor.parent = root
  noseAnchor.position.copyFromFloats(0, 0.25, 6.2)

  const crashScar = attachAircraftPart(
    MeshBuilder.CreateSphere(
      'aircraft-crash-scorch',
      { diameter: 1.62, segments: 8 },
      scene,
    ),
    {
      castsShadow: false,
      material: materials.aircraftDark,
      parent: root,
      receiveShadows: false,
    },
    shadowGenerator,
  )
  crashScar.position.copyFromFloats(0.45, 0.12, 2.9)
  crashScar.scaling.copyFromFloats(0.55, 0.3, 0.8)
  crashScar.visibility = 0

  let displayedGearRetraction = 0
  let propellerSpeed = 0

  return {
    chaseAnchor,
    cockpitAnchor,
    noseAnchor,
    root,
    setCrashState(crashed): void {
      crashScar.visibility = crashed ? 0.92 : 0
      propellerSpeed = crashed ? 0 : propellerSpeed
    },
    updateAnimations(state, deltaSeconds): void {
      const safeDelta = Math.min(Math.max(deltaSeconds, 0), 0.1)
      const targetPropellerSpeed = state.engineRunning
        ? 8 + Math.max(0, Math.min(1, state.throttle)) * 42
        : 0
      propellerSpeed = damp(propellerSpeed, targetPropellerSpeed, 4.5, safeDelta)
      propeller.rotation.z += propellerSpeed * safeDelta

      leftAileron.rotation.x = damp(
        leftAileron.rotation.x,
        -state.roll * 0.34,
        12,
        safeDelta,
      )
      rightAileron.rotation.x = damp(
        rightAileron.rotation.x,
        state.roll * 0.34,
        12,
        safeDelta,
      )
      elevator.rotation.x = damp(
        elevator.rotation.x,
        -state.pitch * 0.38,
        12,
        safeDelta,
      )
      rudder.rotation.y = damp(
        rudder.rotation.y,
        state.yaw * 0.42,
        12,
        safeDelta,
      )

      displayedGearRetraction = damp(
        displayedGearRetraction,
        Math.max(0, Math.min(1, state.gearRetraction)),
        4,
        safeDelta,
      )
      leftGear.rotation.z = displayedGearRetraction * -1.33
      rightGear.rotation.z = displayedGearRetraction * 1.33
      noseGear.rotation.x = displayedGearRetraction * -1.35
      const gearScale = Math.max(0.15, 1 - displayedGearRetraction * 0.77)
      leftGear.scaling.y = gearScale
      rightGear.scaling.y = gearScale
      noseGear.scaling.y = gearScale
    },
  }
}

export const GEOMETRIC_AIRCRAFT_GROUND_CLEARANCE = 1.72
export const GEOMETRIC_AIRCRAFT_COLLISION_RADIUS = 4.1
export const GEOMETRIC_AIRCRAFT_FORWARD = Vector3.Forward()
