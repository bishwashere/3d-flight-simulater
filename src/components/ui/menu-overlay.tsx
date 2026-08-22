import { type ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import {
  motion,
  type HTMLMotionProps,
  useReducedMotion,
} from 'motion/react'

interface MenuOverlayProps {
  children: ReactNode
  onClose: () => void
  open: boolean
  title: string
}

export function MenuOverlay({
  children,
  onClose,
  open,
  title,
}: MenuOverlayProps) {
  const reduceMotion = useReducedMotion()
  const duration = reduceMotion ? 0 : 0.24

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop
          className="fixed inset-0 z-20 min-h-dvh bg-flight-950/80 backdrop-blur-md backdrop-saturate-75 supports-[-webkit-touch-callout:none]:absolute"
          render={(props, state) => (
            <motion.div
              {...(props as HTMLMotionProps<'div'>)}
              initial={false}
              animate={{ opacity: state.open ? 1 : 0 }}
              transition={{ duration }}
            />
          )}
        />
        <Dialog.Viewport className="fixed inset-0 z-20 grid place-items-center overflow-y-auto p-[clamp(0.8rem,3vw,2rem)] [@media(orientation:landscape)_and_(max-height:36rem)]:items-start">
          <Dialog.Popup
            className="relative max-h-[min(48rem,calc(100svh-2rem))] w-full max-w-[58rem] overflow-hidden border border-hud/40 bg-linear-to-br from-hud/10 via-flight-900 to-flight-950 text-flight-100 shadow-panel outline-none [clip-path:polygon(0_0,calc(100%_-_24px)_0,100%_24px,100%_100%,24px_100%,0_calc(100%_-_24px))] after:pointer-events-none after:absolute after:inset-0 after:border-t-2 after:border-hud after:[clip-path:polygon(0_0,9rem_0,9rem_2px,0_2px)] after:content-[''] focus-visible:ring-2 focus-visible:ring-hud/60 [@media(orientation:landscape)_and_(max-height:36rem)]:max-h-none"
            render={(props, state) => (
              <motion.div
                {...(props as HTMLMotionProps<'div'>)}
                initial={false}
                animate={{
                  opacity: state.open ? 1 : 0,
                  scale: state.open || reduceMotion ? 1 : 0.985,
                  y: state.open || reduceMotion ? 0 : 12,
                }}
                transition={{
                  duration,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            )}
          >
            <header className="flex min-h-[4.6rem] items-center justify-between border-b border-flight-500/25 bg-flight-800/40 px-[clamp(1.2rem,3vw,2.2rem)] py-4">
              <Dialog.Title className="text-[clamp(1.2rem,2.4vw,1.75rem)] leading-[1.1] font-semibold tracking-[0.04em] uppercase">
                {title}
              </Dialog.Title>
              <Dialog.Close
                className="inline-grid size-10 place-items-center border border-flight-500/30 bg-transparent text-flight-300 transition-colors duration-200 motion-reduce:transition-none hover:border-hud/50 hover:bg-hud/10 hover:text-hud-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud"
                aria-label={`Close ${title}`}
              >
                <X aria-hidden="true" size={21} strokeWidth={1.8} />
              </Dialog.Close>
            </header>

            <div className="max-h-[calc(100svh-7rem)] overflow-y-auto overscroll-contain p-[clamp(1.2rem,3vw,2.2rem)] [scrollbar-color:var(--color-flight-500)_transparent] [scrollbar-width:thin] [@media(orientation:landscape)_and_(max-height:36rem)]:max-h-none">
              {children}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
