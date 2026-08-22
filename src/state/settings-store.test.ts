import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  settingsSchema,
  useSettingsStore,
} from './settings-store'

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.getState().resetSettings()
  })

  it('updates and clamps menu settings', () => {
    const settings = useSettingsStore.getState()

    settings.setMasterVolume(1.5)
    settings.setQualityPreset('medium')
    settings.toggleUiSounds()
    settings.toggleMusic()
    settings.togglePointerYoke()

    expect(useSettingsStore.getState()).toMatchObject({
      masterVolume: 1,
      musicEnabled: false,
      pointerYokeEnabled: true,
      qualityPreset: 'medium',
      uiSoundsEnabled: false,
    })

    useSettingsStore.getState().setMasterVolume(-0.5)
    expect(useSettingsStore.getState().masterVolume).toBe(0)
  })

  it('persists only serializable settings', () => {
    useSettingsStore.getState().setMasterVolume(0.42)
    useSettingsStore.getState().setUiSoundsEnabled(false)

    const persisted = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    ) as { state?: Record<string, unknown> }

    expect(persisted.state).toMatchObject({
      masterVolume: 0.42,
      uiSoundsEnabled: false,
    })
    expect(persisted.state?.setMasterVolume).toBeUndefined()
  })

  it('normalizes settings through the reusable schema', () => {
    expect(
      settingsSchema.parse({
        masterVolume: 1.75,
        musicEnabled: false,
        pointerYokeEnabled: true,
        qualityPreset: 'medium',
        uiSoundsEnabled: false,
      }),
    ).toEqual({
      masterVolume: 1,
      musicEnabled: false,
      pointerYokeEnabled: true,
      qualityPreset: 'medium',
      uiSoundsEnabled: false,
    })

    expect(settingsSchema.parse(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('recovers valid fields from invalid persisted settings', async () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: {
          masterVolume: -2,
          musicEnabled: 'yes',
          pointerYokeEnabled: true,
          qualityPreset: 'ultra',
          uiSoundsEnabled: false,
        },
        version: 1,
      }),
    )

    await useSettingsStore.persist.rehydrate()

    expect(useSettingsStore.getState()).toMatchObject({
      masterVolume: 0,
      musicEnabled: DEFAULT_SETTINGS.musicEnabled,
      pointerYokeEnabled: true,
      qualityPreset: DEFAULT_SETTINGS.qualityPreset,
      uiSoundsEnabled: false,
    })
  })

  it('restores the defaults', () => {
    useSettingsStore.getState().setQualityPreset('low')
    useSettingsStore.getState().setMusicEnabled(false)
    useSettingsStore.getState().resetSettings()

    expect(useSettingsStore.getState()).toMatchObject(DEFAULT_SETTINGS)
  })
})
