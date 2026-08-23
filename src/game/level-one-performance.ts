import type {
  LevelOnePerformanceSettings,
  ResolvedLevelOnePerformance,
} from './level-one-types'

const QUALITY_LIMITS = {
  high: {
    maxPixelRatio: 1.5,
    terrainSegments: 128,
    vegetationCount: 260,
  },
  low: {
    maxPixelRatio: 1,
    terrainSegments: 64,
    vegetationCount: 90,
  },
  medium: {
    maxPixelRatio: 1.25,
    terrainSegments: 96,
    vegetationCount: 170,
  },
} as const

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function resolveLevelOnePerformance(
  settings: LevelOnePerformanceSettings = {},
): ResolvedLevelOnePerformance {
  const quality = settings.quality ?? 'high'
  const limits = QUALITY_LIMITS[quality]
  const vegetationDensity = clamp(settings.vegetationDensity ?? 1, 0, 1)

  return {
    adaptiveResolution: settings.adaptiveResolution ?? true,
    maxPixelRatio: limits.maxPixelRatio,
    quality,
    renderDistance: clamp(settings.renderDistance ?? 1_700, 600, 3_200),
    resolutionScale: clamp(settings.resolutionScale ?? 1, 0.5, 1),
    shadows: settings.shadows ?? quality !== 'low',
    targetFps: settings.targetFps ?? 60,
    terrainSegments: limits.terrainSegments,
    vegetationCount: Math.round(
      limits.vegetationCount * vegetationDensity,
    ),
  }
}

export function getInitialPixelRatio(
  settings: ResolvedLevelOnePerformance,
): number {
  const deviceRatio = globalThis.devicePixelRatio || 1
  return Math.max(
    0.5,
    Math.min(deviceRatio, settings.maxPixelRatio) * settings.resolutionScale,
  )
}
