import { Button } from '@base-ui/react/button'
import { ArrowRight } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../../lib/cn'
import type { IconComponent } from '../../types/icon'

const menuButtonVariants = cva(
  [
    'group relative mt-2 grid min-h-16 w-full',
    'grid-cols-[1.5rem_minmax(0,1fr)_1.2rem] items-center gap-3.5 overflow-hidden',
    'border border-flight-300/20 border-l-2 border-l-flight-300/40',
    'bg-linear-to-r from-flight-900/90 to-flight-900/55 px-4 py-3 text-left text-flight-100/85 backdrop-blur-sm',
    'transition-[color,border-color,background-color] duration-200 motion-reduce:transition-none',
    "before:absolute before:inset-0 before:-translate-x-1/4 before:bg-linear-to-r before:from-hud/20 before:to-transparent before:opacity-0 before:transition-[opacity,transform] before:duration-200 before:content-['']",
    'motion-reduce:before:transition-none hover:border-hud/45 hover:border-l-hud hover:bg-flight-800/80 hover:text-flight-100 hover:before:translate-x-0 hover:before:opacity-100',
    'focus-visible:border-hud/45 focus-visible:border-l-hud focus-visible:bg-flight-800/80 focus-visible:text-flight-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud/60 focus-visible:before:translate-x-0 focus-visible:before:opacity-100',
    'max-[31rem]:min-h-14 max-[31rem]:grid-cols-[1.35rem_minmax(0,1fr)_1.15rem] max-[31rem]:gap-2.5',
  ],
  {
    variants: {
      primary: {
        false: '',
        true: [
          'border-hud-bright/75 border-l-hud-bright from-hud to-hud/70 text-flight-950 shadow-hud',
          'before:from-white/35',
          'hover:border-hud-bright hover:from-hud-bright hover:to-hud hover:text-flight-950',
          'focus-visible:border-hud-bright focus-visible:from-hud-bright focus-visible:to-hud focus-visible:text-flight-950',
        ],
      },
    },
    defaultVariants: {
      primary: false,
    },
  },
)

interface MenuButtonProps {
  delay?: number
  icon: IconComponent
  label: string
  onActivate: () => void
  onHover: () => void
  primary?: boolean
}

export function MenuButton({
  delay = 0,
  icon: Icon,
  label,
  onActivate,
  onHover,
  primary = false,
}: MenuButtonProps) {
  const reduceMotion = useReducedMotion()

  return (
    <Button
      className={cn(menuButtonVariants({ primary }))}
      type="button"
      aria-label={label}
      onClick={onActivate}
      onMouseEnter={onHover}
      render={
        <motion.button
          initial={reduceMotion ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={reduceMotion ? undefined : { x: -5 }}
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          transition={{
            delay: reduceMotion ? 0 : delay,
            duration: reduceMotion ? 0 : 0.32,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      }
    >
      <Icon
        className="relative"
        aria-hidden={true}
        size={20}
        strokeWidth={1.8}
      />
      <span className="relative text-[clamp(0.9rem,1.2vw,1.08rem)] font-semibold tracking-[0.1em] uppercase">
        {label}
      </span>
      <ArrowRight
        className="relative opacity-55 transition-[opacity,transform] duration-200 motion-reduce:transition-none group-hover:translate-x-1 group-hover:opacity-100 group-focus-visible:translate-x-1 group-focus-visible:opacity-100"
        aria-hidden="true"
        size={19}
      />
    </Button>
  )
}
