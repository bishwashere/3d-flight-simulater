import type { ComponentType } from 'react'

export type IconComponent = ComponentType<{
  'aria-hidden'?: boolean
  className?: string
  size?: number
  strokeWidth?: number
}>
