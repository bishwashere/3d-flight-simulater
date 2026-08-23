import { Engine } from '@babylonjs/core/Engines/engine.js'
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine.js'

import type { LevelOneBackend } from './level-one-types'

export type LevelOneEngine = Engine | WebGPUEngine

export interface LevelOneEngineResult {
  backend: LevelOneBackend
  engine: LevelOneEngine
}

const ENGINE_OPTIONS = {
  audioEngine: false,
  antialias: true,
  doNotHandleContextLost: false,
  powerPreference: 'high-performance' as const,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  stencil: false,
}

/** Prefers WebGPU, but keeps Level 1 available on every WebGL2 desktop. */
export async function createLevelOneEngine(
  canvas: HTMLCanvasElement,
): Promise<LevelOneEngineResult> {
  try {
    if (await WebGPUEngine.IsSupportedAsync) {
      const webGpuEngine = new WebGPUEngine(canvas, ENGINE_OPTIONS)
      await webGpuEngine.initAsync()
      return { backend: 'webgpu', engine: webGpuEngine }
    }
  } catch (error) {
    console.info('WebGPU initialization failed; using WebGL2.', error)
  }

  const webGl2 = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    depth: true,
    desynchronized: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false,
  })

  if (!webGl2) {
    throw new Error('Level 1 requires WebGPU or WebGL2 support.')
  }

  return {
    backend: 'webgl2',
    engine: new Engine(webGl2, true, ENGINE_OPTIONS, false),
  }
}
