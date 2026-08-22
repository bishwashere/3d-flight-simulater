import { Compass } from 'lucide-react'

export function HomeHeader() {
  return (
    <header className="flex min-w-0 items-center justify-between">
      <div className="flex min-w-0 items-center gap-[0.85rem]">
        <span className="relative grid size-[2.9rem] shrink-0 place-items-center border border-hud/40 bg-flight-950/40 text-hud-bright shadow-hud [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,10px_100%,0_calc(100%_-_10px))] after:absolute after:-right-1 after:-bottom-1 after:size-[9px] after:border-r after:border-b after:border-hud after:content-[''] max-[31rem]:size-[2.55rem]">
          <Compass aria-hidden="true" size={25} strokeWidth={1.45} />
        </span>
        <span className="flex flex-col">
          <strong className="text-base leading-[1.2] font-[730] tracking-[0.19em]">
            COASTLINE
          </strong>
          <small className="text-[0.58rem] leading-[1.7] font-[650] tracking-[0.17em] text-flight-300 max-[31rem]:hidden">
            FLIGHT SIMULATOR
          </small>
        </span>
      </div>

      <div
        className="flex items-center gap-[1.05rem] text-[0.64rem] font-[650] tracking-[0.12em] text-flight-300 max-[47rem]:gap-[0.6rem]"
        aria-label="System status"
      >
        <span className="size-[7px] rounded-full bg-hud shadow-hud motion-safe:animate-pulse" />
        <span>READY</span>
      </div>
    </header>
  )
}
