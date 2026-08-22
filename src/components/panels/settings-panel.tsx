import { Button } from '@base-ui/react/button'
import {
  Gauge,
  Headphones,
  MousePointer2,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react'
import type { MenuAudioController } from '../../hooks/use-menu-audio'
import {
  useSettingsStore,
  type QualityPreset,
} from '../../state'
import { MenuOverlay } from '../ui/menu-overlay'
import { SegmentedControl } from '../ui/segmented-control'
import { SettingCopy, SettingRow } from '../ui/setting-row'
import { ToggleSetting } from '../ui/toggle-setting'
import { VolumeSlider } from '../ui/volume-slider'

interface SettingsPanelProps {
  audio: MenuAudioController
  onClose: () => void
  open: boolean
}

const QUALITY_OPTIONS: readonly {
  label: string
  value: QualityPreset
}[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

export function SettingsPanel({
  audio,
  onClose,
  open,
}: SettingsPanelProps) {
  const pointerYokeEnabled = useSettingsStore(
    (state) => state.pointerYokeEnabled,
  )
  const qualityPreset = useSettingsStore((state) => state.qualityPreset)
  const resetSettings = useSettingsStore((state) => state.resetSettings)
  const setPointerYokeEnabled = useSettingsStore(
    (state) => state.setPointerYokeEnabled,
  )
  const setQualityPreset = useSettingsStore(
    (state) => state.setQualityPreset,
  )

  const chooseQuality = (quality: QualityPreset) => {
    setQualityPreset(quality)
    audio.play('click')
  }

  const togglePointerYoke = (enabled: boolean) => {
    setPointerYokeEnabled(enabled)
    audio.play('click')
  }

  const restoreDefaults = () => {
    resetSettings()
    audio.play('confirm')
  }

  return (
    <MenuOverlay title="Settings" onClose={onClose} open={open}>
      <div className="grid gap-4">
        <section className="overflow-hidden border border-flight-500/25 bg-flight-800/25">
          <div className="flex items-center gap-2 border-b border-flight-500/25 bg-hud/5 px-4 py-3 text-hud">
            <Headphones aria-hidden="true" size={18} />
            <h3 className="text-[0.68rem] font-semibold tracking-[0.12em] text-flight-100 uppercase">
              Audio
            </h3>
          </div>
          <SettingRow layout="range">
            <Volume2 aria-hidden="true" size={20} strokeWidth={1.7} />
            <SettingCopy
              label="Interface volume"
              labelFor="settings-volume"
            />
            <VolumeSlider
              id="settings-volume"
              label="Interface volume"
              value={audio.volume}
              onChange={audio.setVolume}
            />
          </SettingRow>
          <ToggleSetting
            checked={audio.enabled}
            icon={Headphones}
            label="Interface sounds"
            onChange={() => audio.toggle()}
          />
        </section>

        <section className="overflow-hidden border border-flight-500/25 bg-flight-800/25">
          <div className="flex items-center gap-2 border-b border-flight-500/25 bg-hud/5 px-4 py-3 text-hud">
            <SlidersHorizontal aria-hidden="true" size={18} />
            <h3 className="text-[0.68rem] font-semibold tracking-[0.12em] text-flight-100 uppercase">
              Simulation defaults
            </h3>
          </div>
          <SettingRow layout="quality">
            <Gauge aria-hidden="true" size={20} strokeWidth={1.7} />
            <SettingCopy label="Rendering quality" />
            <SegmentedControl
              label="Rendering quality"
              options={QUALITY_OPTIONS}
              value={qualityPreset}
              onChange={chooseQuality}
            />
          </SettingRow>
          <ToggleSetting
            checked={pointerYokeEnabled}
            icon={MousePointer2}
            label="Mouse yoke"
            onChange={togglePointerYoke}
          />
        </section>

        <Button
          className="flex items-center gap-2 justify-self-end bg-transparent py-2 text-[0.59rem] font-semibold tracking-[0.1em] text-flight-300 uppercase transition-colors hover:text-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          type="button"
          onClick={restoreDefaults}
        >
          <RotateCcw aria-hidden="true" size={16} />
          Restore defaults
        </Button>
      </div>
    </MenuOverlay>
  )
}
