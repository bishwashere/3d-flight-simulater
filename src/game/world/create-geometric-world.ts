import '@babylonjs/core/Meshes/instancedMesh.js'

import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js'
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import type { Scene } from '@babylonjs/core/scene.js'

import { createCrashEffects } from './create-crash-effects'
import { createGeometricCoins } from './create-geometric-coins'
import {
  createProceduralRegionChunk,
  type ProceduralRegionChunk,
} from './create-procedural-region'
import {
  GEOMETRIC_AIRCRAFT_GROUND_CLEARANCE,
  createGeometricAircraft,
} from './create-geometric-aircraft'
import {
  createGeometricBalloons,
  createGeometricClouds,
} from './create-geometric-course'
import {
  createGeometricWorldMaterials,
  type GeometricWorldMaterials,
} from './geometric-world-materials'
import type {
  GeometricLandingZone,
  GeometricObstacleCollider,
  GeometricObstacleKind,
  GeometricWorld,
  GeometricWorldOptions,
} from './geometric-world-types'
import {
  PROCEDURAL_REGION_SIZE,
  getProceduralRegionCoordinates,
  getProceduralRegionSpec,
  getProceduralTerrainHeight,
} from './procedural-regions'

const LAND_HEIGHT = 2
const WATER_HEIGHT = -12
const RUNWAY_X = -610
const RUNWAY_CENTER_Z = -40
const RUNWAY_LENGTH = 1_080
const RUNWAY_WIDTH = 92

const HILLS = [
  { height: 176, radius: 260, x: -80, z: 710 },
  { height: 238, radius: 310, x: 360, z: 690 },
  { height: 154, radius: 230, x: 760, z: 500 },
  { height: 112, radius: 190, x: 910, z: 130 },
  { height: 138, radius: 210, x: -930, z: 310 },
] as const

interface HillSpec {
  height: number
  radius: number
  x: number
  z: number
}

interface WorldBuildContext {
  materials: GeometricWorldMaterials
  obstacles: GeometricObstacleCollider[]
  root: TransformNode
  scene: Scene
  shadowGenerator?: ShadowGenerator
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function finishMesh(
  mesh: Mesh,
  material: StandardMaterial,
  context: WorldBuildContext,
  options: { animated?: boolean; castsShadow?: boolean; receivesShadow?: boolean } = {},
): Mesh {
  mesh.parent = context.root
  mesh.material = material
  mesh.isPickable = false
  mesh.receiveShadows = options.receivesShadow ?? true
  if (options.castsShadow ?? true) {
    context.shadowGenerator?.addShadowCaster(mesh)
  }
  if (!options.animated) {
    mesh.freezeWorldMatrix()
  }
  return mesh
}

function createBox(
  context: WorldBuildContext,
  name: string,
  size: { depth: number; height: number; width: number },
  position: Vector3,
  material: StandardMaterial,
  options?: { animated?: boolean; castsShadow?: boolean; receivesShadow?: boolean },
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, size, context.scene)
  mesh.position.copyFrom(position)
  return finishMesh(mesh, material, context, options)
}

function createCylinder(
  context: WorldBuildContext,
  name: string,
  options: {
    diameter?: number
    diameterBottom?: number
    diameterTop?: number
    height: number
    tessellation?: number
  },
  position: Vector3,
  material: StandardMaterial,
  meshOptions?: { animated?: boolean; castsShadow?: boolean },
): Mesh {
  const mesh = MeshBuilder.CreateCylinder(name, options, context.scene)
  mesh.position.copyFrom(position)
  return finishMesh(mesh, material, context, meshOptions)
}

function createSphere(
  context: WorldBuildContext,
  name: string,
  position: Vector3,
  scaling: Vector3,
  material: StandardMaterial,
  options?: { animated?: boolean; castsShadow?: boolean },
): Mesh {
  const mesh = MeshBuilder.CreateSphere(
    name,
    { diameter: 1, segments: 8 },
    context.scene,
  )
  mesh.position.copyFrom(position)
  mesh.scaling.copyFrom(scaling)
  return finishMesh(mesh, material, context, options)
}

function addObstacle(
  context: WorldBuildContext,
  kind: GeometricObstacleKind,
  center: Vector3,
  radius: number,
  halfExtents?: Vector3,
): GeometricObstacleCollider {
  const obstacle: GeometricObstacleCollider = {
    center,
    halfExtents,
    kind,
    radius,
  }
  context.obstacles.push(obstacle)
  return obstacle
}

