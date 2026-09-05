import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { HOME_PATH } from '../../config/menu-routes'
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

export function FlightRoute() {
  const router = useRouter()
  const pilotHasHydrated = usePilotProfileStore((state) => state.hasHydrated)
  const pilotHasLoadedRemote = usePilotProfileStore(
    (state) => state.hasLoadedRemote,
  )
  const pilotRecord = usePilotProfileStore((state) => state.record)
  const setPilotRecord = usePilotProfileStore((state) => state.setRecord)
  const recordFlight = useProgressionStore((state) => state.recordFlight)
  const [pendingPilotScore, setPendingPilotScore] = useState<number | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
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

      if (pendingPilotScore !== null) {
        recordFlight(pendingPilotScore)
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
      pendingPilotScore,
      recordFlight,
      setPilotRecord,
    ],
  )

  const handleComplete = useCallback(
    (score: number) => {
      const currentPilot = usePilotProfileStore.getState().record

      if (!currentPilot) {
        setPendingPilotScore(score)
        return
      }

      recordFlight(score)
      const snapshot = createCurrentPilotRecord(currentPilot)
      usePilotProfileStore.getState().setRecord(snapshot)
      void savePilotRecord(snapshot)
        .then(applySavedPilotRecord)
        .catch((error: unknown) => {
          if (!isPilotStorageUnconfigured(error)) {
            console.warn('[Coastal Flight] Score cloud sync unavailable', error)
          }
        })
    },
    [applySavedPilotRecord, recordFlight],
  )

  const handleSkipPilotSave = useCallback(() => {
    setPendingPilotScore(null)
  }, [])

  if (waitingForPilotProfile) {
    return (
      <main className="fixed inset-0 grid place-items-center bg-flight-950 text-flight-100">
        <span className="text-xs font-bold tracking-[0.2em] text-hud">
          LOADING PILOT PROFILE
        </span>
      </main>
    )
  }

  return (
    <>
      <LevelOneScreen
        gameplaySoundsEnabled={gameplaySoundsEnabled}
        masterVolume={masterVolume}
        musicEnabled={musicEnabled}
        onComplete={handleComplete}
        onExit={() => router.push(HOME_PATH)}
        onGameplaySoundsEnabledChange={setGameplaySoundsEnabled}
        onMusicEnabledChange={setMusicEnabled}
        performance={performanceSettings}
        pointerYoke={pointerYokeEnabled}
      />
      {pendingPilotScore !== null ? (
        <PilotProfileGate
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

// Kept as a source-compatible export for existing imports while the URL is /game.
export { FlightRoute as LevelRoute }
