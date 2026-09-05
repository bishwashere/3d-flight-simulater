import { motion, useReducedMotion } from 'motion/react'

export function HeroSection() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      className="max-w-3xl"
      aria-labelledby="home-title"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <h1
        id="home-title"
        className="m-0 max-w-[10ch] text-[clamp(4.2rem,9.5vw,9.4rem)] leading-[0.73] font-[760] tracking-[-0.065em] text-flight-100 drop-shadow-xl max-[64rem]:text-[clamp(4rem,10vw,7rem)] max-[47rem]:text-[clamp(4rem,20vw,6.7rem)] max-[31rem]:text-[clamp(3.45rem,20vw,5.6rem)] [@media(orientation:landscape)_and_(max-height:36rem)]:text-[clamp(3.8rem,12vh,5.4rem)]"
        aria-label="Own the horizon"
      >
        <span className="block text-[0.49em] leading-[1.15] font-[540] tracking-[0.08em] text-transparent [-webkit-text-stroke:1px_rgb(232_244_243_/_0.78)]">
          OWN THE
        </span>
        HORIZON
      </h1>
      <p className="mt-[1.8rem] max-w-[38rem] font-body text-[clamp(0.93rem,1.15vw,1.07rem)] leading-[1.65] font-normal text-balance text-flight-100/80 max-[47rem]:max-w-[33rem] [@media(orientation:landscape)_and_(max-height:36rem)]:mt-4 [@media(orientation:landscape)_and_(max-height:36rem)]:text-[0.83rem]">
        An endless procedural archipelago. Fly anywhere; land when you are ready.
      </p>
    </motion.section>
  )
}
