// src/types/three-webgpu.d.ts
declare module 'three/webgpu' {
  import { WebGLRenderer } from 'three';

  export class WebGPURenderer extends WebGLRenderer {}
  export class Renderer {}
}
