import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  GAME_LEVELS,
  getGameLevel,
  getLevelPath,
} from '../../config/game-levels'
import { PANEL_PATHS } from '../../config/menu-routes'
import type { LevelOneQuality } from '../../game/level-one-types'
import {
  isPilotStorageUnconfigured,
  savePilotRecord,
} from '../../lib/pilot-api'
import {
  applyPilotProgress,
  createCurrentPilotRecord,
} from '../../lib/pilot-progress'
import {
  createPilotRecord,
  type PilotIdentity,
  type PilotRecord,
} from '../../lib/pilot-profile'
import {
  usePilotProfileStore,
  useProgressionStore,
  useSettingsStore,
} from '../../state'
import { LevelOneScreen } from './level-one-screen'
import { PilotProfileGate } from './pilot-profile-gate'

function resolveGeometryQuality(
  preset: 'custom' | 'high' | 'low' | 'medium',
): LevelOneQuality {
  return preset === 'custom' ? 'high' : preset
}

export function LevelRoute() {
  const router = useRouter()
  const { levelId } = useParams<{ levelId: string }>()
  const level = getGameLevel(levelId)
  const levelIndex = level
    ? GAME_LEVELS.findIndex((candidate) => candidate.id === level.id)
    : -1
  const nextLevel = levelIndex >= 0 ? GAME_LEVELS[levelIndex + 1] : undefined
  const pilotHasHydrated = usePilotProfileStore((state) => state.hasHydrated)
  const pilotHasLoadedRemote = usePilotProfileStore(
    (state) => state.hasLoadedRemote,
  )
  const pilotRecord = usePilotProfileStore((state) => state.record)
  const setPilotRecord = usePilotProfileStore((state) => state.setRecord)
  const [pendingPilotScore, setPendingPilotScore] = useState<number | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const isUnlocked = useProgressionStore((state) =>
    level ? state.isUnlocked(level.id) : false,
  )
  const nextLevelUnlocked = useProgressionStore((state) =>
    nextLevel ? state.isUnlocked(nextLevel.id) : false,
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

  const waitingForPilotProfile =
    !pilotHasHydrated || (Boolean(pilotRecord) && !pilotHasLoadedRemote)

  useEffect(() => {
    if (!level || (!waitingForPilotProfile && !isUnlocked)) {
      router.replace(PANEL_PATHS.levels)
    }
  }, [
    isUnlocked,
    level,
    router,
    waitingForPilotProfile,
  ])

  const applySavedPilotRecord = useCallback(
    (record: PilotRecord) => {
      applyPilotProgress(record)
      setPilotRecord(record)
    },
    [setPilotRecord],
  )

  const handlePilotSubmit = useCallback(
    async (identity: PilotIdentity) => {
      setProfileSaving(true)

      if (level && pendingPilotScore !== null) {
        completeLevel(level.id, pendingPilotScore)
      }

      const localRecord = createPilotRecord(
        identity,
        useProgressionStore.getState(),
      )
      setPilotRecord(localRecord)

      try {
        applySavedPilotRecord(await savePilotRecord(localRecord))
      } catch (error) {
        if (!isPilotStorageUnconfigured(error)) {
          console.warn('[Coastal Flight] Pilot saved locally only', error)
        }
      } finally {
        setPendingPilotScore(null)
        setProfileSaving(false)
      }
    },
    [
      applySavedPilotRecord,
      completeLevel,
      level,
      pendingPilotScore,
      setPilotRecord,
    ],
  )

  const handleComplete = useCallback(
    (score: number) => {
      if (level) {
        const currentPilot = usePilotProfileStore.getState().record

        if (!currentPilot) {
          setPendingPilotScore(score)
          return
        }

        completeLevel(level.id, score)
        if (currentPilot) {
          const snapshot = createCurrentPilotRecord(currentPilot)
          usePilotProfileStore.getState().setRecord(snapshot)
          void savePilotRecord(snapshot)
            .then(applySavedPilotRecord)
            .catch((error: unknown) => {
              if (!isPilotStorageUnconfigured(error)) {
                console.warn(
                  '[Coastal Flight] Score cloud sync unavailable',
                  error,
                )
              }
            })
        }
      }
    },
    [applySavedPilotRecord, completeLevel, level],
  )

  const handleSkipPilotSave = useCallback(() => {
    setPendingPilotScore(null)
  }, [])

  if (!level) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-flight-950 text-flight-100">
        <span className="text-xs font-bold tracking-[0.2em] text-hud">
          RETURNING TO LEVEL SELECT
        </span>
      </main>
    )
  }

  if (waitingForPilotProfile) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-flight-950 text-flight-100">
        <span className="text-xs font-bold tracking-[0.2em] text-hud">
          LOADING PILOT PROFILE
        </span>
      </main>
    )
  }

  if (!isUnlocked) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-flight-950 text-flight-100">
        <span className="text-xs font-bold tracking-[0.2em] text-hud">
          RETURNING TO LEVEL SELECT
        </span>
      </main>
    )
  }

  return (
    <>
      <LevelOneScreen
        key={level.id}
        gameplaySoundsEnabled={gameplaySoundsEnabled}
        level={level}
        masterVolume={masterVolume}
        musicEnabled={musicEnabled}
        onComplete={handleComplete}
        onExit={() => router.push(PANEL_PATHS.levels)}
        onGameplaySoundsEnabledChange={setGameplaySoundsEnabled}
        onMusicEnabledChange={setMusicEnabled}
        onNextLevel={
          nextLevel && nextLevelUnlocked
            ? () => router.push(getLevelPath(nextLevel.id))
            : undefined
        }
        performance={performanceSettings}
        pointerYoke={pointerYokeEnabled}
      />
      {pendingPilotScore !== null ? (
        <PilotProfileGate
          level={level}
          mode="postflight"
          onSkip={handleSkipPilotSave}
          onSubmit={handlePilotSubmit}
          score={pendingPilotScore}
          submitting={profileSaving}
        />
      ) : null}
    </>
  )
}
