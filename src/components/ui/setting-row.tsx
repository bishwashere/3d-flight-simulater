import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const settingRowVariants = cva(
  [
    'grid min-h-[4.6rem] items-center gap-3.5 border-b border-flight-300/10 px-4 py-3',
    'last:border-b-0 [&>svg]:text-flight-500',
  ],
  {
    variants: {
      layout: {
        default: 'grid-cols-[auto_minmax(0,1fr)_auto]',
        quality: 'grid-cols-[auto_minmax(0,1fr)_auto]',
        range: [
          'grid-cols-[auto_minmax(12rem,1fr)_minmax(10rem,0.7fr)]',
          'max-[47rem]:grid-cols-[auto_minmax(0,1fr)_auto]',
          'max-[47rem]:[&>*:last-child]:col-[2/-1]',
        ],
      },
    },
    defaultVariants: {
      layout: 'default',
    },
  },
)

interface SettingRowProps extends VariantProps<typeof settingRowVariants> {
  children: ReactNode
  className?: string
}

export function SettingRow({
  children,
  className,
  layout,
}: SettingRowProps) {
  return (
    <div className={cn(settingRowVariants({ layout }), className)}>
      {children}
    </div>
  )
}

interface SettingCopyProps {
  description?: string
  label: string
  labelFor?: string
}

export function SettingCopy({
  description,
  label,
  labelFor,
}: SettingCopyProps) {
  const labelClassName =
    'text-xs font-semibold tracking-[0.06em] text-flight-100 uppercase'

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {labelFor ? (
        <label className={labelClassName} htmlFor={labelFor}>
          {label}
        </label>
      ) : (
        <strong className={labelClassName}>{label}</strong>
      )}
      {description ? (
        <span className="font-body text-xs leading-5 text-flight-500">
          {description}
        </span>
      ) : null}
    </div>
  )
}