function isInsideIsland(x: number, z: number): boolean {
  return (x / 1_165) ** 2 + (z / 850) ** 2 <= 1
}

function isInsideLagoon(x: number, z: number): boolean {
  return ((x - 430) / 355) ** 2 + ((z + 270) / 285) ** 2 <= 1
}

function hillHeightAt(x: number, z: number, hill: HillSpec): number {
  const distance = Math.hypot(x - hill.x, z - hill.z)
  if (distance >= hill.radius) {
    return 0
  }
  const normalized = 1 - distance / hill.radius
  return hill.height * normalized ** 1.12
}

function createTerrainHeightQuery(): (x: number, z: number) => number {
  return (x, z): number => {
    const onRunway =
      Math.abs(x - RUNWAY_X) <= RUNWAY_WIDTH / 2 &&
      Math.abs(z - RUNWAY_CENTER_Z) <= RUNWAY_LENGTH / 2
    if (onRunway) {
      return LAND_HEIGHT + 0.7
    }

    const onLongTaxiway =
      Math.abs(x + 445) <= 21 && Math.abs(z + 80) <= 360
    const onTaxiwayLink =
      Math.abs(x + 527) <= 85 &&
      (Math.abs(z + 390) <= 19 || Math.abs(z - 205) <= 19)
    const onApron = Math.abs(x + 304) <= 102.5 && Math.abs(z + 80) <= 195
    if (onLongTaxiway || onTaxiwayLink || onApron) {
      return LAND_HEIGHT + 0.5
    }

    const onAirportPlateau =
      x >= -845 && x <= -365 && z >= -640 && z <= 590
    if (onAirportPlateau) {
      return LAND_HEIGHT
    }

    const isletHeight = [
      { radius: 86, x: 385, z: -285 },
      { radius: 58, x: 545, z: -165 },
      { radius: 52, x: 285, z: -390 },
    ].some((islet) => Math.hypot(x - islet.x, z - islet.z) <= islet.radius)

    if (isletHeight) {
      return LAND_HEIGHT + 2.6
    }
    if (isInsideLagoon(x, z) && !isletHeight) {
      return LAND_HEIGHT + 0.18
    }
    if (!isInsideIsland(x, z) && !isletHeight) {
      const region = getProceduralRegionCoordinates(x, z)
      return region.x === 0 && region.z === 0
        ? WATER_HEIGHT
        : getProceduralTerrainHeight(x, z)
    }

    let height = LAND_HEIGHT
    for (const hill of HILLS) {
      height = Math.max(height, LAND_HEIGHT + hillHeightAt(x, z, hill))
    }
    return height
  }
}

