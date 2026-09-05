export const PROCEDURAL_REGION_SIZE = 1_800
export const PROCEDURAL_LAND_HEIGHT = 2
export const PROCEDURAL_WATER_HEIGHT = -12
export const PROCEDURAL_RUNWAY_LENGTH = 520
export const PROCEDURAL_RUNWAY_WIDTH = 54

export interface ProceduralRegionCoordinates {
  x: number
  z: number
}

export interface ProceduralHillSpec {
  height: number
  radius: number
  x: number
  z: number
}

export interface ProceduralRunwaySpec {
  elevation: number
  headingRadians: number
  length: number
  width: number
  x: number
  z: number
}

export interface ProceduralRegionSpec {
  centerX: number
  centerZ: number
  hills: readonly [ProceduralHillSpec, ProceduralHillSpec]
  id: string
  radiusX: number
  radiusZ: number
  runway: ProceduralRunwaySpec
  x: number
  z: number
}

function hashInteger(x: number, z: number, salt: number): number {
  let value = Math.imul(x, 374_761_393) ^ Math.imul(z, 668_265_263) ^ salt
  value = Math.imul(value ^ (value >>> 13), 1_274_126_177)
  return (value ^ (value >>> 16)) >>> 0
}

export function proceduralRandom(
  regionX: number,
  regionZ: number,
  salt: number,
): number {
  return hashInteger(regionX, regionZ, salt) / 0x1_0000_0000
}

export function getProceduralRegionCoordinates(
  x: number,
  z: number,
): ProceduralRegionCoordinates {
  return {
    x: Math.floor((x + PROCEDURAL_REGION_SIZE / 2) / PROCEDURAL_REGION_SIZE),
    z: Math.floor((z + PROCEDURAL_REGION_SIZE / 2) / PROCEDURAL_REGION_SIZE),
  }
}

export function getProceduralRegionId(x: number, z: number): string {
  const region = getProceduralRegionCoordinates(x, z)
  return region.x === 0 && region.z === 0
    ? 'home-island'
    : `region:${region.x}:${region.z}`
}

export function getProceduralRegionSpec(
  regionX: number,
  regionZ: number,
): ProceduralRegionSpec {
  const centerX =
    regionX * PROCEDURAL_REGION_SIZE +
    (proceduralRandom(regionX, regionZ, 11) - 0.5) * 180
  const centerZ =
    regionZ * PROCEDURAL_REGION_SIZE +
    (proceduralRandom(regionX, regionZ, 29) - 0.5) * 180
  const radiusX = 540 + proceduralRandom(regionX, regionZ, 47) * 150
  const radiusZ = 440 + proceduralRandom(regionX, regionZ, 61) * 130
  const headingRadians =
    proceduralRandom(regionX, regionZ, 73) > 0.5 ? 0 : Math.PI / 2
  const runwaySide = proceduralRandom(regionX, regionZ, 89) > 0.5 ? 1 : -1
  const runwayX =
    centerX + (headingRadians === 0 ? runwaySide * radiusX * 0.22 : 0)
  const runwayZ =
    centerZ + (headingRadians === 0 ? 0 : runwaySide * radiusZ * 0.22)

  const makeHill = (index: 0 | 1, salt: number): ProceduralHillSpec => {
    const acrossOffset =
      -runwaySide * (index === 0 ? 0.42 : 0.52)
    const alongOffset =
      (index === 0 ? -1 : 1) *
      (0.28 + proceduralRandom(regionX, regionZ, 101 + index) * 0.08)
    return {
      height: 85 + proceduralRandom(regionX, regionZ, salt) * 145,
      radius: 145 + proceduralRandom(regionX, regionZ, salt + 1) * 80,
      x:
        centerX +
        (headingRadians === 0
          ? acrossOffset * radiusX
          : alongOffset * radiusX),
      z:
        centerZ +
        (headingRadians === 0
          ? alongOffset * radiusZ
          : acrossOffset * radiusZ),
    }
  }

  return {
    centerX,
    centerZ,
    hills: [makeHill(0, 113), makeHill(1, 127)],
    id:
      regionX === 0 && regionZ === 0
        ? 'home-island'
        : `region:${regionX}:${regionZ}`,
    radiusX,
    radiusZ,
    runway: {
      elevation: PROCEDURAL_LAND_HEIGHT + 0.7,
      headingRadians,
      length: PROCEDURAL_RUNWAY_LENGTH,
      width: PROCEDURAL_RUNWAY_WIDTH,
      x: runwayX,
      z: runwayZ,
    },
    x: regionX,
    z: regionZ,
  }
}

export function isInsideProceduralRunway(
  x: number,
  z: number,
  runway: ProceduralRunwaySpec,
  inset = 0,
): boolean {
  const offsetX = x - runway.x
  const offsetZ = z - runway.z
  const sine = Math.sin(runway.headingRadians)
  const cosine = Math.cos(runway.headingRadians)
  const alongRunway = offsetX * sine + offsetZ * cosine
  const acrossRunway = offsetX * cosine - offsetZ * sine
  return (
    Math.abs(alongRunway) <= runway.length / 2 - inset &&
    Math.abs(acrossRunway) <= runway.width / 2 - inset
  )
}

function hillHeightAt(x: number, z: number, hill: ProceduralHillSpec): number {
  const distance = Math.hypot(x - hill.x, z - hill.z)
  if (distance >= hill.radius) {
    return 0
  }
  return hill.height * (1 - distance / hill.radius) ** 1.12
}

export function getProceduralTerrainHeight(x: number, z: number): number {
  const coordinates = getProceduralRegionCoordinates(x, z)
  const region = getProceduralRegionSpec(coordinates.x, coordinates.z)

  if (isInsideProceduralRunway(x, z, region.runway)) {
    return region.runway.elevation
  }

  const insideIsland =
    ((x - region.centerX) / region.radiusX) ** 2 +
      ((z - region.centerZ) / region.radiusZ) ** 2 <=
    1
  if (!insideIsland) {
    return PROCEDURAL_WATER_HEIGHT
  }

  let height = PROCEDURAL_LAND_HEIGHT
  for (const hill of region.hills) {
    height = Math.max(
      height,
      PROCEDURAL_LAND_HEIGHT + hillHeightAt(x, z, hill),
    )
  }
  return height
}
