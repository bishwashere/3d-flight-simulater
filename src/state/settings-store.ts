import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const PERFORMANCE_PRESETS = {
  low: {
    adaptiveResolutionEnabled: true,
    renderDistance: 900,
    renderScale: 0.7,
    shadowsEnabled: false,
    vegetationDensity: 0.35,
  },
  medium: {
    adaptiveResolutionEnabled: true,
    renderDistance: 1700,
    renderScale: 0.85,
    shadowsEnabled: true,
    vegetationDensity: 0.65,
  },
  high: {
    adaptiveResolutionEnabled: true,
    renderDistance: 2600,
    renderScale: 1,
    shadowsEnabled: true,
    vegetationDensity: 1,
  },
} as const

export type PerformancePreset = keyof typeof PERFORMANCE_PRESETS
export type QualityPreset = PerformancePreset | 'custom'

const DEFAULT_SETTING_VALUES = {
  ...PERFORMANCE_PRESETS.high,
  masterVolume: 0.7,
  gameplaySoundsEnabled: true,
  musicEnabled: true,
  pointerYokeEnabled: false,
  qualityPreset: 'high' as QualityPreset,
  uiSoundsEnabled: true,
} as const

const renderDistanceSchema = z
  .number()
  .finite()
  .transform((distance) => Math.round(Math.min(3200, Math.max(600, distance))))
  .catch(DEFAULT_SETTING_VALUES.renderDistance)

const renderScaleSchema = z
  .number()
  .finite()
  .transform((scale) =>
    Math.round(Math.min(1, Math.max(0.5, scale)) * 100) / 100,
  )
  .catch(DEFAULT_SETTING_VALUES.renderScale)

const vegetationDensitySchema = z
  .number()
  .finite()
  .transform((density) =>
    Math.round(Math.min(1, Math.max(0, density)) * 100) / 100,
  )
  .catch(DEFAULT_SETTING_VALUES.vegetationDensity)

const masterVolumeSchema = z
  .number()
  .finite()
  .transform((volume) => Math.min(1, Math.max(0, volume)))
  .catch(DEFAULT_SETTING_VALUES.masterVolume)

export const settingsSchema = z
  .object({
    adaptiveResolutionEnabled: z
      .boolean()
      .catch(DEFAULT_SETTING_VALUES.adaptiveResolutionEnabled),
    masterVolume: masterVolumeSchema,
    gameplaySoundsEnabled: z
      .boolean()
      .catch(DEFAULT_SETTING_VALUES.gameplaySoundsEnabled),
    musicEnabled: z.boolean().catch(DEFAULT_SETTING_VALUES.musicEnabled),
    pointerYokeEnabled: z
      .boolean()
      .catch(DEFAULT_SETTING_VALUES.pointerYokeEnabled),
    renderDistance: renderDistanceSchema,
    renderScale: renderScaleSchema,
    shadowsEnabled: z
      .boolean()
      .catch(DEFAULT_SETTING_VALUES.shadowsEnabled),
    qualityPreset: z
      .enum(['low', 'medium', 'high', 'custom'])
      .catch(DEFAULT_SETTING_VALUES.qualityPreset),
    uiSoundsEnabled: z.boolean().catch(DEFAULT_SETTING_VALUES.uiSoundsEnabled),
    vegetationDensity: vegetationDensitySchema,
  })
  .catch(DEFAULT_SETTING_VALUES)

export type GameSettings = z.output<typeof settingsSchema>

interface SettingsActions {
  resetSettings: () => void
  setAdaptiveResolutionEnabled: (enabled: boolean) => void
  setGameplaySoundsEnabled: (enabled: boolean) => void
  setMasterVolume: (volume: number) => void
  setMusicEnabled: (enabled: boolean) => void
  setPointerYokeEnabled: (enabled: boolean) => void
  setQualityPreset: (quality: PerformancePreset) => void
  setRenderDistance: (distance: number) => void
  setRenderScale: (scale: number) => void
  setShadowsEnabled: (enabled: boolean) => void
  setUiSoundsEnabled: (enabled: boolean) => void
  setVegetationDensity: (density: number) => void
  toggleAdaptiveResolution: () => void
  toggleGameplaySounds: () => void
  toggleMusic: () => void
  togglePointerYoke: () => void
  toggleShadows: () => void
  toggleUiSounds: () => void
}

