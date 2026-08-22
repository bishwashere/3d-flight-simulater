import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const DEFAULT_SETTING_VALUES = {
  masterVolume: 0.7,
  musicEnabled: true,
  pointerYokeEnabled: false,
  qualityPreset: 'high',
  uiSoundsEnabled: true,
} as const

const masterVolumeSchema = z
  .number()
  .finite()
  .transform((volume) => Math.min(1, Math.max(0, volume)))
  .catch(DEFAULT_SETTING_VALUES.masterVolume)

export const settingsSchema = z
  .object({
    masterVolume: masterVolumeSchema,
    musicEnabled: z.boolean().catch(DEFAULT_SETTING_VALUES.musicEnabled),
    pointerYokeEnabled: z
      .boolean()
      .catch(DEFAULT_SETTING_VALUES.pointerYokeEnabled),
    qualityPreset: z
      .enum(['low', 'medium', 'high'])
      .catch(DEFAULT_SETTING_VALUES.qualityPreset),
    uiSoundsEnabled: z.boolean().catch(DEFAULT_SETTING_VALUES.uiSoundsEnabled),
  })
  .catch(DEFAULT_SETTING_VALUES)

export type GameSettings = z.output<typeof settingsSchema>
export type QualityPreset = GameSettings['qualityPreset']

interface SettingsActions {
  resetSettings: () => void
  setMasterVolume: (volume: number) => void
  setMusicEnabled: (enabled: boolean) => void
  setPointerYokeEnabled: (enabled: boolean) => void
  setQualityPreset: (quality: QualityPreset) => void
  setUiSoundsEnabled: (enabled: boolean) => void
  toggleMusic: () => void
  togglePointerYoke: () => void
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
      setMasterVolume: (masterVolume) =>
        set({ masterVolume: masterVolumeSchema.parse(masterVolume) }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setPointerYokeEnabled: (pointerYokeEnabled) =>
        set({ pointerYokeEnabled }),
      setQualityPreset: (qualityPreset) => set({ qualityPreset }),
      setUiSoundsEnabled: (uiSoundsEnabled) => set({ uiSoundsEnabled }),
      toggleMusic: () =>
        set((state) => ({ musicEnabled: !state.musicEnabled })),
      togglePointerYoke: () =>
        set((state) => ({ pointerYokeEnabled: !state.pointerYokeEnabled })),
      toggleUiSounds: () =>
        set((state) => ({ uiSoundsEnabled: !state.uiSoundsEnabled })),
    }),
    {
      merge: mergePersistedSettings,
      name: SETTINGS_STORAGE_KEY,
      partialize: (state) => ({
        masterVolume: state.masterVolume,
        musicEnabled: state.musicEnabled,
        pointerYokeEnabled: state.pointerYokeEnabled,
        qualityPreset: state.qualityPreset,
        uiSoundsEnabled: state.uiSoundsEnabled,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
