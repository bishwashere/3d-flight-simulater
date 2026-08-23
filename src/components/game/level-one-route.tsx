import { useNavigate } from 'react-router-dom'

import { PANEL_PATHS } from '../../config/menu-routes'
import { useSettingsStore } from '../../state'
import type { LevelOneQuality } from '../../game/level-one-types'
import { LevelOneScreen } from './level-one-screen'

function resolveGeometryQuality(
  preset: 'custom' | 'high' | 'low' | 'medium',
): LevelOneQuality {
  return preset === 'custom' ? 'high' : preset
}

export function LevelOneRoute() {
  const navigate = useNavigate()
  const adaptiveResolutionEnabled = useSettingsStore(
    (state) => state.adaptiveResolutionEnabled,
  )
  const masterVolume = useSettingsStore((state) => state.masterVolume)
  const pointerYokeEnabled = useSettingsStore(
    (state) => state.pointerYokeEnabled,
  )
  const qualityPreset = useSettingsStore((state) => state.qualityPreset)
  const renderDistance = useSettingsStore((state) => state.renderDistance)
  const renderScale = useSettingsStore((state) => state.renderScale)
  const shadowsEnabled = useSettingsStore((state) => state.shadowsEnabled)
  const vegetationDensity = useSettingsStore(
    (state) => state.vegetationDensity,
  )

  return (
    <LevelOneScreen
      masterVolume={masterVolume}
      onExit={() => void navigate(PANEL_PATHS.levels)}
      performance={{
        adaptiveResolution: adaptiveResolutionEnabled,
        quality: resolveGeometryQuality(qualityPreset),
        renderDistance,
        resolutionScale: renderScale,
        shadows: shadowsEnabled,
        vegetationDensity,
      }}
      pointerYoke={pointerYokeEnabled}
    />
  )
}
