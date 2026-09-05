import { createPilotRecord, type PilotRecord } from './pilot-profile'
import { useProgressionStore } from '../state/progression-store'

export function applyPilotProgress(record: PilotRecord): void {
  useProgressionStore.getState().importProgress({
    bestScore: record.bestScore,
    completedFlights: record.completedFlights,
  })
}

export function createCurrentPilotRecord(record: PilotRecord): PilotRecord {
  return createPilotRecord(record, useProgressionStore.getState())
}
