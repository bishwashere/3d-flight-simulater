import type { ReactNode } from 'react'

interface LegacyGameLayoutProps {
  children: ReactNode
}

export default function LegacyGameLayout({ children }: LegacyGameLayoutProps) {
  return children
}
