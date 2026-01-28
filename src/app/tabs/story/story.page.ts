import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  StoryDirectorService,
  StoryState,
} from '../../services/story-director.service';
import { Observable } from 'rxjs';
import { StoryBlock } from '../../models/story.model';
import * as THREE from 'three';

@Component({
  selector: 'app-story',
  templateUrl: './story.page.html',
  styleUrls: ['./story.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class StoryPage implements OnInit, OnDestroy {
  @ViewChild('threeCanvasContainer', { static: true })
  containerRef!: ElementRef;

  isLoading = false;
  currentState$: Observable<StoryState>;
  currentBlock$: Observable<StoryBlock | null>;

  // Three.js Basics
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private cube!: THREE.Mesh;
  private animationFrameId: number | null = null;
  private mixer!: THREE.AnimationMixer;

  constructor(private storyDirector: StoryDirectorService) {
    this.currentState$ = this.storyDirector.currentState$;
    this.currentBlock$ = this.storyDirector.currentBlock$;
  }

  ngOnInit() {
    this.initThreeJS();
    // Auto-load just for testing speed
    setTimeout(() => this.loadTestStory(), 1000);
  }

  ngOnDestroy() {
    this.storyDirector.cleanup();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    // Cleanup Three.js resources if needed
  }

  loadTestStory() {
    this.isLoading = true;
    const manifestUrl = 'assets/data/story_manifest.json';

    this.storyDirector.loadStory(manifestUrl).subscribe({
      next: (manifest) => {
        this.isLoading = false;
        console.log('Story Loaded!', manifest);

        // Register a dummy mixer/animations since we are using primitives for now
        // Or if we had a GLB, we'd do it after GLTFLoader finishes.
        this.storyDirector.registerAnimator(this.mixer, []); // Empty for primitive test

        this.storyDirector.play();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Story Load Failed', err);
      },
    });
  }

  simulateInteraction() {
    this.storyDirector.handleInteractionSuccess();
  }

  private initThreeJS() {
    const container = this.containerRef.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    // Placeholder Character (Green Cube)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    // Mixer (Needed for service, even if empty for cube)
    this.mixer = new THREE.AnimationMixer(this.cube);

    this.animate();

    // Handle Resize
    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Rotate cube to show it's alive
    if (this.cube) {
      this.cube.rotation.x += 0.01;
      this.cube.rotation.y += 0.01;
    }

    if (this.mixer) {
      this.mixer.update(0.016); // ~60fps
    }

    this.renderer.render(this.scene, this.camera);
  }
}
