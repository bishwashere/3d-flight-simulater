import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  PERFORMANCE_PRESETS,
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

  it('applies presets and marks manual performance tuning as custom', () => {
    const settings = useSettingsStore.getState()

    settings.setQualityPreset('low')
    expect(useSettingsStore.getState()).toMatchObject({
      ...PERFORMANCE_PRESETS.low,
      qualityPreset: 'low',
    })

    useSettingsStore.getState().setRenderDistance(9999)
    useSettingsStore.getState().setRenderScale(0.1)
    useSettingsStore.getState().setVegetationDensity(-1)

    expect(useSettingsStore.getState()).toMatchObject({
      qualityPreset: 'custom',
      renderDistance: 3200,
      renderScale: 0.5,
      vegetationDensity: 0,
    })

    useSettingsStore.getState().setQualityPreset('medium')
    expect(useSettingsStore.getState()).toMatchObject({
      ...PERFORMANCE_PRESETS.medium,
      qualityPreset: 'medium',
    })
  })

  it('persists only serializable settings', () => {
    useSettingsStore.getState().setMasterVolume(0.42)
    useSettingsStore.getState().setUiSoundsEnabled(false)

    const persisted = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    ) as { state?: Record<string, unknown> }

    expect(persisted.state).toMatchObject({
      masterVolume: 0.42,
      renderDistance: DEFAULT_SETTINGS.renderDistance,
      renderScale: DEFAULT_SETTINGS.renderScale,
      shadowsEnabled: DEFAULT_SETTINGS.shadowsEnabled,
      uiSoundsEnabled: false,
      vegetationDensity: DEFAULT_SETTINGS.vegetationDensity,
    })
    expect(persisted.state?.setMasterVolume).toBeUndefined()
  })

  it('normalizes settings through the reusable schema', () => {
    expect(
      settingsSchema.parse({
        adaptiveResolutionEnabled: false,
        masterVolume: 1.75,
        musicEnabled: false,
        pointerYokeEnabled: true,
        qualityPreset: 'medium',
        renderDistance: 9999,
        renderScale: 0.25,
        shadowsEnabled: false,
        uiSoundsEnabled: false,
        vegetationDensity: -1,
      }),
    ).toEqual({
      adaptiveResolutionEnabled: false,
      masterVolume: 1,
      musicEnabled: false,
      pointerYokeEnabled: true,
      qualityPreset: 'medium',
      renderDistance: 3200,
      renderScale: 0.5,
      shadowsEnabled: false,
      uiSoundsEnabled: false,
      vegetationDensity: 0,
    })

    expect(settingsSchema.parse(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('recovers valid fields from invalid persisted settings', async () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: {
          adaptiveResolutionEnabled: false,
          masterVolume: -2,
          musicEnabled: 'yes',
          pointerYokeEnabled: true,
          qualityPreset: 'ultra',
          renderDistance: 1200,
          renderScale: 0.8,
          shadowsEnabled: 'yes',
          uiSoundsEnabled: false,
          vegetationDensity: 0.45,
        },
        version: 1,
      }),
    )

    await useSettingsStore.persist.rehydrate()

    expect(useSettingsStore.getState()).toMatchObject({
      adaptiveResolutionEnabled: false,
      masterVolume: 0,
      musicEnabled: DEFAULT_SETTINGS.musicEnabled,
      pointerYokeEnabled: true,
      qualityPreset: DEFAULT_SETTINGS.qualityPreset,
      renderDistance: 1200,
      renderScale: 0.8,
      shadowsEnabled: DEFAULT_SETTINGS.shadowsEnabled,
      uiSoundsEnabled: false,
      vegetationDensity: 0.45,
    })
  })

  it('restores the defaults', () => {
    useSettingsStore.getState().setQualityPreset('low')
    useSettingsStore.getState().setMusicEnabled(false)
    useSettingsStore.getState().resetSettings()

    expect(useSettingsStore.getState()).toMatchObject(DEFAULT_SETTINGS)
  })
})