function createBaseTerrain(context: WorldBuildContext): Mesh {
  const ocean = createBox(
    context,
    'world-ocean',
    { depth: 8_000, height: 2, width: 8_000 },
    new Vector3(0, WATER_HEIGHT - 1, 0),
    context.materials.water,
    { animated: true, castsShadow: false, receivesShadow: false },
  )
  ocean.alwaysSelectAsActiveMesh = true

  const sandShelf = createCylinder(
    context,
    'island-sand-shelf',
    { diameter: 1_760, height: 18, tessellation: 32 },
    new Vector3(0, -7, 0),
    context.materials.sand,
    { animated: true, castsShadow: false },
  )
  sandShelf.scaling.copyFromFloats(1.35, 1, 0.99)
  sandShelf.freezeWorldMatrix()

  const island = createCylinder(
    context,
    'island-grass-surface',
    { diameter: 1_620, height: 5, tessellation: 32 },
    new Vector3(0, -0.5, 0),
    context.materials.grass,
    { animated: true, castsShadow: false },
  )
  island.scaling.copyFromFloats(1.38, 1, 0.98)
  island.freezeWorldMatrix()

  const airportPlateau = createBox(
    context,
    'airport-plateau',
    { depth: 1_250, height: 13, width: 480 },
    new Vector3(-605, -4.5, -25),
    context.materials.grassLight,
    { castsShadow: false },
  )
  airportPlateau.freezeWorldMatrix()

  const lagoon = createCylinder(
    context,
    'island-lagoon',
    { diameter: 620, height: 0.4, tessellation: 32 },
    new Vector3(430, LAND_HEIGHT + 0.05, -270),
    context.materials.water,
    { animated: true, castsShadow: false },
  )
  lagoon.scaling.copyFromFloats(1.15, 1, 0.92)
  lagoon.freezeWorldMatrix()

  const islets = [
    { radius: 82, x: 385, z: -285 },
    { radius: 55, x: 545, z: -165 },
    { radius: 49, x: 285, z: -390 },
  ]
  for (const [index, islet] of islets.entries()) {
    const sand = createCylinder(
      context,
      `lagoon-islet-sand-${index + 1}`,
      { diameter: islet.radius * 2.25, height: 2.1, tessellation: 16 },
      new Vector3(islet.x, LAND_HEIGHT + 0.65, islet.z),
      context.materials.sand,
      { animated: true, castsShadow: false },
    )
    sand.scaling.z = 0.72
    sand.freezeWorldMatrix()
    const grass = createCylinder(
      context,
      `lagoon-islet-grass-${index + 1}`,
      { diameter: islet.radius * 1.72, height: 2.4, tessellation: 14 },
      new Vector3(islet.x, LAND_HEIGHT + 1.45, islet.z),
      context.materials.grassLight,
      { animated: true, castsShadow: false },
    )
    grass.scaling.z = 0.72
    grass.freezeWorldMatrix()
  }

  for (const [index, hill] of HILLS.entries()) {
    const mountain = createCylinder(
      context,
      `terrain-hill-${index + 1}`,
      {
        diameterBottom: hill.radius * 2,
        diameterTop: hill.radius * 0.22,
        height: hill.height,
        tessellation: 10,
      },
      new Vector3(hill.x, LAND_HEIGHT + hill.height / 2, hill.z),
      index % 2 === 0 ? context.materials.grass : context.materials.grassLight,
      { animated: true },
    )
    mountain.rotation.y = index * 0.37
    mountain.freezeWorldMatrix()

    const peak = createCylinder(
      context,
      `terrain-hill-peak-${index + 1}`,
      {
        diameterBottom: hill.radius * 0.45,
        diameterTop: 4,
        height: hill.height * 0.34,
        tessellation: 8,
      },
      new Vector3(
        hill.x,
        LAND_HEIGHT + hill.height * 0.93,
        hill.z,
      ),
      context.materials.rock,
      { animated: true },
    )
    peak.rotation.y = index * 0.51
    peak.freezeWorldMatrix()
    addObstacle(
      context,
      'hill',
      new Vector3(hill.x, LAND_HEIGHT + hill.height * 0.58, hill.z),
      Math.min(hill.radius * 0.43, hill.height * 0.6),
    )
  }

  return ocean
}

function createRunwayMarkings(context: WorldBuildContext): void {
  const markingHeight = LAND_HEIGHT + 0.78
  for (let index = 0; index < 21; index += 1) {
    createBox(
      context,
      `runway-center-marking-${index + 1}`,
      { depth: 20, height: 0.055, width: 2.6 },
      new Vector3(RUNWAY_X, markingHeight, -480 + index * 48),
      context.materials.runwayMarking,
      { castsShadow: false, receivesShadow: false },
    )
  }

  for (const thresholdZ of [-548, 468]) {
    for (let stripe = -3; stripe <= 3; stripe += 1) {
      createBox(
        context,
        `runway-threshold-${thresholdZ}-${stripe}`,
        { depth: 34, height: 0.06, width: 5.5 },
        new Vector3(RUNWAY_X + stripe * 10, markingHeight, thresholdZ),
        context.materials.runwayMarking,
        { castsShadow: false, receivesShadow: false },
      )
    }
  }

  for (const side of [-1, 1]) {
    for (let index = 0; index < 18; index += 1) {
      const light = createSphere(
        context,
        `runway-light-${side}-${index + 1}`,
        new Vector3(
          RUNWAY_X + side * (RUNWAY_WIDTH / 2 - 2),
          markingHeight + 0.15,
          -510 + index * 59,
        ),
        new Vector3(0.22, 0.22, 0.22),
        index % 2 === 0
          ? context.materials.checkpointActive
          : context.materials.runwayMarking,
        { castsShadow: false },
      )
      light.freezeWorldMatrix()
    }
  }
}

