'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <main className="fixed inset-0 grid place-items-center bg-flight-950 text-xs font-bold tracking-[0.2em] text-hud">
      RETURNING TO BASE
    </main>
  )
}
