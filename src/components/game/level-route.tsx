import { useCallback, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import {
  GAME_LEVELS,
  getGameLevel,
  getLevelPath,
} from '../../config/game-levels'
import { PANEL_PATHS } from '../../config/menu-routes'
import type { LevelOneQuality } from '../../game/level-one-types'
import { useProgressionStore, useSettingsStore } from '../../state'
import { LevelOneScreen } from './level-one-screen'

function resolveGeometryQuality(
  preset: 'custom' | 'high' | 'low' | 'medium',
): LevelOneQuality {
  return preset === 'custom' ? 'high' : preset
}

export function LevelRoute() {
  const navigate = useNavigate()
  const { levelId } = useParams<{ levelId: string }>()
  const level = getGameLevel(levelId)
  const isUnlocked = useProgressionStore((state) =>
    level ? state.isUnlocked(level.id) : false,
  )
  const completeLevel = useProgressionStore((state) => state.completeLevel)
  const adaptiveResolutionEnabled = useSettingsStore(
    (state) => state.adaptiveResolutionEnabled,
  )
  const gameplaySoundsEnabled = useSettingsStore(
    (state) => state.gameplaySoundsEnabled,
  )
  const masterVolume = useSettingsStore((state) => state.masterVolume)
  const musicEnabled = useSettingsStore((state) => state.musicEnabled)
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
  const setGameplaySoundsEnabled = useSettingsStore(
    (state) => state.setGameplaySoundsEnabled,
  )
  const setMusicEnabled = useSettingsStore((state) => state.setMusicEnabled)
  const performanceSettings = useMemo(
    () => ({
      adaptiveResolution: adaptiveResolutionEnabled,
      quality: resolveGeometryQuality(qualityPreset),
      renderDistance,
      resolutionScale: renderScale,
      shadows: shadowsEnabled,
      vegetationDensity,
    }),
    [
      adaptiveResolutionEnabled,
      qualityPreset,
      renderDistance,
      renderScale,
      shadowsEnabled,
      vegetationDensity,
    ],
  )

  const handleComplete = useCallback(
    (score: number) => {
      if (level) {
        completeLevel(level.id, score)
      }
    },
    [completeLevel, level],
  )

  if (!level || !isUnlocked) {
    return <Navigate to={PANEL_PATHS.levels} replace />
  }

  const levelIndex = GAME_LEVELS.findIndex((candidate) => candidate.id === level.id)
  const nextLevel = GAME_LEVELS[levelIndex + 1]

  return (
    <LevelOneScreen
      gameplaySoundsEnabled={gameplaySoundsEnabled}
      level={level}
      masterVolume={masterVolume}
      musicEnabled={musicEnabled}
      onComplete={handleComplete}
      onExit={() => void navigate(PANEL_PATHS.levels)}
      onGameplaySoundsEnabledChange={setGameplaySoundsEnabled}
      onMusicEnabledChange={setMusicEnabled}
      onNextLevel={
        nextLevel
          ? () => void navigate(getLevelPath(nextLevel.id))
          : undefined
      }
      performance={performanceSettings}
      pointerYoke={pointerYokeEnabled}
    />
  )
}
