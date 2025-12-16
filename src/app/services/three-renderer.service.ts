// src/app/services/three-renderer.service.ts
import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
// Use the correct import paths that match your TypeScript config
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

  constructor(private ngZone: NgZone) {
    this.loader.setPath('');
  }

  initialize(
    canvas: ElementRef<HTMLCanvasElement>,
    width: number,
    height: number
  ): void {
    this.scene = new THREE.Scene();

    // 🔥 White Background for Model
    this.scene.background = new THREE.Color(0xffffff);

    // Camera
    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
    this.camera.position.set(1.0, 2.2, 5.5); // Moved back and up for zoom out

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas.nativeElement,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height, false);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 4.0);
    this.scene.add(hemi);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);
    this.controls.update();
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Loop
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  async loadModel(
    url: string = 'assets/aslkidanimation/models/asl_new_Modle.glb'
  ): Promise<THREE.Object3D> {
    this.disposeCurrentModel();

    try {
      console.log('Loading model from:', url);
      const gltf = await this.loadIonicAsset(url);
      const model = gltf.scene;

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

      // Lights (bright & warm)
      const ambient = new THREE.AmbientLight(0xfff7e6, 0.8);
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(3, 6, 4);
      this.scene.add(ambient, dir);

      // 🎥 Camera Position Adjustment
      // X (0): Center
      // Y (1.6): Height (Higher value = Camera moves UP)
      // Z (3.8): Zoom (Higher value = Camera moves BACK/Zooms Out)
      this.camera.position.set(0, 1.6, 3.8); // Adjusted to see full face/upper body
      // Handle animations
      this.actions.clear();
      this.mixer = undefined;

      if (gltf.animations && gltf.animations.length > 0) {
        console.log(
          'Found animations in model:',
          gltf.animations.map((a: any) => a.name)
        );
        this.mixer = new THREE.AnimationMixer(model);

        for (const clip of gltf.animations) {
          const action = this.mixer.clipAction(clip);
          action.clampWhenFinished = true;
          action.loop = THREE.LoopOnce;
          this.actions.set(clip.name, action);
          console.log('Added animation:', clip.name);
        }
      } else {
        console.log('No animations found in the model');
      }

      this.scene.add(model);
      this.currentModel = model;

      // 🔥 Add shadow under model (PUBG style)

      // Check for animations after loading
      this.listModelAnimations();

      return model;
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  getClipNames(): string[] {
    return Array.from(this.actions.keys());
  }

  play(clipName: string, fadeSeconds = 0.3): void {
    console.log('🎬 Trying to play animation:', clipName);
    console.log('📋 Available animations:', Array.from(this.actions.keys()));

    const next = this.actions.get(clipName);
    if (!next) {
      console.error('❌ Animation not found:', clipName);
      return;
    }

    console.log('✅ Animation found, playing:', clipName);

    if (this.activeAction && this.activeAction !== next) {
      this.activeAction.fadeOut(fadeSeconds);
    }

    next.reset();
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.fadeIn(fadeSeconds);
    next.play();

    this.activeAction = next;
  }

  stop(): void {
    this.activeAction?.stop();
    this.activeAction = undefined;
  }

  setTimeScale(speed: number): void {
    if (this.mixer) this.mixer.timeScale = speed;
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = Math.max(1e-6, width / Math.max(1, height));
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setBackground(color: number | string): void {
    if (!this.scene) return;
    this.scene.background = new THREE.Color(color as any);
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    if (this.mixer) this.mixer.update(dt);
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * 🧹 Robust Disposal to prevent Memory Leaks
   */
  dispose(): void {
    console.log('🧹 Disposing Three.js Renderer & Scene...');

    // 1. Stop Animation Loop
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    // 2. Stop & Clear Animations
    this.stop();
    this.actions.forEach((action) => action.stop());
    this.actions.clear();
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.mixer.getRoot());
    this.mixer = undefined;
    this.activeAction = undefined;
    this.globalActions.clear();
    this.loadedFiles.clear();

    // 3. Dispose Controls
    if (this.controls) {
      this.controls.dispose();
      this.controls = undefined;
    }

    // 4. Dispose Scene Content (Recursive)
    if (this.scene) {
      this.scene.traverse((object) => {
        this.disposeObject(object);
      });
      this.scene.clear();
    }

    // 5. Dispose Renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      (this.renderer as any) = null;
    }

    console.log('✨ Three.js Disposed Successfully');
  }

  private disposeObject(object: any) {
    if (!object) return;

    // Dispose Geometry
    if (object.geometry) {
      object.geometry.dispose();
    }

    // Dispose Material(s)
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat: any) => this.disposeMaterial(mat));
      } else {
        this.disposeMaterial(object.material);
      }
    }

    // Dispose Skeleton (if any)
    if (object.skeleton) {
      object.skeleton.dispose();
    }
  }

  private disposeMaterial(material: any) {
    if (!material) return;

    // Dispose Textures in Material
    for (const key of Object.keys(material)) {
      const value = material[key];
      if (value && typeof value === 'object' && 'minFilter' in value) {
        // It's a texture
        value.dispose();
      }
    }

    // Dispose the material itself
    material.dispose();
  }

  // Keep for internal partial cleanup if needed, but rely on dispose() for full cleanup
  private disposeCurrentModel(): void {
    if (!this.currentModel) return;
    this.scene.remove(this.currentModel);
    this.currentModel.traverse((obj) => this.disposeObject(obj));
    this.currentModel = undefined;
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  async loadActionAndPlay(actionUrl: string, fadeSeconds = 0.3): Promise<void> {
    if (!this.currentModel) throw new Error('No character model loaded');

    try {
      console.log('Loading external action:', actionUrl);

      // Load the action file
      const gltf = await this.loader.loadAsync(actionUrl);

      // Check if it contains animations
      if (!gltf.animations || gltf.animations.length === 0) {
        throw new Error('No animations found in action file');
      }

      // Get the first animation clip
      const clip = gltf.animations[0];
      console.log(
        'Animation clip loaded:',
        clip.name,
        'duration:',
        clip.duration
      );

      // Make sure mixer is attached to the model
      if (!this.mixer) {
        this.mixer = new THREE.AnimationMixer(this.currentModel);
      }

      // Stop any active actions
      this.actions.forEach((action) => {
        action.stop();
      });

      if (this.activeAction) {
        this.activeAction.stop();
        this.activeAction = undefined;
      }

      // Create and play the new action
      const action = this.mixer.clipAction(clip);

      // Configure action settings
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce; // Changed to LoopOnce to prevent repeating

      // Play the action
      action.reset();
      action.setEffectiveTimeScale(0.7); // Slow down slightly to see motion better
      action.setEffectiveWeight(1);
      action.play();

      this.activeAction = action;

      console.log('Action started playing');

      // Store the action
      if (!this.actions.has(clip.name)) {
        this.actions.set(clip.name, action);
      }

      // Set up finished event
      action.getMixer().addEventListener('finished', () => {
        console.log('Animation finished');
      });
    } catch (error) {
      console.error('Error loading action:', error);
      throw error;
    }
  }
  addDebugSkeleton(): void {
    if (!this.currentModel) return;

    // Add a skeleton helper to visualize the bones
    this.currentModel.traverse((node) => {
      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        const skinnedMesh = node as THREE.SkinnedMesh;
        const skeleton = new THREE.SkeletonHelper(
          skinnedMesh.skeleton.bones[0]
        );
        (skeleton as any).material.linewidth = 2;
        this.scene.add(skeleton);
      }
    });

    // Add axes helper to show orientation
    const axesHelper = new THREE.AxesHelper(1);
    this.scene.add(axesHelper);
  }

  // Global cache for all loaded animations
  private globalActions = new Map<string, THREE.AnimationClip>();
  private loadedFiles = new Set<string>();

  async loadActions(url: string): Promise<void> {
    if (!this.currentModel) {
      throw new Error('Load the model first before actions');
    }

    // Ensure mixer exists (in case model had no animations)
    if (!this.mixer) {
      this.mixer = new THREE.AnimationMixer(this.currentModel);
    }

    // If file already loaded, just ensure actions are registered in current mixer
    if (this.loadedFiles.has(url)) {
      console.log('⚡ Actions from this file already cached:', url);
      this.registerCachedActions();
      return;
    }

    console.log('🔄 Loading actions from:', url);
    const gltf = await this.loader.loadAsync(url);

    if (!gltf.animations || gltf.animations.length === 0) {
      console.warn('⚠️ No animations found in:', url);
      throw new Error('No animations found in action file');
    }

    console.log('✅ Found animations:', gltf.animations.length);

    // Store clips in global cache
    for (const clip of gltf.animations) {
      if (!this.globalActions.has(clip.name)) {
        this.globalActions.set(clip.name, clip);
        console.log('💾 Cached animation:', clip.name);
      }
    }

    this.loadedFiles.add(url);
    this.registerCachedActions();
  }

  // Register all cached animations to the current mixer
  private registerCachedActions(): void {
    if (!this.mixer || !this.currentModel) return;

    this.globalActions.forEach((clip, name) => {
      if (!this.actions.has(name)) {
        const action = this.mixer!.clipAction(clip, this.currentModel);
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
        this.actions.set(name, action);
      }
    });
  }

  // Preload actions without playing (for Quiz)
  async preloadActions(url: string): Promise<void> {
    // Always call loadActions, it handles caching and registration internally
    await this.loadActions(url);
  }

  getModelInfo(): any {
    if (!this.currentModel) return null;

    const info: any = {
      animations: [],
      bones: [],
      meshes: [],
    };

    this.currentModel.traverse((node) => {
      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = node as THREE.SkinnedMesh;
        info.meshes.push({
          name: mesh.name,
          boneCount: mesh.skeleton.bones.length,
        });

        mesh.skeleton.bones.forEach((bone, i) => {
          if (i < 10) {
            info.bones.push(bone.name);
          }
        });
      }
    });

    return info;
  }
  applyTestAnimation(): void {
    if (!this.currentModel || !this.mixer) return;

    const times = [0, 1, 2];
    const values = [0, 1, 0]; // move up and down

    const posTrack = new THREE.NumberKeyframeTrack(
      '.position[y]', // target the y position of the model
      times,
      values
    );

    const testClip = new THREE.AnimationClip('TestMove', 2, [posTrack]);
    const testAction = this.mixer.clipAction(testClip);
    testAction.loop = THREE.LoopRepeat;
    testAction.repetitions = Infinity;
    testAction.play();

    console.log('Test animation applied');
  }
  centerModel(): void {
    if (!this.currentModel) return;

    // Reset model position
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
  async playAnimationForExistingModel(actionUrl: string) {
    if (!this.currentModel || !this.mixer) {
      throw new Error('Model not loaded yet');
    }

    return new Promise<void>((resolve, reject) => {
      this.loader.load(
        actionUrl,
        (gltf) => {
          if (!gltf.animations || gltf.animations.length === 0) {
            console.warn('No animations found in', actionUrl);
            return reject('No animations found');
          }

          // ❌ Ignore gltf.scene (we don’t add model again)
          // ✅ Use only animation clips
          const clip = gltf.animations[0];

          // Stop old actions
          this.mixer!.stopAllAction();

          // Apply animation clip to the existing model
          const action = this.mixer!.clipAction(clip);

          action.clampWhenFinished = true;
          action.loop = THREE.LoopOnce;

          action.reset().fadeIn(0.3).play();

          console.log(
            '✅ Playing action from:',
            actionUrl,
            'clip:',
            clip.name,
            'duration:',
            clip.duration
          );

          resolve();
        },
        undefined,
        (err) => {
          console.error('Error loading action file:', actionUrl, err);
          reject(err);
        }
      );
    });
  }

  async checkAssetExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
  fixResourcePath(actionUrl: string): string {
    // Skip if already absolute
    if (actionUrl.startsWith('http')) {
      return actionUrl;
    }

    // Clean path (remove leading slash if present)
    const cleanPath = actionUrl.startsWith('/')
      ? actionUrl.substring(1)
      : actionUrl;

    // For Ionic, use a relative path from the current base path
    // This approach works in development, web, Android and iOS

    // In development, use the assets folder at the root
    return cleanPath;
  }
  loadIonicAsset(relativePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Use the GLTFLoader directly with the relative path
      this.loader.load(
        relativePath,
        (result) => resolve(result),
        undefined, // Progress callback (optional)
        (error) => {
          console.error('Error loading asset:', relativePath, error);
          reject(error);
        }
      );
    });
  }
  listModelAnimations(): void {
    if (!this.currentModel) {
      console.log('No model loaded');
      return;
    }

    console.log('Actions in map:', Array.from(this.actions.keys()));

    // Check if model has animations property
    const animations = (this.currentModel as any).animations;
    if (animations && animations.length) {
      console.log(
        'Model animations:',
        animations.map((a: any) => a.name)
      );
    } else {
      console.log('No animations found directly on model');
    }

    // Check children for animations
    this.currentModel.traverse((node: THREE.Object3D) => {
      const nodeAnimations = (node as any).animations;
      if (nodeAnimations && nodeAnimations.length) {
        console.log(
          `Animations on node ${node.name}:`,
          nodeAnimations.map((a: any) => a.name)
        );
      }
    });
  }
}
