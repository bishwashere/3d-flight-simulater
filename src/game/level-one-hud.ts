import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture.js'
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture.js'

import type { Scene } from '@babylonjs/core/scene.js'
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture.js'
import { Control } from '@babylonjs/gui/2D/controls/control.js'
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle.js'
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock.js'

import type { GameLevelDefinition, GameLevelTheme } from '../config/game-levels'
import type { LevelOneTelemetry } from './level-one-types'

export interface LevelOneHud {
  dispose: () => void
  setControlsHelperVisible: (visible: boolean) => void
  setVisible: (visible: boolean) => void
  update: (telemetry: LevelOneTelemetry) => void
}

const AMBER = '#ffc66d'
const RED = '#ff665f'

const HUD_THEMES: Readonly<
  Record<GameLevelTheme, { border: string; dim: string; primary: string }>
> = {
  amber: {
    border: '#f1b95866',
    dim: '#d9ad67',
    primary: '#ffd37a',
  },
  cyan: {
    border: '#67dacc66',
    dim: '#6fd3c5',
    primary: '#8fffe7',
  },
  violet: {
    border: '#bb86ee66',
    dim: '#b994d7',
    primary: '#d8afff',
  },
}

function formatFlightTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function createText(
  name: string,
  text: string,
  fontSize: number,
  color: string,
): TextBlock {
  const control = new TextBlock(name, text)
  control.color = color
  control.fontFamily = 'Google Sans Flex, Google Sans, Arial, sans-serif'
  control.fontSize = fontSize
  control.fontWeight = '650'
  control.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  control.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  control.shadowColor = '#021013'
  control.shadowBlur = 8
  return control
}

function createHudPanel(
  name: string,
  width: string,
  height: string,
  borderColor: string,
): Rectangle {
  const panel = new Rectangle(name)
  panel.width = width
  panel.height = height
  panel.background = '#03151acc'
  panel.color = borderColor
  panel.thickness = 1
  panel.cornerRadius = 3
  return panel
}

