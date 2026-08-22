import { Button } from '@base-ui/react/button'
import { BadgeInfo, Volume2, VolumeX } from 'lucide-react'
import type { MenuAudioController } from '../../hooks/use-menu-audio'
import { VolumeSlider } from '../ui/volume-slider'

interface StatusRailProps {
  audio: MenuAudioController
  onOpenCredits: () => void
}

export function StatusRail({ audio, onOpenCredits }: StatusRailProps) {
  return (
    <footer className="flex min-w-0 items-center justify-end border-t border-flight-300/20 pt-[0.85rem]">
      <div className="flex w-full max-w-sm items-center justify-end gap-[clamp(0.75rem,1.7vw,1.6rem)]">
        <div className="flex items-center gap-[0.55rem]">
          <Button
            className="inline-grid size-[2.35rem] shrink-0 place-items-center border border-flight-300/20 bg-transparent text-flight-300 transition-colors duration-200 motion-reduce:transition-none hover:border-hud/45 hover:text-hud-bright focus-visible:border-hud focus-visible:text-hud-bright focus-visible:outline-none"
            onClick={audio.toggle}
            aria-label={
              audio.enabled
                ? 'Mute interface sounds'
                : 'Enable interface sounds'
            }
            aria-pressed={!audio.enabled}
          >
            {audio.enabled ? (
              <Volume2 aria-hidden="true" size={19} />
            ) : (
              <VolumeX aria-hidden="true" size={19} />
            )}
          </Button>
          <VolumeSlider
            className="w-[clamp(5.5rem,12vw,9rem)]"
            id="master-volume"
            label="Interface sound volume"
            value={audio.volume}
            onChange={audio.setVolume}
            showValue={false}
          />
        </div>
        <Button
          className="inline-grid grid-flow-col place-items-center gap-[0.45rem] bg-transparent px-[0.15rem] py-[0.6rem] text-[0.59rem] font-[650] tracking-[0.14em] text-flight-300 uppercase transition-colors duration-200 motion-reduce:transition-none hover:text-hud-bright focus-visible:text-hud-bright focus-visible:outline-none"
          onClick={onOpenCredits}
        >
          <BadgeInfo aria-hidden="true" size={16} />
          Credits
        </Button>
      </div>
    </footer>
  )
}
