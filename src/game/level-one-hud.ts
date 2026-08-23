import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture.js'
import { Control } from '@babylonjs/gui/2D/controls/control.js'
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle.js'
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock.js'

import type { Scene } from '@babylonjs/core/scene.js'

import type { LevelOneTelemetry } from './level-one-types'

export interface LevelOneHud {
  dispose: () => void
  setVisible: (visible: boolean) => void
  update: (telemetry: LevelOneTelemetry) => void
}

function createText(
  name: string,
  text: string,
  fontSize: number,
  color = '#dffdfa',
): TextBlock {
  const control = new TextBlock(name, text)
  control.color = color
  control.fontFamily = 'Google Sans Flex, Arial, sans-serif'
  control.fontSize = fontSize
  control.fontWeight = '600'
  control.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  return control
}

export function createLevelOneHud(
  scene: Scene,
  initialTelemetry: LevelOneTelemetry,
): LevelOneHud {
  const texture = AdvancedDynamicTexture.CreateFullscreenUI(
    'level-one-flight-hud',
    true,
    scene,
  )
  texture.idealWidth = 1_920
  texture.renderAtIdealSize = true

  const crosshair = createText('flight-crosshair', '＋', 27, '#a3fff9')
  crosshair.width = '42px'
  crosshair.height = '42px'
  crosshair.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  crosshair.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  crosshair.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  crosshair.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  crosshair.shadowColor = '#07151d'
  crosshair.shadowBlur = 7
  texture.addControl(crosshair)

  const panel = new Rectangle('telemetry-panel')
  panel.width = '322px'
  panel.height = '126px'
  panel.left = '28px'
  panel.top = '28px'
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  panel.background = '#07151dd9'
  panel.color = '#4e727999'
  panel.cornerRadius = 7
  panel.thickness = 1
  texture.addControl(panel)

  const title = createText(
    'map-label',
    'LEVEL 1  /  KSQL AIRPORT',
    14,
    '#58e6df',
  )
  title.width = '280px'
  title.height = '24px'
  title.left = '18px'
  title.top = '12px'
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  panel.addControl(title)

  const metrics = createText('flight-metrics', '', 17)
  metrics.width = '286px'
  metrics.height = '58px'
  metrics.left = '18px'
  metrics.top = '42px'
  metrics.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  metrics.lineSpacing = '8px'
  panel.addControl(metrics)

  const backend = createText('render-backend', '', 11, '#91adb0')
  backend.width = '286px'
  backend.height = '18px'
  backend.left = '18px'
  backend.top = '101px'
  backend.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  panel.addControl(backend)

  const update = (telemetry: LevelOneTelemetry) => {
    metrics.text = `SPEED  ${telemetry.speed.toFixed(0).padStart(3, '0')} km/h     ALT  ${telemetry.altitude.toFixed(0).padStart(3, '0')} m\nFPS     ${telemetry.fps.toFixed(0).padStart(3, '0')}             SCALE  ${Math.round(telemetry.renderScale * 100)}%`
    backend.text = `${telemetry.backend.toUpperCase()}  ·  ${telemetry.meshCount} SCENE MESHES`
  }

  update(initialTelemetry)

  return {
    dispose: () => texture.dispose(),
    setVisible: (visible) => {
      texture.rootContainer.isVisible = visible
    },
    update,
  }
}