export function createLevelOneHud(
  scene: Scene,
  initialTelemetry: LevelOneTelemetry,
  level: GameLevelDefinition,
): LevelOneHud {
  const theme = HUD_THEMES[level.theme]
  const themedText = (
    name: string,
    text: string,
    fontSize: number,
    color = theme.primary,
  ) => createText(name, text, fontSize, color)
  const themedPanel = (name: string, width: string, height: string) =>
    createHudPanel(name, width, height, theme.border)

  const texture = AdvancedDynamicTexture.CreateFullscreenUI(
    'level-one-flight-hud',
    true,
    scene,
  )
  texture.idealWidth = 1_920
  texture.renderAtIdealSize = true

  const flightPanel = themedPanel('flight-data-panel', '306px', '146px')
  flightPanel.left = '28px'
  flightPanel.top = '28px'
  flightPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  flightPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  texture.addControl(flightPanel)

  const levelLabel = themedText(
    'level-label',
    `LEVEL ${level.number}  //  ${level.name.toUpperCase()}`,
    13,
  )
  levelLabel.left = '17px'
  levelLabel.top = '-54px'
  levelLabel.width = '270px'
  levelLabel.height = '24px'
  flightPanel.addControl(levelLabel)

  const primaryData = themedText('primary-flight-data', '', 20)
  primaryData.left = '17px'
  primaryData.top = '-4px'
  primaryData.width = '276px'
  primaryData.height = '68px'
  primaryData.lineSpacing = '10px'
  flightPanel.addControl(primaryData)

  const secondaryData = themedText('secondary-flight-data', '', 12, theme.dim)
  secondaryData.left = '17px'
  secondaryData.top = '49px'
  secondaryData.width = '276px'
  secondaryData.height = '27px'
  flightPanel.addControl(secondaryData)

  const controlsPanel = themedPanel('controls-helper-panel', '354px', '216px')
  controlsPanel.left = '28px'
  controlsPanel.top = '186px'
  controlsPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  controlsPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  texture.addControl(controlsPanel)

  const controlsLabel = themedText(
    'controls-helper-label',
    'CONTROLS  //  X TOGGLE',
    11,
    theme.dim,
  )
  controlsLabel.left = '20px'
  controlsLabel.top = '-88px'
  controlsLabel.width = '314px'
  controlsLabel.height = '22px'
  controlsPanel.addControl(controlsLabel)

  const controlsText = themedText('controls-helper-text', '', 13)
  controlsText.left = '20px'
  controlsText.top = '22px'
  controlsText.width = '314px'
  controlsText.height = '160px'
  controlsText.lineSpacing = '4px'
  controlsPanel.addControl(controlsText)

  const objectivePanel = themedPanel('objective-panel', '440px', '80px')
  objectivePanel.top = '28px'
  objectivePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  objectivePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  texture.addControl(objectivePanel)

  const objectiveLabel = themedText(
    'objective-label',
    'OBJECTIVE',
    11,
    theme.dim,
  )
  objectiveLabel.left = '16px'
  objectiveLabel.top = '-21px'
  objectiveLabel.width = '408px'
  objectiveLabel.height = '20px'
  objectivePanel.addControl(objectiveLabel)

  const objectiveText = themedText('objective-text', '', 18)
  objectiveText.left = '16px'
  objectiveText.top = '11px'
  objectiveText.width = '408px'
  objectiveText.height = '34px'
  objectivePanel.addControl(objectiveText)

  const statusPanel = themedPanel('status-panel', '230px', '146px')
  statusPanel.left = '-28px'
  statusPanel.top = '28px'
  statusPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT
  statusPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  texture.addControl(statusPanel)

  const statusText = themedText('aircraft-status', '', 15)
  statusText.left = '16px'
  statusText.width = '198px'
  statusText.height = '112px'
  statusText.lineSpacing = '9px'
  statusPanel.addControl(statusText)

  const horizon = new Rectangle('artificial-horizon')
  horizon.width = '220px'
  horizon.height = '2px'
  horizon.background = theme.primary
  horizon.color = theme.primary
  horizon.thickness = 0
  horizon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  horizon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  horizon.shadowColor = '#021013'
  horizon.shadowBlur = 9
  texture.addControl(horizon)

  const horizonLeft = themedText('horizon-left-mark', '⌟', 30)
  horizonLeft.width = '44px'
  horizonLeft.height = '44px'
  horizonLeft.left = '-74px'
  horizonLeft.top = '10px'
  horizonLeft.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  horizonLeft.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  horizonLeft.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  texture.addControl(horizonLeft)

  const horizonRight = themedText('horizon-right-mark', '⌞', 30)
  horizonRight.width = '44px'
  horizonRight.height = '44px'
  horizonRight.left = '74px'
  horizonRight.top = '10px'
  horizonRight.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  horizonRight.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  horizonRight.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  texture.addControl(horizonRight)

  const crosshair = themedText('flight-crosshair', '·  ─  ◇  ─  ·', 21)
  crosshair.width = '210px'
  crosshair.height = '38px'
  crosshair.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  crosshair.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  crosshair.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  texture.addControl(crosshair)

  const warning = themedText('flight-warning', '', 22, AMBER)
  warning.width = '520px'
  warning.height = '44px'
  warning.top = '142px'
  warning.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  warning.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  warning.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  texture.addControl(warning)

  const cameraLabel = themedText('camera-mode', '', 12, theme.dim)
  cameraLabel.width = '260px'
  cameraLabel.height = '26px'
  cameraLabel.left = '-24px'
  cameraLabel.top = '-22px'
  cameraLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT
  cameraLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  cameraLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT
  texture.addControl(cameraLabel)

  const progress = themedText('checkpoint-progress', '', 15)
  progress.width = '680px'
  progress.height = '28px'
  progress.left = '28px'
  progress.top = '-22px'
  progress.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  progress.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  texture.addControl(progress)

  const update = (telemetry: LevelOneTelemetry) => {
    primaryData.text = `SPD  ${telemetry.speed.toFixed(0).padStart(3, '0')} km/h     ALT  ${telemetry.altitude.toFixed(0).padStart(3, '0')} m\nHDG  ${telemetry.heading.toFixed(0).padStart(3, '0')}°          VSI  ${telemetry.verticalSpeed >= 0 ? '+' : ''}${telemetry.verticalSpeed.toFixed(1)} m/s`
    secondaryData.text = `${telemetry.backend.toUpperCase()}  ·  ${telemetry.fps.toFixed(0)} FPS  ·  ${Math.round(telemetry.renderScale * 100)}%`
    controlsText.text =
      'W / S       [↑] [↓]   PITCH\nA / D       [←] [→]   ROLL\nQ / E                 RUDDER\nSPACE / CTRL          POWER\nENTER / ESC           PAUSE\nX                     TOGGLE'
    objectiveText.text = `${telemetry.objective}  ${telemetry.checkpointDistance > 1 ? `// ${telemetry.checkpointDistance.toFixed(0)} m` : ''}`
    statusText.text = `ENGINE   ${telemetry.engineRunning ? 'ON' : 'OFF'}\nTHROTTLE  ${Math.round(telemetry.throttle * 100).toString().padStart(3, '0')}%\nGEAR      DOWN\nDAMAGE    ${Math.round(telemetry.damage).toString().padStart(3, '0')}%`
    progress.text = `SCORE  ${telemetry.score.toString().padStart(4, '0')}     AIR  ${formatFlightTime(telemetry.airborneSeconds)}     COINS  ${telemetry.coinsCollected}/${telemetry.coinCount}     RINGS  ${telemetry.checkpointIndex}/${telemetry.checkpointCount}`
    cameraLabel.text = `${telemetry.cameraMode.toUpperCase()} CAM  //  C TO SWITCH`

    horizon.rotation = (-telemetry.roll * Math.PI) / 180
    horizon.top = `${Math.max(-86, Math.min(86, telemetry.pitch * 3.2))}px`

    if (telemetry.phase === 'crashed') {
      warning.text = 'CRITICAL  //  AIRCRAFT LOST'
      warning.color = RED
    } else if (telemetry.stalled) {
      warning.text = 'STALL  //  LOWER NOSE'
      warning.color = AMBER
    } else if (telemetry.powerReminder) {
      warning.text = 'PRESS SPACE  //  TAKE FLIGHT'
      warning.color = AMBER
    } else if (telemetry.speed > 245) {
      warning.text = 'OVERSPEED'
      warning.color = AMBER
    } else if (telemetry.phase === 'complete') {
      warning.text = 'LEVEL COMPLETE'
      warning.color = theme.primary
    } else {
      warning.text = ''
    }
  }

  update(initialTelemetry)

  return {
    dispose: () => texture.dispose(),
    setControlsHelperVisible: (visible) => {
      controlsPanel.isVisible = visible
    },
    setVisible: (visible) => {
      texture.rootContainer.isVisible = visible
    },
    update,
  }
}
