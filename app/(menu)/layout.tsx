'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

const HomeScreen = dynamic(
  () =>
    import('../../src/components/home/home-screen').then(
      (module) => module.HomeScreen,
    ),
  {
    loading: () => (
      <main className="fixed inset-0 grid place-items-center bg-flight-950 text-flight-100">
        <span className="text-xs font-bold tracking-[0.2em] text-hud">
          LOADING MENU
        </span>
      </main>
    ),
    ssr: false,
  },
)

interface MenuLayoutProps {
  children: ReactNode
}

export default function MenuLayout({ children }: MenuLayoutProps) {
  return (
    <>
      <HomeScreen />
      {children}
    </>
  )
}
