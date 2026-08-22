import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'

const segmentClassName = [
  'min-w-[4.6rem] border-r border-flight-500/30 bg-transparent px-3 py-2.5',
  'text-[0.57rem] font-semibold tracking-[0.11em] text-flight-500 uppercase',
  'transition-colors duration-200 last:border-r-0 motion-reduce:transition-none',
  'hover:bg-hud/10 hover:text-flight-100 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hud',
  'data-pressed:bg-hud data-pressed:text-flight-950 data-pressed:hover:bg-hud-bright',
  'max-[47rem]:min-w-0 max-[47rem]:flex-1',
].join(' ')

interface SegmentedOption<TValue extends string> {
  label: string
  value: TValue
}

interface SegmentedControlProps<TValue extends string> {
  label: string
  onChange: (value: TValue) => void
  options: readonly SegmentedOption<TValue>[]
  value: TValue
}

export function SegmentedControl<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: SegmentedControlProps<TValue>) {
  return (
    <ToggleGroup
      className="flex border border-flight-500/30 max-[47rem]:col-[2/-1] max-[47rem]:w-full"
      aria-label={label}
      value={[value]}
      onValueChange={(nextValue) => {
        const selectedValue = nextValue.at(0)

        if (selectedValue) {
          onChange(selectedValue)
        }
      }}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          className={segmentClassName}
          value={option.value}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
