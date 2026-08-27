import { Color3 } from '@babylonjs/core/Maths/math.color.js'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js'
import type { Scene } from '@babylonjs/core/scene.js'

import type { GameLevelTheme } from '../../config/game-levels'

export interface GeometricWorldMaterials {
  aircraftAccent: StandardMaterial
  aircraftBody: StandardMaterial
  aircraftDark: StandardMaterial
  aircraftGlass: StandardMaterial
  aircraftWarning: StandardMaterial
  asphalt: StandardMaterial
  checkpointActive: StandardMaterial
  checkpointCollected: StandardMaterial
  checkpointPending: StandardMaterial
  coinGold: StandardMaterial
  cloud: StandardMaterial
  concrete: StandardMaterial
  darkMetal: StandardMaterial
  grass: StandardMaterial
  grassLight: StandardMaterial
  hangarBlue: StandardMaterial
  hangarRed: StandardMaterial
  rock: StandardMaterial
  runwayMarking: StandardMaterial
  sand: StandardMaterial
  soil: StandardMaterial
  towerGlass: StandardMaterial
  treeCanopy: StandardMaterial
  treeCanopyLight: StandardMaterial
  treeTrunk: StandardMaterial
  water: StandardMaterial
  warning: StandardMaterial
}

interface MaterialOptions {
  alpha?: number
  diffuse: Color3
  emissive?: Color3
  specular?: Color3
}

function createMaterial(
  scene: Scene,
  name: string,
  options: MaterialOptions,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)
  material.diffuseColor = options.diffuse
  material.emissiveColor = options.emissive ?? Color3.Black()
  material.specularColor = options.specular ?? new Color3(0.08, 0.08, 0.08)
  material.alpha = options.alpha ?? 1
  material.freeze()
  return material
}

