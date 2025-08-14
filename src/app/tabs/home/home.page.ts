// src/app/tabs/home/home.page.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCardContent,
  IonButton,
  IonCard,
  IonImg,
  IonThumbnail,
  IonAvatar,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { ThreeRenderer } from 'src/app/services/three-renderer.service';

interface AslSign {
  id: string; // Action file name or clip name
  label: string; // Display name
  description?: string; // Optional description
  thumbUrl?: string; // Optional thumbnail
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonCard,
    IonCardContent,
    IonButton,
    IonImg,
    IonThumbnail,
    IonAvatar,
    IonIcon,
    IonSpinner,
  ],
})
export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  listName: string[] = [];
  // Define available ASL signs - can be expanded
  aslSigns: AslSign[] = [
    {
      id: 'Afraid',
      label: 'Afraid',
      description: 'Sign for showing fear or being scared',
    },
    {
      id: 'Afternoon',
      label: 'Afternoon',
      description: 'Sign for showing Afternoon',
    },
    {
      id: 'AirPlane',
      label: 'AirPlane',
      description: 'Sign for showing Air Plane',
    },
    {
      id: 'Ball',
      label: 'Ball',
      description: 'Sign for showing Ball',
    },
    // Add more signs here as you add more action files
  ];

  selectedSign?: AslSign;
  loading = true;
  error?: string;
  characterLoaded = false;
  isPlaying = false;
  constructor(private three: ThreeRenderer) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      const canvas = this.canvasRef.nativeElement;
      const width =
        canvas.clientWidth ||
        canvas.parentElement?.clientWidth ||
        window.innerWidth;
      const height =
        canvas.clientHeight || Math.round(window.innerHeight * 0.5);

      console.log('Initializing ThreeJS with canvas size:', width, height);
      this.three.initialize(this.canvasRef, width, height);
      this.three.setBackground('#f8f8f8');

      // Load the Lisa character model - use simple relative path
      console.log('Loading Lisa model...');
      const modelPath = 'assets/aslkidanimation/models/lisa.glb';
      await this.three.loadModel(modelPath);

      // Center the model ONLY ONCE after loading
      this.three.centerModel();

      console.log('Model loaded and positioned');
      console.log('Available animations:', this.three.getClipNames());
      this.listName = this.three.getClipNames();
      this.characterLoaded = true;
      this.loading = false;
    } catch (e: any) {
      console.error('Error in ngAfterViewInit:', e);
      this.error = e?.message || 'Failed to load character model';
      this.loading = false;
    }
  }
  listModelAnimations() {
    this.three.listModelAnimations();
  }
  playEmbeddedAnimation(name: string): void {
    if (!this.characterLoaded) {
      console.error('Character not loaded');
      return;
    }

    console.log('Available animations:', this.three.getClipNames());
    console.log('Attempting to play:', name);

    // Try to play animation directly
    this.three.play(name, 0.3);
  }

  async playSign(sign: AslSign): Promise<void> {
    if (!this.characterLoaded || this.isPlaying) {
      return;
    }

    this.isPlaying = true;
    this.error = undefined;
    this.selectedSign = sign;

    try {
      console.log('Playing sign:', sign.id);

      // Use relative path for assets that will work in all environments
      const actionPath = `assets/aslkidanimation/actions/${sign.id}.glb`;

      await this.three.playAnimationForExistingModel(actionPath);

      // Set a timeout to match the animation duration
      setTimeout(() => {
        this.isPlaying = false;
      }, 4000);
    } catch (e: any) {
      console.error('Error playing sign:', e);
      this.error = `Failed to play sign: ${sign.id}`;
      this.isPlaying = false;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const canvas = this.canvasRef.nativeElement;
    const width =
      canvas.clientWidth ||
      canvas.parentElement?.clientWidth ||
      window.innerWidth;
    const height = canvas.clientHeight || Math.round(window.innerHeight * 0.5);
    this.three.resize(width, height);
  }

  ngOnDestroy(): void {
    // Service cleans up resources
  }
}
