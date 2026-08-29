import { useEffect, useRef } from 'react'

import { mergePilotRecords } from '../lib/pilot-profile'
import {
  isPilotStorageUnconfigured,
  loadPilotRecord,
  savePilotRecord,
} from '../lib/pilot-api'
import {
  applyPilotProgress,
  createCurrentPilotRecord,
} from '../lib/pilot-progress'
import { usePilotProfileStore } from '../state'

export function usePilotProfileSync(): void {
  const attemptedInitialLoad = useRef(false)
  const hasHydrated = usePilotProfileStore((state) => state.hasHydrated)

  useEffect(() => {
    let active = true

    void Promise.resolve(usePilotProfileStore.persist.rehydrate()).finally(
      () => {
        if (active) {
          usePilotProfileStore.getState().markHydrated()
        }
      },
    )

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!hasHydrated || attemptedInitialLoad.current) {
      return
    }

    attemptedInitialLoad.current = true
    const localRecord = usePilotProfileStore.getState().record

    if (!localRecord) {
      usePilotProfileStore.getState().markRemoteLoaded()
      return
    }

    const controller = new AbortController()

    const synchronize = async () => {
      try {
        const remoteRecord = await loadPilotRecord(
          localRecord.email,
          controller.signal,
        )
        const localSnapshot = createCurrentPilotRecord(localRecord)
        const mergedRecord = remoteRecord
          ? mergePilotRecords(remoteRecord, localSnapshot)
          : localSnapshot

        applyPilotProgress(mergedRecord)
        usePilotProfileStore.getState().setRecord(mergedRecord)
        const latestSnapshot = createCurrentPilotRecord(mergedRecord)
        const savedRecord = await savePilotRecord(latestSnapshot)

        if (!controller.signal.aborted) {
          usePilotProfileStore.getState().setRecord(savedRecord)
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          !isPilotStorageUnconfigured(error)
        ) {
          console.warn('[Coastal Flight] Pilot cloud sync unavailable', error)
        }
      } finally {
        if (!controller.signal.aborted) {
          usePilotProfileStore.getState().markRemoteLoaded()
        }
      }
    }

    void synchronize()

    return () => {
      controller.abort()
      attemptedInitialLoad.current = false
    }
  }, [hasHydrated])
}