export type SettingsState = GameSettings & SettingsActions

export const SETTINGS_STORAGE_KEY = 'coastal-flight-settings'

export const DEFAULT_SETTINGS: Readonly<GameSettings> = settingsSchema.parse(
  DEFAULT_SETTING_VALUES,
)

function mergePersistedSettings(
  persistedState: unknown,
  currentState: SettingsState,
): SettingsState {
  return {
    ...currentState,
    ...settingsSchema.parse(persistedState),
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
      setAdaptiveResolutionEnabled: (adaptiveResolutionEnabled) =>
        set({ adaptiveResolutionEnabled, qualityPreset: 'custom' }),
      setGameplaySoundsEnabled: (gameplaySoundsEnabled) =>
        set({ gameplaySoundsEnabled }),
      setMasterVolume: (masterVolume) =>
        set({ masterVolume: masterVolumeSchema.parse(masterVolume) }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setPointerYokeEnabled: (pointerYokeEnabled) =>
        set({ pointerYokeEnabled }),
      setQualityPreset: (qualityPreset) =>
        set({
          ...PERFORMANCE_PRESETS[qualityPreset],
          qualityPreset,
        }),
      setRenderDistance: (renderDistance) =>
        set({
          qualityPreset: 'custom',
          renderDistance: renderDistanceSchema.parse(renderDistance),
        }),
      setRenderScale: (renderScale) =>
        set({
          qualityPreset: 'custom',
          renderScale: renderScaleSchema.parse(renderScale),
        }),
      setShadowsEnabled: (shadowsEnabled) =>
        set({ qualityPreset: 'custom', shadowsEnabled }),
      setUiSoundsEnabled: (uiSoundsEnabled) => set({ uiSoundsEnabled }),
      setVegetationDensity: (vegetationDensity) =>
        set({
          qualityPreset: 'custom',
          vegetationDensity: vegetationDensitySchema.parse(
            vegetationDensity,
          ),
        }),
      toggleAdaptiveResolution: () =>
        set((state) => ({
          adaptiveResolutionEnabled: !state.adaptiveResolutionEnabled,
          qualityPreset: 'custom',
        })),
      toggleGameplaySounds: () =>
        set((state) => ({
          gameplaySoundsEnabled: !state.gameplaySoundsEnabled,
        })),
      toggleMusic: () =>
        set((state) => ({ musicEnabled: !state.musicEnabled })),
      togglePointerYoke: () =>
        set((state) => ({ pointerYokeEnabled: !state.pointerYokeEnabled })),
      toggleShadows: () =>
        set((state) => ({
          qualityPreset: 'custom',
          shadowsEnabled: !state.shadowsEnabled,
        })),
      toggleUiSounds: () =>
        set((state) => ({ uiSoundsEnabled: !state.uiSoundsEnabled })),
    }),
    {
      merge: mergePersistedSettings,
      migrate: (persistedState) => settingsSchema.parse(persistedState),
      name: SETTINGS_STORAGE_KEY,
      partialize: (state) => ({
        adaptiveResolutionEnabled: state.adaptiveResolutionEnabled,
        gameplaySoundsEnabled: state.gameplaySoundsEnabled,
        masterVolume: state.masterVolume,
        musicEnabled: state.musicEnabled,
        pointerYokeEnabled: state.pointerYokeEnabled,
        qualityPreset: state.qualityPreset,
        renderDistance: state.renderDistance,
        renderScale: state.renderScale,
        shadowsEnabled: state.shadowsEnabled,
        uiSoundsEnabled: state.uiSoundsEnabled,
        vegetationDensity: state.vegetationDensity,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
)
