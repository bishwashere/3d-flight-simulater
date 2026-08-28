'use client'

import type { ReactNode } from 'react'

import { useGameAmbience } from '../../hooks/use-game-ambience'
import { usePilotProfileSync } from '../../hooks/use-pilot-profile-sync'

interface AppClientShellProps {
  children: ReactNode
}

export function AppClientShell({ children }: AppClientShellProps) {
  useGameAmbience()
  usePilotProfileSync()

  return children
}
