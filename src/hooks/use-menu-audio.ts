import { useCallback, useEffect, useMemo } from 'react'
import {
  installUiAudioUnlock,
  uiAudio,
  type UiSoundName,
} from '../audio'
import { useSettingsStore } from '../state'

export interface MenuAudioController {
  enabled: boolean
  play: (sound: UiSoundName) => void
  setVolume: (volume: number) => void
  toggle: () => void
  volume: number
}

export function useMenuAudio(): MenuAudioController {
  const enabled = useSettingsStore((state) => state.uiSoundsEnabled)
  const volume = useSettingsStore((state) => state.masterVolume)
  const setEnabled = useSettingsStore((state) => state.setUiSoundsEnabled)
  const persistVolume = useSettingsStore((state) => state.setMasterVolume)

  useEffect(() => installUiAudioUnlock(), [])

  useEffect(() => {
    uiAudio.configure({ muted: !enabled, volume })
  }, [enabled, volume])

  const play = useCallback((sound: UiSoundName) => {
    uiAudio.play(sound)
  }, [])

  const setVolume = useCallback(
    (nextVolume: number) => {
      uiAudio.setVolume(nextVolume)
      persistVolume(nextVolume)
    },
    [persistVolume],
  )

  const toggle = useCallback(() => {
    if (enabled) {
      uiAudio.play('back')
      setEnabled(false)
      return
    }

    uiAudio.configure({ muted: false })
    setEnabled(true)
    uiAudio.play('confirm')
  }, [enabled, setEnabled])

  return useMemo(
    () => ({ enabled, play, setVolume, toggle, volume }),
    [enabled, play, setVolume, toggle, volume],
  )
}
