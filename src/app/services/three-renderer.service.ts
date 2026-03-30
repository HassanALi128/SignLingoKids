import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

@Injectable({
  providedIn: 'root',
})
export class ThreeRenderer implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private frameId: number | null = null;
  private controls?: OrbitControls;

  private loader = new GLTFLoader();
  private currentModel?: THREE.Object3D;

  // Animation
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private activeAction?: THREE.AnimationAction;
  private clock = new THREE.Clock();

  // 🚀 Render control for performance
  private isRendering = false;
  private fpsInterval = 1000 / 30; // 🚀 Always 30 FPS for mobile
  private then = 0;

  // Caching
  private globalActions = new Map<string, THREE.AnimationClip>();
  private loadedFiles = new Set<string>();
  // Parsed model cache: avoids re-parsing GLB on every category open.
  // skeletonClone() preserves bone/skinning hierarchy correctly.
  private modelCache = new Map<string, THREE.Group>();
  private loadingPromises = new Map<string, Promise<void>>();

  // Idle Scheduler
  private idleTimeoutId?: any;
  private lastRandomIdle?: string;
  private isIdleSchedulerActive = false;
  private readonly IDLE_COMMON = 'idel-common';
  private readonly RANDOM_IDLES = ['idel-hi', 'idel-one', 'idel-spiderman'];

  constructor(private ngZone: NgZone) {
    this.loader.setPath('');
    // Cache downloaded GLB files in memory so re-opening a category skips the
    // network round-trip entirely (parser still runs but that's ~10x faster).
    THREE.Cache.enabled = true;
  }

  initialize(
    canvas: ElementRef<HTMLCanvasElement>,
    width: number,
    height: number
  ): void {
    // Note: dispose() is NOT called here — call it explicitly when fully tearing down.
    // For category-to-category transitions, use reinitialize() which preserves the WebGL context.

    this.scene = new THREE.Scene();

    // 🔥 Transparent Context (Allows CSS backdrop gradients!)
    this.scene.background = null;

    // Camera
    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
    this.camera.position.set(0, 1.6, 4.5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas.nativeElement,
      antialias: false, // Disabled for mobile GPU performance
      alpha: true,
      powerPreference: 'high-performance', // Hint to browser
    });
    this.renderer.setSize(width, height, false);

    // 🚀 Mobile-specific optimizations (Always applied)
    const pixelRatio = Math.min(window.devicePixelRatio, 1.2); // Cap at 1.2 for better performance

    this.renderer.setPixelRatio(pixelRatio);
    console.log('🎨 Pixel ratio set to:', pixelRatio);

    // 🚀 Disable shadows (Mobile only)
    this.renderer.shadowMap.enabled = false;

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 4.0);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xfff7e6, 0.8);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 6, 4);
    this.scene.add(ambient, dir);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);
    this.controls.update();
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Start rendering loop (but it will only render if needed)
    this.startRendering();
  }

  /**
   * Pre-initialize the WebGL renderer on page load so the first category tap
   * skips the expensive context-creation step entirely.
   * No-op if the renderer is already alive.
   */
  preInitializeRenderer(
    canvas: ElementRef<HTMLCanvasElement>,
    width: number,
    height: number
  ): void {
    if (!this.renderer) {
      this.initialize(canvas, width, height);
      console.log('🚀 Renderer pre-initialized');
    }
  }

  /**
   * Reuse the existing WebGL renderer across category changes.
   * Clears the scene content and resets the animation state without destroying
   * the WebGL context — avoids the 300-800ms freeze caused by re-creating it.
   * Falls back to full initialize() on the very first call.
   */
  reinitialize(
    canvas: ElementRef<HTMLCanvasElement>,
    width: number,
    height: number
  ): void {
    if (!this.renderer) {
      // First time or after a full dispose — full initialization path
      this.initialize(canvas, width, height);
      return;
    }

    // Renderer is alive — preserve the WebGL context, just reset content
    this.stopRendering();
    this.stop();
    this.stopIdleScheduler();

    // Clear animation state
    this.actions.clear();
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.mixer.getRoot());
    this.mixer = undefined;
    this.activeAction = undefined;

    // Remove model from scene before clearing
    this.disposeCurrentModel();

    // Clear all scene children (lights, etc.) and re-add lights
    this.scene.clear();
    this.scene.background = null;
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 4.0);
    this.scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xfff7e6, 0.8);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 6, 4);
    this.scene.add(ambient, dir);

    // Resize renderer to match current canvas dimensions
    this.renderer.setSize(width, height, false);

    // Reset camera
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 1.6, 4.5);

    // Reset orbit controls target
    if (this.controls) {
      this.controls.target.set(0, 1, 0);
      this.controls.update();
    }

    this.startRendering();
    console.log('♻️ Renderer reused — WebGL context preserved');
  }

  async loadModel(
    url: string = 'assets/aslkidanimation/models/asl_new_modle.glb'
  ): Promise<THREE.Object3D> {
    this.disposeCurrentModel();

    try {
      let model: THREE.Group;
      const cached = this.modelCache.get(url);

      if (cached) {
        // Clone preserving full skeleton/skinning hierarchy — ~10x faster than re-parsing
        model = skeletonClone(cached) as THREE.Group;
        console.log('✅ Model cloned from cache (skipping GLB parse)');
      } else {
        console.log('Loading model from:', url);
        const gltf = await this.loader.loadAsync(url);
        model = gltf.scene as THREE.Group;
        // Store a master clone so our working copy and cache are independent
        this.modelCache.set(url, skeletonClone(model) as THREE.Group);
      }

      // Center and scale model
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scale = 1.5 / maxDim;
        model.scale.setScalar(scale);
      }

      // 🎥 Camera Position Adjustment
      this.camera.position.set(0, 1.6, 3.8);

      // Animations are loaded separately via loadActions() — just create the mixer.
      // registerCachedActions() will bind all cached clips to this new mixer.
      this.actions.clear();
      this.mixer = new THREE.AnimationMixer(model);

      this.scene.add(model);
      this.currentModel = model;

      return model;
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  centerModel(): void {
    if (!this.currentModel) return;

    // Reset model position and scale first to get accurate bounds
    this.currentModel.position.set(0, 0, 0);

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(this.currentModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model in the scene - position slightly higher to show full model
    this.currentModel.position.x = -center.x;
    this.currentModel.position.y = -center.y + size.y * 0.5; // Position at half height
    this.currentModel.position.z = -center.z;

    // Update controls target to look at the center of the model
    if (this.controls) {
      this.controls.target.set(0, size.y * 0.5, 0);
      this.controls.update();
    }

    // Scale model if too large or small
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 3) {
      const scale = 3 / maxDim;
      this.currentModel.scale.set(scale, scale, scale);
    } else if (maxDim < 1) {
      const scale = 1 / maxDim;
      this.currentModel.scale.set(scale, scale, scale);
    }
  }

  // --------------------------------------------------------------------------
  // 🎬 Animation Management
  // --------------------------------------------------------------------------

  play(clipName: string, fadeSeconds = 0.3): void {
    if (!this.mixer) return;

    const next = this.actions.get(clipName);
    if (!next) {
      console.warn('❌ Animation not found:', clipName);
      return;
    }

    // 🚀 Ensure only ONE action is active at a time
    if (this.activeAction && this.activeAction !== next) {
      this.activeAction.fadeOut(fadeSeconds);
    }

    next.reset();
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.fadeIn(fadeSeconds);
    next.play();

    this.activeAction = next;

    // Ensure rendering is active
    this.resumeRendering();
  }

  /**
   * Play a temporary animation without stopping the idle scheduler.
   * After the animation finishes, it will automatically fade back to idle-common.
   * This is useful for quiz questions, feedback animations, etc.
   */
  playTemporary(clipName: string, fadeSeconds = 0.3): void {
    if (!this.mixer) return;

    const tempAction = this.actions.get(clipName);
    if (!tempAction) {
      console.warn('❌ Animation not found:', clipName);
      return;
    }

    const idleCommonAction = this.actions.get(this.IDLE_COMMON);
    if (!idleCommonAction) {
      // If idle-common doesn't exist, fall back to regular play
      this.play(clipName, fadeSeconds);
      return;
    }

    console.log(`🎬 Playing temporary animation: ${clipName}`);

    // Fade out current action (likely idle-common)
    if (this.activeAction && this.activeAction !== tempAction) {
      this.activeAction.fadeOut(fadeSeconds);
    }

    // Setup and play temporary animation
    tempAction.reset();
    tempAction.setEffectiveTimeScale(1);
    tempAction.setEffectiveWeight(1);
    tempAction.fadeIn(fadeSeconds);
    tempAction.play();

    this.activeAction = tempAction;

    // When temporary animation finishes, fade back to idle-common
    const onFinished = (e: any) => {
      if (e.action === tempAction) {
        this.mixer?.removeEventListener('finished', onFinished);

        console.log(
          `✅ Temporary animation finished, returning to ${this.IDLE_COMMON}`
        );

        // Fade back to idle-common
        tempAction.fadeOut(fadeSeconds);
        idleCommonAction.reset();
        idleCommonAction.setEffectiveTimeScale(1);
        idleCommonAction.setEffectiveWeight(1);
        idleCommonAction.fadeIn(fadeSeconds);
        idleCommonAction.play();

        this.activeAction = idleCommonAction;
      }
    };

    this.mixer.addEventListener('finished', onFinished);

    // Ensure rendering is active
    this.resumeRendering();
  }

  stop(): void {
    this.stopIdleScheduler();
    this.activeAction?.stop();
    this.activeAction = undefined;
  }

  getClipNames(): string[] {
    return Array.from(this.actions.keys());
  }

  // --------------------------------------------------------------------------
  // 📦 Asset Loading & Caching
  // --------------------------------------------------------------------------

  async preloadModel(url: string = 'assets/aslkidanimation/models/asl_new_modle.glb'): Promise<void> {
    if (this.modelCache.has(url)) return;
    try {
      console.log('⏳ Silent Preloading Model...');
      const gltf = await this.loader.loadAsync(url);
      const model = gltf.scene as THREE.Group;
      this.modelCache.set(url, skeletonClone(model) as THREE.Group);
    } catch (e) {
      console.warn('Preload model failed', e);
    }
  }

  async preloadAction(url: string): Promise<void> {
    if (this.loadedFiles.has(url)) return;

    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) {
      console.log('⏳ Action already preloading, waiting for promise:', url);
      await existingPromise;
      return;
    }

    const loadPromise = (async () => {
      try {
        console.log('⏳ Silent Preloading Action...', url);
        const gltf = await this.loader.loadAsync(url);
        for (const clip of gltf.animations) {
          if (!this.globalActions.has(clip.name)) {
            this.globalActions.set(clip.name, clip);
          }
        }
        this.loadedFiles.add(url);
        this.disposeGLTF(gltf);
      } catch (e) {
        console.warn('Preload action failed', e);
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    await loadPromise;
  }

  async loadActions(url: string): Promise<void> {
    if (!this.currentModel) {
      throw new Error('Load the model first before actions');
    }

    if (!this.mixer) {
      this.mixer = new THREE.AnimationMixer(this.currentModel);
    }

    // Check if file is already loaded
    if (this.loadedFiles.has(url)) {
      this.registerCachedActions();
      return;
    }

    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) {
      console.log('⏳ Actions already loading, waiting for promise:', url);
      await existingPromise;
      this.registerCachedActions();
      return;
    }

    console.log('🔄 Loading actions from:', url);

    const loadPromise = (async () => {
      try {
        const gltf = await this.loader.loadAsync(url);

        if (!gltf.animations || gltf.animations.length === 0) {
          console.warn('⚠️ No animations found in:', url);
          this.disposeGLTF(gltf);
          return;
        }

        // Store clips in global cache
        for (const clip of gltf.animations) {
          if (!this.globalActions.has(clip.name)) {
            this.globalActions.set(clip.name, clip);
          }
        }

        this.loadedFiles.add(url);
        // 🧹 Dispose of the loaded scene IMMEDIATELY to free memory
        this.disposeGLTF(gltf);
      } catch (error) {
        console.error('Error loading actions:', error);
        throw error;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    await loadPromise;
    this.registerCachedActions();
  }

  private registerCachedActions(): void {
    if (!this.mixer || !this.currentModel) return;

    this.globalActions.forEach((clip, name) => {
      if (!this.actions.has(name)) {
        const action = this.mixer!.clipAction(clip, this.currentModel);

        // idle-common should loop, others play once
        if (name === this.IDLE_COMMON) {
          action.loop = THREE.LoopRepeat;
          action.clampWhenFinished = false;
        } else {
          action.loop = THREE.LoopOnce;
          action.clampWhenFinished = true;
        }

        this.actions.set(name, action);
      }
    });
  }

  isActionLoaded(url: string): boolean {
    return this.loadedFiles.has(url);
  }

  async preloadActionsBatch(
    urls: string[],
    batchSize: number = 3
  ): Promise<void> {
    const uniqueUrls = [...new Set(urls)];

    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      await Promise.all(batch.map((url) => this.loadActions(url)));

      // 🧹 Small delay to allow GC
      if (i + batchSize < uniqueUrls.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  // --------------------------------------------------------------------------
  // 💤 Idle Scheduler Logic
  // --------------------------------------------------------------------------

  /**
   * Starts the idle animation scheduler.
   * Plays 'idle-common' as base and triggers random idles at intervals.
   */
  startIdleScheduler(): void {
    if (this.isIdleSchedulerActive) return;
    this.isIdleSchedulerActive = true;

    console.log('💤 Starting Idle Scheduler...');

    // 1. Play base idle-common
    this.play(this.IDLE_COMMON, 0.5);

    // 2. Schedule first random idle
    this.scheduleNextRandomIdle();
  }

  /**
   * Stops the idle scheduler and clears any pending timeouts.
   */
  stopIdleScheduler(): void {
    this.isIdleSchedulerActive = false;
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = undefined;
    }

    // Remove listener if any
    if (this.mixer) {
      this.mixer.removeEventListener('finished', this.onRandomIdleFinished);
    }
  }

  private scheduleNextRandomIdle(): void {
    if (!this.isIdleSchedulerActive) return;

    // Random interval between 6 and 12 seconds
    const delay = Math.random() * (12000 - 6000) + 6000;

    this.idleTimeoutId = setTimeout(() => {
      this.playRandomIdle();
    }, delay);
  }

  private playRandomIdle(): void {
    if (!this.isIdleSchedulerActive || !this.mixer) return;

    // Filter out the last played random idle to avoid back-to-back repeats
    const availableIdles = this.RANDOM_IDLES.filter(
      (id) => id !== this.lastRandomIdle
    );
    const randomIndex = Math.floor(Math.random() * availableIdles.length);
    const nextIdle = availableIdles[randomIndex];

    console.log(`🎲 Playing random idle: ${nextIdle}`);
    this.lastRandomIdle = nextIdle;

    const commonAction = this.actions.get(this.IDLE_COMMON);
    const randomAction = this.actions.get(nextIdle);

    if (!commonAction || !randomAction) {
      this.scheduleNextRandomIdle();
      return;
    }

    // Smooth cross-fade
    randomAction.reset();
    randomAction.setEffectiveTimeScale(1);
    randomAction.setEffectiveWeight(1);

    // Crossfade from common to random
    commonAction.crossFadeTo(randomAction, 0.5, true);
    randomAction.play();

    this.activeAction = randomAction;

    // When random idle finishes, fade back to common
    const onFinished = (e: any) => {
      if (e.action === randomAction) {
        this.mixer?.removeEventListener('finished', onFinished);

        if (this.isIdleSchedulerActive) {
          randomAction.crossFadeTo(commonAction, 0.5, true);
          commonAction.play();
          this.activeAction = commonAction;

          // Schedule next
          this.scheduleNextRandomIdle();
        }
      }
    };

    this.mixer.addEventListener('finished', onFinished);
  }

  private onRandomIdleFinished = (e: any) => {
    // This is a placeholder for the listener logic if needed globally
  };

  // --------------------------------------------------------------------------
  // 🔄 Render Loop & Lifecycle
  // --------------------------------------------------------------------------

  private startRendering(): void {
    if (this.isRendering) return;
    this.isRendering = true;
    this.then = performance.now();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private stopRendering(): void {
    this.isRendering = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  pauseRendering(): void {
    this.isRendering = false;
  }

  resumeRendering(): void {
    if (!this.isRendering) {
      this.startRendering();
    }
  }

  private animate = (): void => {
    if (!this.isRendering || !this.renderer || !this.scene || !this.camera)
      return;

    this.frameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const elapsed = now - this.then;

    // 🚀 FPS Limiting
    if (elapsed > this.fpsInterval) {
      this.then = now - (elapsed % this.fpsInterval);

      const dt = this.clock.getDelta();

      // Only update mixer if we have an active action or it's fading
      if (
        this.mixer &&
        (this.activeAction?.isRunning() || this.activeAction?.weight! > 0)
      ) {
        this.mixer.update(dt);
      }

      if (this.controls) this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  };

  // --------------------------------------------------------------------------
  // 🧹 Disposal
  // --------------------------------------------------------------------------

  dispose(): void {
    console.log('🧹 Disposing Three.js Renderer & Scene...');
    this.stopRendering();

    // Stop animations
    this.stop();
    this.actions.clear();
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.mixer.getRoot());
    this.mixer = undefined;
    this.activeAction = undefined;

    // NOTE: Preserve these caches across navigations so re-opening a category is instant.
    // this.globalActions.clear();
    // this.loadedFiles.clear();
    // this.modelCache.clear();

    // Dispose Controls
    this.controls?.dispose();
    this.controls = undefined;

    // Dispose Scene
    if (this.scene) {
      this.scene.traverse((object) => this.disposeObject(object));
      this.scene.clear();
    }

    // Dispose Renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
      (this.renderer as any) = null;
    }
  }

  private disposeObject(object: any) {
    if (!object) return;
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat: any) => this.disposeMaterial(mat));
      } else {
        this.disposeMaterial(object.material);
      }
    }
    if (object.skeleton) object.skeleton.dispose();
  }

  private disposeMaterial(material: any) {
    if (!material) return;
    for (const key of Object.keys(material)) {
      const value = material[key];
      if (
        value &&
        (value.isTexture || (typeof value === 'object' && 'minFilter' in value))
      ) {
        value.dispose();
      }
    }
    material.dispose();
  }

  private disposeGLTF(gltf: any): void {
    if (!gltf || !gltf.scene) return;
    gltf.scene.traverse((object: any) => this.disposeObject(object));
    gltf.scene.clear();
  }

  private disposeCurrentModel(): void {
    if (!this.currentModel) return;
    this.scene.remove(this.currentModel);
    this.currentModel.traverse((obj) => this.disposeObject(obj));
    this.currentModel = undefined;
  }

  ngOnDestroy(): void {
    this.dispose();
  }
}
