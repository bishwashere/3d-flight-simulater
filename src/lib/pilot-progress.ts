import { createPilotRecord, getGameLevelId, type PilotRecord } from './pilot-profile'
import { useProgressionStore } from '../state/progression-store'

export function applyPilotProgress(record: PilotRecord): void {
  const completeLevel = useProgressionStore.getState().completeLevel

  for (const level of [...record.levels].sort((a, b) => a.id - b.id)) {
    if (level.passed) {
      completeLevel(getGameLevelId(level.id), level.score)
    }
  }
}

export function createCurrentPilotRecord(record: PilotRecord): PilotRecord {
  return createPilotRecord(record, useProgressionStore.getState())
}