function createHangar(
  context: WorldBuildContext,
  index: number,
  x: number,
  z: number,
  material: StandardMaterial,
): void {
  const width = 74
  const depth = 88
  const height = 28
  createBox(
    context,
    `airport-hangar-${index}`,
    { depth, height, width },
    new Vector3(x, LAND_HEIGHT + height / 2, z),
    material,
  )
  createBox(
    context,
    `airport-hangar-door-${index}`,
    { depth: 0.6, height: 21, width: 58 },
    new Vector3(x, LAND_HEIGHT + 10.6, z - depth / 2 - 0.4),
    context.materials.darkMetal,
  )
  const leftRoof = createBox(
    context,
    `airport-hangar-roof-left-${index}`,
    { depth: depth + 3, height: 2.2, width: width * 0.54 },
    new Vector3(x - width * 0.245, LAND_HEIGHT + height + 5.2, z),
    context.materials.concrete,
    { animated: true },
  )
  leftRoof.rotation.z = -0.27
  leftRoof.freezeWorldMatrix()
  const rightRoof = createBox(
    context,
    `airport-hangar-roof-right-${index}`,
    { depth: depth + 3, height: 2.2, width: width * 0.54 },
    new Vector3(x + width * 0.245, LAND_HEIGHT + height + 5.2, z),
    context.materials.concrete,
    { animated: true },
  )
  rightRoof.rotation.z = 0.27
  rightRoof.freezeWorldMatrix()
  addObstacle(
    context,
    'building',
    new Vector3(x, LAND_HEIGHT + (height + 8) / 2, z),
    58,
    new Vector3(width / 2, (height + 8) / 2, depth / 2),
  )
}

function createAirport(context: WorldBuildContext): TransformNode {
  createBox(
    context,
    'airport-runway',
    { depth: RUNWAY_LENGTH, height: 0.7, width: RUNWAY_WIDTH },
    new Vector3(RUNWAY_X, LAND_HEIGHT + 0.35, RUNWAY_CENTER_Z),
    context.materials.asphalt,
    { castsShadow: false },
  )
  createBox(
    context,
    'airport-runway-left-shoulder',
    { depth: RUNWAY_LENGTH + 15, height: 0.22, width: 11 },
    new Vector3(RUNWAY_X - RUNWAY_WIDTH / 2 - 5.5, LAND_HEIGHT + 0.11, RUNWAY_CENTER_Z),
    context.materials.concrete,
    { castsShadow: false },
  )
  createBox(
    context,
    'airport-runway-right-shoulder',
    { depth: RUNWAY_LENGTH + 15, height: 0.22, width: 11 },
    new Vector3(RUNWAY_X + RUNWAY_WIDTH / 2 + 5.5, LAND_HEIGHT + 0.11, RUNWAY_CENTER_Z),
    context.materials.concrete,
    { castsShadow: false },
  )

  createBox(
    context,
    'airport-taxiway-long',
    { depth: 720, height: 0.48, width: 42 },
    new Vector3(-445, LAND_HEIGHT + 0.24, -80),
    context.materials.asphalt,
    { castsShadow: false },
  )
  for (const z of [-390, 205]) {
    createBox(
      context,
      `airport-taxiway-link-${z}`,
      { depth: 38, height: 0.5, width: 170 },
      new Vector3(-527, LAND_HEIGHT + 0.25, z),
      context.materials.asphalt,
      { castsShadow: false },
    )
  }
  createBox(
    context,
    'airport-apron',
    { depth: 390, height: 0.5, width: 205 },
    new Vector3(-304, LAND_HEIGHT + 0.25, -80),
    context.materials.concrete,
    { castsShadow: false },
  )

  createRunwayMarkings(context)
  createHangar(context, 1, -304, -240, context.materials.hangarBlue)
  createHangar(context, 2, -205, -240, context.materials.hangarRed)
  createHangar(context, 3, -304, -105, context.materials.hangarBlue)

  const towerX = -195
  const towerZ = 95
  createBox(
    context,
    'airport-control-tower-base',
    { depth: 34, height: 13, width: 39 },
    new Vector3(towerX, LAND_HEIGHT + 6.5, towerZ),
    context.materials.concrete,
  )
  createCylinder(
    context,
    'airport-control-tower-shaft',
    { diameter: 16, height: 52, tessellation: 8 },
    new Vector3(towerX, LAND_HEIGHT + 39, towerZ),
    context.materials.concrete,
  )
  createCylinder(
    context,
    'airport-control-tower-cab',
    { diameterBottom: 34, diameterTop: 31, height: 12, tessellation: 8 },
    new Vector3(towerX, LAND_HEIGHT + 69, towerZ),
    context.materials.towerGlass,
  )
  createCylinder(
    context,
    'airport-control-tower-roof',
    { diameterBottom: 36, diameterTop: 24, height: 4, tessellation: 8 },
    new Vector3(towerX, LAND_HEIGHT + 77, towerZ),
    context.materials.hangarRed,
  )
  addObstacle(
    context,
    'tower',
    new Vector3(towerX, LAND_HEIGHT + 39, towerZ),
    42,
    new Vector3(19, 39, 19),
  )

  const windsockRoot = new TransformNode('airport-windsock-root', context.scene)
  windsockRoot.parent = context.root
  windsockRoot.position.copyFromFloats(-390, LAND_HEIGHT, 330)
  const mast = MeshBuilder.CreateCylinder(
    'airport-windsock-mast',
    { diameter: 0.55, height: 14, tessellation: 8 },
    context.scene,
  )
  mast.parent = windsockRoot
  mast.position.y = 7
  mast.material = context.materials.darkMetal
  mast.isPickable = false
  context.shadowGenerator?.addShadowCaster(mast)
  const sock = MeshBuilder.CreateCylinder(
    'airport-windsock',
    {
      diameterBottom: 1.7,
      diameterTop: 0.48,
      height: 7,
      tessellation: 10,
    },
    context.scene,
  )
  sock.parent = windsockRoot
  sock.position.copyFromFloats(0, 13.7, 3.2)
  sock.rotation.x = Math.PI / 2
  sock.material = context.materials.warning
  sock.isPickable = false
  context.shadowGenerator?.addShadowCaster(sock)

  return windsockRoot
}

