import { Slider } from '@base-ui/react/slider'
import type { IconComponent } from '../../types/icon'
import { SettingCopy, SettingRow } from './setting-row'

interface SettingSliderProps {
  description?: string
  formatValue: (value: number) => string
  icon: IconComponent
  id: string
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step: number
  value: number
}

export function SettingSlider({
  description,
  formatValue,
  icon: Icon,
  id,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: SettingSliderProps) {
  return (
    <SettingRow layout="range">
      <Icon aria-hidden={true} size={20} strokeWidth={1.7} />
      <SettingCopy description={description} label={label} labelFor={id} />
      <Slider.Root
        className="grid min-w-0 grid-cols-[minmax(8rem,1fr)_4rem] items-center gap-3"
        id={id}
        max={max}
        min={min}
        step={step}
        value={value}
        onValueChange={onChange}
      >
        <Slider.Control className="flex h-8 touch-none items-center py-2 select-none">
          <Slider.Track className="relative h-1 w-full bg-flight-500/30">
            <Slider.Indicator className="absolute h-full bg-hud shadow-hud" />
            <Slider.Thumb
              className="size-3.5 rounded-full border-2 border-flight-950 bg-hud shadow-hud focus-within:outline-none focus-within:ring-2 focus-within:ring-hud-bright focus-within:ring-offset-2 focus-within:ring-offset-flight-900 data-dragging:scale-110"
              getAriaLabel={() => label}
              getAriaValueText={(_formattedValue, nextValue) =>
                formatValue(nextValue)
              }
            />
          </Slider.Track>
        </Slider.Control>
        <Slider.Value className="text-right text-xs text-hud-bright tabular-nums">
          {(_formattedValues, values) => formatValue(values[0] ?? value)}
        </Slider.Value>
      </Slider.Root>
    </SettingRow>
  )
}