export function createGeometricWorldMaterials(
  scene: Scene,
  theme: GameLevelTheme = 'cyan',
): GeometricWorldMaterials {
  const checkpointTheme = {
    amber: {
      active: new Color3(1, 0.7, 0.12),
      activeEmissive: new Color3(0.66, 0.24, 0.015),
      pending: new Color3(1, 0.9, 0.48),
      pendingEmissive: new Color3(0.24, 0.12, 0.01),
    },
    cyan: {
      active: new Color3(0.08, 0.94, 0.94),
      activeEmissive: new Color3(0.05, 0.62, 0.72),
      pending: new Color3(1, 0.61, 0.08),
      pendingEmissive: new Color3(0.2, 0.06, 0.005),
    },
    violet: {
      active: new Color3(0.72, 0.38, 1),
      activeEmissive: new Color3(0.38, 0.1, 0.68),
      pending: new Color3(1, 0.48, 0.82),
      pendingEmissive: new Color3(0.25, 0.035, 0.16),
    },
  }[theme]

  return {
    aircraftAccent: createMaterial(scene, 'material-aircraft-accent', {
      diffuse: new Color3(0.04, 0.43, 0.68),
      emissive: new Color3(0.01, 0.05, 0.08),
      specular: new Color3(0.48, 0.55, 0.6),
    }),
    aircraftBody: createMaterial(scene, 'material-aircraft-body', {
      diffuse: new Color3(0.88, 0.92, 0.9),
      specular: new Color3(0.5, 0.53, 0.54),
    }),
    aircraftDark: createMaterial(scene, 'material-aircraft-dark', {
      diffuse: new Color3(0.035, 0.045, 0.055),
      specular: new Color3(0.3, 0.32, 0.34),
    }),
    aircraftGlass: createMaterial(scene, 'material-aircraft-glass', {
      alpha: 0.88,
      diffuse: new Color3(0.035, 0.14, 0.2),
      emissive: new Color3(0.01, 0.035, 0.05),
      specular: new Color3(0.76, 0.9, 1),
    }),
    aircraftWarning: createMaterial(scene, 'material-aircraft-warning', {
      diffuse: new Color3(0.93, 0.24, 0.075),
      emissive: new Color3(0.16, 0.025, 0.005),
    }),
    asphalt: createMaterial(scene, 'material-asphalt', {
      diffuse: new Color3(0.105, 0.125, 0.14),
      specular: new Color3(0.12, 0.14, 0.16),
    }),
    checkpointActive: createMaterial(scene, 'material-checkpoint-active', {
      diffuse: checkpointTheme.active,
      emissive: checkpointTheme.activeEmissive,
      specular: new Color3(0.6, 1, 1),
    }),
    checkpointCollected: createMaterial(
      scene,
      'material-checkpoint-collected',
      {
        alpha: 0.45,
        diffuse: new Color3(0.25, 1, 0.42),
        emissive: new Color3(0.08, 0.35, 0.08),
      },
    ),
    checkpointPending: createMaterial(scene, 'material-checkpoint-pending', {
      alpha: 0.68,
      diffuse: checkpointTheme.pending,
      emissive: checkpointTheme.pendingEmissive,
    }),
    coinGold: createMaterial(scene, 'material-coin-gold', {
      diffuse: new Color3(1, 0.72, 0.055),
      emissive: new Color3(0.3, 0.11, 0.004),
      specular: new Color3(0.88, 0.68, 0.18),
    }),
    cloud: createMaterial(scene, 'material-cloud', {
      alpha: 0.82,
      diffuse: new Color3(0.93, 0.97, 1),
      emissive: new Color3(0.06, 0.075, 0.085),
      specular: Color3.Black(),
    }),
    concrete: createMaterial(scene, 'material-concrete', {
      diffuse: new Color3(0.59, 0.62, 0.61),
    }),
    darkMetal: createMaterial(scene, 'material-dark-metal', {
      diffuse: new Color3(0.095, 0.13, 0.15),
      specular: new Color3(0.4, 0.44, 0.45),
    }),
    grass: createMaterial(scene, 'material-grass', {
      diffuse: new Color3(0.17, 0.48, 0.2),
      specular: new Color3(0.035, 0.055, 0.035),
    }),
    grassLight: createMaterial(scene, 'material-grass-light', {
      diffuse: new Color3(0.31, 0.61, 0.24),
      specular: new Color3(0.035, 0.055, 0.035),
    }),
    hangarBlue: createMaterial(scene, 'material-hangar-blue', {
      diffuse: new Color3(0.14, 0.34, 0.48),
      specular: new Color3(0.22, 0.3, 0.34),
    }),
    hangarRed: createMaterial(scene, 'material-hangar-red', {
      diffuse: new Color3(0.58, 0.2, 0.16),
      specular: new Color3(0.2, 0.18, 0.16),
    }),
    rock: createMaterial(scene, 'material-rock', {
      diffuse: new Color3(0.28, 0.31, 0.29),
    }),
    runwayMarking: createMaterial(scene, 'material-runway-marking', {
      diffuse: new Color3(0.92, 0.93, 0.86),
      emissive: new Color3(0.035, 0.035, 0.03),
    }),
    sand: createMaterial(scene, 'material-sand', {
      diffuse: new Color3(0.85, 0.7, 0.38),
      specular: new Color3(0.05, 0.045, 0.025),
    }),
    soil: createMaterial(scene, 'material-soil', {
      diffuse: new Color3(0.34, 0.25, 0.15),
    }),
    towerGlass: createMaterial(scene, 'material-tower-glass', {
      alpha: 0.92,
      diffuse: new Color3(0.09, 0.27, 0.34),
      emissive: new Color3(0.01, 0.035, 0.045),
      specular: new Color3(0.44, 0.65, 0.7),
    }),
    treeCanopy: createMaterial(scene, 'material-tree-canopy', {
      diffuse: new Color3(0.08, 0.34, 0.13),
    }),
    treeCanopyLight: createMaterial(scene, 'material-tree-canopy-light', {
      diffuse: new Color3(0.16, 0.51, 0.15),
    }),
    treeTrunk: createMaterial(scene, 'material-tree-trunk', {
      diffuse: new Color3(0.3, 0.17, 0.075),
    }),
    water: createMaterial(scene, 'material-water', {
      alpha: 0.94,
      diffuse: new Color3(0.025, 0.38, 0.58),
      emissive: new Color3(0.008, 0.045, 0.08),
      specular: new Color3(0.66, 0.88, 0.94),
    }),
    warning: createMaterial(scene, 'material-warning', {
      diffuse: new Color3(0.94, 0.4, 0.04),
      emissive: new Color3(0.22, 0.055, 0.002),
    }),
  }
}
