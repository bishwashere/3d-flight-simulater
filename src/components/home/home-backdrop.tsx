import { motion, useReducedMotion } from 'motion/react'
import coastalFlightMenu from '../../assets/menu/coastal-flight-menu.webp'

export function HomeBackdrop() {
  const reduceMotion = useReducedMotion()

  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden bg-flight-950"
      aria-hidden="true"
    >
      <motion.img
        className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-center contrast-[1.04] saturate-[0.9]"
        src={coastalFlightMenu}
        alt=""
        initial={false}
        animate={
          reduceMotion
            ? { scale: 1.02 }
            : { scale: [1.02, 1.045, 1.02], x: [0, -5, 0], y: [0, -3, 0] }
        }
        transition={{ duration: 20, ease: 'easeInOut', repeat: Infinity }}
      />

      <div className="absolute inset-0 bg-linear-to-r from-flight-950/88 via-flight-900/15 to-flight-950/70" />
      <div className="absolute inset-0 bg-linear-to-t from-flight-950/90 via-transparent to-flight-950/46" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,transparent_0%,transparent_34%,rgb(5_13_18/0.38)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:5rem_5rem] text-hud/[0.06] opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent_62%)]" />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07] mix-blend-soft-light"
        preserveAspectRatio="none"
      >
        <filter id="scene-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".9"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#scene-noise)" />
      </svg>
    </div>
  )
}
