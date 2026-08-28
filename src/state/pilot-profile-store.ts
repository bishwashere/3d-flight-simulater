import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  mergePilotRecords,
  pilotRecordSchema,
  type PilotRecord,
} from '../lib/pilot-profile'

interface PilotProfileData {
  hasHydrated: boolean
  hasLoadedRemote: boolean
  record: PilotRecord | null
}

interface PilotProfileActions {
  clearProfile: () => void
  markHydrated: () => void
  markRemoteLoaded: () => void
  mergeRecord: (record: PilotRecord) => PilotRecord
  setRecord: (record: PilotRecord) => PilotRecord
}

export type PilotProfileState = PilotProfileData & PilotProfileActions

export const PILOT_PROFILE_STORAGE_KEY = 'coastal-flight-pilot-profile'

function parseStoredRecord(value: unknown): PilotRecord | null {
  const result = pilotRecordSchema.safeParse(value)
  return result.success ? result.data : null
}

export const usePilotProfileStore = create<PilotProfileState>()(
  persist(
    (set, get) => ({
      clearProfile: () => set({ record: null }),
      hasHydrated: false,
      hasLoadedRemote: false,
      markHydrated: () => set({ hasHydrated: true }),
      markRemoteLoaded: () => set({ hasLoadedRemote: true }),
      mergeRecord: (record) => {
        const normalizedRecord = pilotRecordSchema.parse(record)
        const currentRecord = get().record
        const nextRecord = currentRecord
          ? mergePilotRecords(currentRecord, normalizedRecord)
          : normalizedRecord
        set({ record: nextRecord })
        return nextRecord
      },
      record: null,
      setRecord: (record) => {
        const normalizedRecord = pilotRecordSchema.parse(record)
        set({ record: normalizedRecord })
        return normalizedRecord
      },
    }),
    {
      merge: (persistedState, currentState) => {
        const stored = persistedState as { record?: unknown } | null
        return {
          ...currentState,
          record: parseStoredRecord(stored?.record),
        }
      },
      name: PILOT_PROFILE_STORAGE_KEY,
      partialize: (state) => ({ record: state.record }),
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
