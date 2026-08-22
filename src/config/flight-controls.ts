export interface ControlBinding {
  action: string
  key: string
}

export interface ControlGroup {
  bindings: readonly ControlBinding[]
  title: string
}

export const CONTROL_GROUPS: readonly ControlGroup[] = [
  {
    title: 'Flight controls',
    bindings: [
      { key: 'W / S', action: 'Pitch down / up' },
      { key: 'A / D', action: 'Roll left / right' },
      { key: 'Q / E', action: 'Rudder left / right' },
      { key: 'Shift / Ctrl', action: 'Increase / decrease throttle' },
    ],
  },
  {
    title: 'Aircraft systems',
    bindings: [
      { key: 'B', action: 'Wheel brakes' },
      { key: 'F', action: 'Cycle flaps' },
      { key: 'G', action: 'Landing gear' },
      { key: 'R', action: 'Reset aircraft' },
    ],
  },
  {
    title: 'View & session',
    bindings: [
      { key: 'C', action: 'Cycle camera' },
      { key: 'M', action: 'Toggle minimap' },
      { key: 'P / Esc', action: 'Pause' },
      { key: 'Gamepad', action: 'Standard dual-stick layout' },
    ],
  },
]
