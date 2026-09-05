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
      { key: 'W / S or ↑ / ↓', action: 'Pitch down / up' },
      { key: 'A / D or ← / →', action: 'Roll left / right' },
      { key: 'Q / E', action: 'Rudder left / right' },
      { key: 'Space / Ctrl', action: 'Increase / decrease power' },
    ],
  },
  {
    title: 'Aircraft systems',
    bindings: [
      { key: 'B', action: 'Wheel brakes' },
      { key: 'R', action: 'Reset aircraft' },
    ],
  },
  {
    title: 'View & session',
    bindings: [
      { key: 'C', action: 'Cycle camera' },
      { key: 'Enter / P / Esc', action: 'Pause' },
      { key: 'X', action: 'Toggle controls helper' },
      { key: 'Mouse', action: 'Optional pointer yoke' },
    ],
  },
]
