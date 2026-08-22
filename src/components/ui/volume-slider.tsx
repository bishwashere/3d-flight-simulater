import { Slider } from '@base-ui/react/slider'
import { cn } from '../../lib/cn'

interface VolumeSliderProps {
  className?: string
  id: string
  label: string
  onChange: (volume: number) => void
  showValue?: boolean
  value: number
}

export function VolumeSlider({
  className,
  id,
  label,
  onChange,
  showValue = true,
  value,
}: VolumeSliderProps) {
  const percentage = Math.round(value * 100)

  return (
    <Slider.Root
      className={cn(
        'grid min-w-0 items-center gap-3',
        showValue ? 'grid-cols-[minmax(5rem,1fr)_3rem]' : 'grid-cols-1',
        className,
      )}
      value={percentage}
      min={0}
      max={100}
      step={1}
      onValueChange={(nextValue) => onChange(nextValue / 100)}
      id={id}
    >
      <Slider.Control className="flex h-8 touch-none items-center py-2 select-none">
        <Slider.Track className="relative h-1 w-full bg-flight-500/30">
          <Slider.Indicator className="absolute h-full bg-hud shadow-hud" />
          <Slider.Thumb
            className="size-3.5 rounded-full border-2 border-flight-950 bg-hud shadow-hud focus-within:outline-none focus-within:ring-2 focus-within:ring-hud-bright focus-within:ring-offset-2 focus-within:ring-offset-flight-900 data-dragging:scale-110"
            getAriaLabel={() => label}
          />
        </Slider.Track>
      </Slider.Control>
      {showValue ? (
        <Slider.Value
          className="min-w-[3ch] text-right text-xs text-hud-bright tabular-nums"
          id={`${id}-value`}
        >
          {(_formattedValues, values) => Math.round(values[0] ?? 0)}
        </Slider.Value>
      ) : null}
    </Slider.Root>
  )
}