function createCity(context: WorldBuildContext): void {
  const roads = [
    { depth: 780, width: 30, x: 30, z: -40 },
    { depth: 35, width: 700, x: 160, z: 145 },
    { depth: 32, width: 630, x: 220, z: -115 },
  ]
  for (const [index, road] of roads.entries()) {
    createBox(
      context,
      `city-road-${index + 1}`,
      { depth: road.depth, height: 0.22, width: road.width },
      new Vector3(road.x, LAND_HEIGHT + 0.11, road.z),
      context.materials.asphalt,
      { castsShadow: false },
    )
  }

  const blocks = [
    [-130, -205, 42, 40, 48],
    [-65, -205, 36, 34, 72],
    [5, -210, 48, 42, 55],
    [80, -205, 38, 36, 96],
    [160, -205, 52, 42, 66],
    [240, -205, 44, 36, 118],
    [-130, 55, 38, 42, 68],
    [-55, 55, 52, 44, 47],
    [25, 55, 42, 38, 92],
    [105, 55, 46, 40, 132],
    [190, 55, 55, 44, 76],
    [275, 55, 40, 38, 105],
    [-85, 245, 42, 38, 44],
    [0, 245, 48, 40, 61],
    [90, 245, 42, 44, 85],
    [190, 245, 55, 42, 53],
  ] as const

  for (const [index, [x, z, width, depth, height]] of blocks.entries()) {
    const material =
      index % 3 === 0
        ? context.materials.hangarRed
        : index % 3 === 1
          ? context.materials.hangarBlue
          : context.materials.concrete
    createBox(
      context,
      `city-building-${index + 1}`,
      { depth, height, width },
      new Vector3(x, LAND_HEIGHT + height / 2, z),
      material,
    )
    const roofHeight = 2.5 + (index % 3) * 1.5
    createBox(
      context,
      `city-building-roof-${index + 1}`,
      { depth: depth * 0.38, height: roofHeight, width: width * 0.42 },
      new Vector3(x, LAND_HEIGHT + height + roofHeight / 2, z),
      context.materials.darkMetal,
    )
    addObstacle(
      context,
      'building',
      new Vector3(x, LAND_HEIGHT + height / 2, z),
      Math.hypot(width / 2, depth / 2, height / 2),
      new Vector3(width / 2, height / 2, depth / 2),
    )
  }

  const craneRoot = new TransformNode('city-crane-root', context.scene)
  craneRoot.parent = context.root
  craneRoot.position.copyFromFloats(330, LAND_HEIGHT, 170)
  const craneMast = MeshBuilder.CreateBox(
    'city-crane-mast',
    { depth: 3.5, height: 102, width: 3.5 },
    context.scene,
  )
  craneMast.parent = craneRoot
  craneMast.position.y = 51
  craneMast.material = context.materials.warning
  context.shadowGenerator?.addShadowCaster(craneMast)
  const craneArm = MeshBuilder.CreateBox(
    'city-crane-arm',
    { depth: 3, height: 3, width: 88 },
    context.scene,
  )
  craneArm.parent = craneRoot
  craneArm.position.copyFromFloats(-14, 101, 0)
  craneArm.material = context.materials.warning
  context.shadowGenerator?.addShadowCaster(craneArm)
  const craneCounterweight = MeshBuilder.CreateBox(
    'city-crane-counterweight',
    { depth: 8, height: 9, width: 12 },
    context.scene,
  )
  craneCounterweight.parent = craneRoot
  craneCounterweight.position.copyFromFloats(23, 96, 0)
  craneCounterweight.material = context.materials.darkMetal
  context.shadowGenerator?.addShadowCaster(craneCounterweight)
  addObstacle(
    context,
    'tower',
    new Vector3(330, LAND_HEIGHT + 52, 170),
    52,
    new Vector3(3, 52, 3),
  )
  addObstacle(
    context,
    'tower',
    new Vector3(316, LAND_HEIGHT + 101, 170),
    45,
    new Vector3(44, 4, 5),
  )
}

