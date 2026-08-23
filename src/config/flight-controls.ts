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
      { key: 'I', action: 'Start engine' },
      { key: 'B', action: 'Wheel brakes' },
      { key: 'R', action: 'Reset aircraft' },
    ],
  },
  {
    title: 'View & session',
    bindings: [
      { key: 'C', action: 'Cycle camera' },
      { key: 'P / Esc', action: 'Pause' },
      { key: 'Mouse', action: 'Optional pointer yoke' },
    ],
  },
]
