import '@fontsource-variable/google-sans-flex/wght.css'
import '../src/index.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AppClientShell } from '../src/components/app/app-client-shell'

// oxlint-disable-next-line react/only-export-components -- Next.js reads metadata from the root layout.
export const metadata: Metadata = {
  description: 'A geometric coastal flight simulator.',
  title: 'Coastal Flight Simulator',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppClientShell>{children}</AppClientShell>
      </body>
    </html>
  )
}
