/* oxlint-disable react/only-export-components -- Next.js route configuration shares the layout module. */

import type { ReactNode } from 'react'

import { GAME_LEVELS } from '../../../src/config/game-levels'

export const dynamicParams = false

export function generateStaticParams() {
  return GAME_LEVELS.map((level) => ({ levelId: level.id }))
}

interface GameLevelLayoutProps {
  children: ReactNode
}

export default function GameLevelLayout({ children }: GameLevelLayoutProps) {
  return children
}