function createLagoonBridge(context: WorldBuildContext): void {
  const bridgeX = 475
  const bridgeZ = -285
  const deck = createBox(
    context,
    'lagoon-bridge-deck',
    { depth: 345, height: 7, width: 22 },
    new Vector3(bridgeX, 16, bridgeZ),
    context.materials.asphalt,
    { animated: true },
  )
  deck.rotation.y = 0.26
  deck.freezeWorldMatrix()

  for (const offset of [-125, 125]) {
    const z = bridgeZ + offset
    createBox(
      context,
      `lagoon-bridge-pier-${offset}`,
      { depth: 13, height: 30, width: 16 },
      new Vector3(bridgeX + offset * Math.sin(0.26), 3, z),
      context.materials.concrete,
    )
  }
  addObstacle(
    context,
    'bridge',
    new Vector3(bridgeX, 16, bridgeZ),
    174,
    new Vector3(15, 7, 173),
  )
}

function createVegetation(
  context: WorldBuildContext,
  terrainHeightAt: (x: number, z: number) => number,
  requestedCount: number,
): void {
  let seed = 0x71a5c0de
  const random = (): number => {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0
    return seed / 0x1_0000_0000
  }

  const positions: Vector3[] = []
  const count = clamp(Math.round(requestedCount), 24, 160)
  for (let attempts = 0; attempts < count * 18 && positions.length < count; attempts += 1) {
    const x = (random() * 2 - 1) * 1_040
    const z = (random() * 2 - 1) * 760
    const excluded =
      !isInsideIsland(x, z) ||
      isInsideLagoon(x, z) ||
      (x > -860 && x < -330 && z > -650 && z < 590) ||
      (x > -200 && x < 390 && z > -285 && z < 330) ||
      HILLS.some((hill) => Math.hypot(x - hill.x, z - hill.z) < hill.radius * 0.34)
    if (excluded) {
      continue
    }
    positions.push(new Vector3(x, terrainHeightAt(x, z), z))
  }

  if (positions.length === 0) {
    return
  }

  const first = positions[0]
  if (!first) {
    return
  }
  const trunkSource = MeshBuilder.CreateCylinder(
    'tree-trunk-1',
    { diameterBottom: 1.65, diameterTop: 1.15, height: 8, tessellation: 6 },
    context.scene,
  )
  trunkSource.parent = context.root
  trunkSource.material = context.materials.treeTrunk
  trunkSource.position.copyFromFloats(first.x, first.y + 4, first.z)
  trunkSource.isPickable = false
  trunkSource.receiveShadows = true
  context.shadowGenerator?.addShadowCaster(trunkSource)
  trunkSource.freezeWorldMatrix()

  const canopySource = MeshBuilder.CreateCylinder(
    'tree-canopy-1',
    { diameterBottom: 8.5, diameterTop: 0.3, height: 11, tessellation: 7 },
    context.scene,
  )
  canopySource.parent = context.root
  canopySource.material = context.materials.treeCanopy
  canopySource.position.copyFromFloats(first.x, first.y + 12, first.z)
  canopySource.isPickable = false
  canopySource.receiveShadows = true
  context.shadowGenerator?.addShadowCaster(canopySource)
  canopySource.freezeWorldMatrix()

  for (let index = 1; index < positions.length; index += 1) {
    const position = positions[index]
    if (!position) {
      continue
    }
    const scale = 0.72 + random() * 0.65
    const trunk = trunkSource.createInstance(`tree-trunk-${index + 1}`)
    trunk.parent = context.root
    trunk.position.copyFromFloats(position.x, position.y + 4 * scale, position.z)
    trunk.scaling.copyFromFloats(scale, scale, scale)
    trunk.isPickable = false
    trunk.freezeWorldMatrix()

    const canopy = canopySource.createInstance(`tree-canopy-${index + 1}`)
    canopy.parent = context.root
    canopy.position.copyFromFloats(position.x, position.y + 12 * scale, position.z)
    canopy.scaling.copyFromFloats(scale, scale, scale)
    canopy.rotation.y = random() * Math.PI
    canopy.isPickable = false
    canopy.freezeWorldMatrix()
  }

  const rockPositions = [
    [-905, 155],
    [-870, 205],
    [-790, 600],
    [675, -600],
    [855, -390],
    [930, -80],
    [610, 690],
    [-70, -650],
  ] as const
  for (const [index, [x, z]] of rockPositions.entries()) {
    const y = terrainHeightAt(x, z)
    const scale = 5 + (index % 4) * 1.9
    const rock = createSphere(
      context,
      `terrain-rock-${index + 1}`,
      new Vector3(x, y + scale * 0.55, z),
      new Vector3(scale, scale * 0.68, scale * 0.86),
      context.materials.rock,
      { animated: true },
    )
    rock.rotation.copyFromFloats(index * 0.27, index * 0.64, index * 0.17)
    rock.freezeWorldMatrix()
    addObstacle(
      context,
      'rock',
      new Vector3(x, y + scale * 0.5, z),
      scale * 0.83,
    )
  }
}

