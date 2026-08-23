import { useEffect } from 'react'
import {
  gameAmbience,
  installGameAmbienceLifecycle,
} from '../audio/game-ambience'
import { useSettingsStore } from '../state'

export function useGameAmbience(): void {
  const enabled = useSettingsStore((state) => state.musicEnabled)
  const volume = useSettingsStore((state) => state.masterVolume)

  useEffect(() => installGameAmbienceLifecycle(), [])

  useEffect(() => {
    gameAmbience.configure({ enabled, volume })
  }, [enabled, volume])
}
