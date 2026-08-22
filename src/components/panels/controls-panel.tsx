import { CONTROL_GROUPS } from '../../config/flight-controls'
import { MenuOverlay } from '../ui/menu-overlay'

interface ControlsPanelProps {
  onClose: () => void
  open: boolean
}

export function ControlsPanel({ onClose, open }: ControlsPanelProps) {
  return (
    <MenuOverlay title="Flight controls" onClose={onClose} open={open}>
      <div className="grid grid-cols-3 gap-3 max-[64rem]:grid-cols-2 max-[47rem]:grid-cols-1">
        {CONTROL_GROUPS.map((group) => (
          <section
            className="border border-flight-500/25 bg-flight-800/25 p-4 last:max-[64rem]:col-span-2 last:max-[47rem]:col-span-1"
            key={group.title}
          >
            <h3 className="border-b border-flight-500/25 pb-3 text-[0.68rem] font-semibold tracking-[0.12em] text-flight-100 uppercase">
              {group.title}
            </h3>
            {group.bindings.map((binding) => (
              <div
                className="grid min-h-12 grid-cols-[minmax(4.5rem,auto)_1fr] items-center gap-3 border-b border-flight-300/10 last:border-b-0"
                key={binding.key}
              >
                <kbd className="justify-self-start border border-hud/35 bg-hud/10 px-2 py-1.5 font-display text-[0.57rem] leading-none font-semibold tracking-[0.08em] text-hud-bright shadow-[inset_0_-2px_rgb(88_230_223_/_0.12)]">
                  {binding.key}
                </kbd>
                <span className="font-body text-xs leading-[1.35] text-flight-300">
                  {binding.action}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </MenuOverlay>
  )
}
