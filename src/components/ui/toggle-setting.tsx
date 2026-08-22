import { Switch } from '@base-ui/react/switch'
import type { IconComponent } from '../../types/icon'
import { SettingCopy, SettingRow } from './setting-row'

interface ToggleSettingProps {
  checked: boolean
  description?: string
  icon: IconComponent
  label: string
  onChange: (checked: boolean) => void
}

export function ToggleSetting({
  checked,
  description,
  icon: Icon,
  label,
  onChange,
}: ToggleSettingProps) {
  return (
    <SettingRow>
      <Icon aria-hidden={true} size={20} strokeWidth={1.7} />
      <SettingCopy description={description} label={label} />
      <Switch.Root
        className="relative h-6 w-12 shrink-0 rounded-full border border-flight-500/30 bg-flight-950/75 p-0 transition-colors duration-200 motion-reduce:transition-none data-checked:border-hud/45 data-checked:bg-hud/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud focus-visible:ring-offset-2 focus-visible:ring-offset-flight-900"
        checked={checked}
        aria-label={label}
        onCheckedChange={onChange}
      >
        <Switch.Thumb className="absolute top-1 left-1 size-3.5 rounded-full bg-flight-500 transition-[background-color,box-shadow,translate] duration-200 motion-reduce:transition-none data-checked:translate-x-6 data-checked:bg-hud data-checked:shadow-hud" />
      </Switch.Root>
    </SettingRow>
  )
}