export function createGeometricWorld(
  scene: Scene,
  options: GeometricWorldOptions = {},
): GeometricWorld {
  const quality = options.quality ?? 'high'
  const root = new TransformNode('geometric-world-root', scene)
  const materials = createGeometricWorldMaterials(scene)
  const obstacles: GeometricObstacleCollider[] = []
  const context: WorldBuildContext = {
    materials,
    obstacles,
    root,
    scene,
    shadowGenerator: options.shadowGenerator,
  }
  const terrainHeightAt = createTerrainHeightQuery()

  const ocean = createBaseTerrain(context)
  const windsock = createAirport(context)
  createCity(context)
  createLagoonBridge(context)
  createVegetation(
    context,
    terrainHeightAt,
    options.vegetationCount ?? (quality === 'high' ? 90 : quality === 'medium' ? 62 : 36),
  )
  const balloons = createGeometricBalloons(context)
  const homeCoins = createGeometricCoins(context)
  const coins = [...homeCoins]
  const cloudLayer = createGeometricClouds(context, quality)
  const aircraft = createGeometricAircraft(scene, materials, options.shadowGenerator)
  aircraft.root.parent = root

  const runwayElevation = LAND_HEIGHT + 0.7
  const spawnPosition = new Vector3(
    RUNWAY_X,
    runwayElevation + GEOMETRIC_AIRCRAFT_GROUND_CLEARANCE,
    -430,
  )
  const spawnRotation = Quaternion.Identity()
  aircraft.root.position.copyFrom(spawnPosition)
  aircraft.root.rotationQuaternion = spawnRotation.clone()

  const homeLandingZone: GeometricLandingZone = {
    center: new Vector3(RUNWAY_X, runwayElevation, RUNWAY_CENTER_Z),
    elevation: runwayElevation,
    headingRadians: 0,
    halfLength: RUNWAY_LENGTH / 2 - 35,
    halfWidth: RUNWAY_WIDTH / 2 - 8,
    id: 'home-island-runway',
  }
  const landingZones: GeometricLandingZone[] = [homeLandingZone]
  const collectedCoinIds = new Set<string>()
  const proceduralChunks = new Map<string, ProceduralRegionChunk>()
  const streamingRadius = Math.min(
    2,
    Math.max(
      1,
      Math.round((options.renderDistance ?? 1_700) / PROCEDURAL_REGION_SIZE),
    ),
  )

  const removeItems = <Item,>(target: Item[], items: readonly Item[]): void => {
    for (const item of items) {
      const index = target.indexOf(item)
      if (index >= 0) {
        target.splice(index, 1)
      }
    }
  }

  const syncProceduralRegions = (position: Readonly<Vector3>): void => {
    const center = getProceduralRegionCoordinates(position.x, position.z)
    const desiredKeys = new Set<string>()

    for (
      let regionX = center.x - streamingRadius;
      regionX <= center.x + streamingRadius;
      regionX += 1
    ) {
      for (
        let regionZ = center.z - streamingRadius;
        regionZ <= center.z + streamingRadius;
        regionZ += 1
      ) {
        if (regionX === 0 && regionZ === 0) {
          continue
        }
        const key = `${regionX}:${regionZ}`
        desiredKeys.add(key)
        if (proceduralChunks.has(key)) {
          continue
        }

        const chunk = createProceduralRegionChunk(
          {
            collectedCoinIds,
            materials,
            quality,
            scene,
            shadowGenerator: options.shadowGenerator,
          },
          getProceduralRegionSpec(regionX, regionZ),
        )
        proceduralChunks.set(key, chunk)
        coins.push(...chunk.coins)
        landingZones.push(chunk.landingZone)
        obstacles.push(...chunk.obstacles)
      }
    }

    for (const [key, chunk] of proceduralChunks) {
      if (desiredKeys.has(key)) {
        continue
      }
      removeItems(coins, chunk.coins)
      removeItems(landingZones, [chunk.landingZone])
      removeItems(obstacles, chunk.obstacles)
      chunk.dispose()
      proceduralChunks.delete(key)
    }
  }

  syncProceduralRegions(spawnPosition)
  const crashEffects = createCrashEffects(scene, root, quality)
  let disposed = false
  let cloudDrift = 0

  return {
    aircraft,
    bounds: {
      maximumAltitude: 720,
      maximumX: Number.MAX_SAFE_INTEGER,
      maximumZ: Number.MAX_SAFE_INTEGER,
      minimumAltitude: WATER_HEIGHT,
      minimumX: Number.MIN_SAFE_INTEGER,
      minimumZ: Number.MIN_SAFE_INTEGER,
    },
    coins,
    landingZones,
    obstacles,
    scene,
    spawnPosition,
    spawnRotation,
    clearCrashEffects(): void {
      crashEffects.clear()
      aircraft.setCrashState(false)
    },
    collectCoin(coin): boolean {
      if (!coin.collect()) {
        return false
      }
      collectedCoinIds.add(coin.id)
      return true
    },
    dispose(): void {
      if (disposed) {
        return
      }
      disposed = true
      crashEffects.dispose()
      for (const chunk of proceduralChunks.values()) {
        chunk.dispose()
      }
      proceduralChunks.clear()
      root.dispose(false)
      for (const material of Object.values(materials)) {
        material.dispose()
      }
    },
    resetCoins(): void {
      collectedCoinIds.clear()
      for (const coin of coins) {
        coin.reset()
      }
    },
    showCrashEffects(position, velocity): void {
      aircraft.setCrashState(true)
      crashEffects.show(position, velocity)
    },
    terrainHeightAt,
    update(elapsedSeconds, deltaSeconds, playerPosition): void {
      const delta = Math.min(Math.max(deltaSeconds, 0), 0.1)
      for (const coin of homeCoins) {
        coin.update(elapsedSeconds)
      }
      for (const chunk of proceduralChunks.values()) {
        chunk.update(elapsedSeconds)
      }
      for (const balloon of balloons) {
        balloon.root.position.y =
          balloon.baseY +
          Math.sin(elapsedSeconds * balloon.speed + balloon.phase) * balloon.amplitude
        if (balloon.collider) {
          balloon.collider.center.copyFrom(balloon.root.position)
        }
        balloon.root.rotation.y = Math.sin(elapsedSeconds * 0.18 + balloon.phase) * 0.12
      }
      windsock.rotation.y = 0.38 + Math.sin(elapsedSeconds * 0.55) * 0.08
      windsock.rotation.z = Math.sin(elapsedSeconds * 1.7) * 0.035
      cloudDrift += delta * 4.5
      if (cloudDrift > 1_100) {
        cloudDrift = -1_100
      }
      if (playerPosition) {
        syncProceduralRegions(playerPosition)
        ocean.position.x = playerPosition.x
        ocean.position.z = playerPosition.z
        cloudLayer.position.x = playerPosition.x + cloudDrift
        cloudLayer.position.z = playerPosition.z
      }
      crashEffects.update(delta)
    },
  }
}

export type {
  GeometricAircraftAnimationState,
  GeometricAircraftVisual,
  GeometricCoin,
  GeometricLandingZone,
  GeometricObstacleCollider,
  GeometricObstacleKind,
  GeometricWorld,
  GeometricWorldBounds,
  GeometricWorldOptions,
  GeometricWorldQuality,
} from './geometric-world-types'
