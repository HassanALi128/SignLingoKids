// src/app/tabs/home/home.page.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {IonicModule} from '@ionic/angular'
import { ThreeRenderer } from 'src/app/services/three-renderer.service';
import { DataService } from 'src/app/services/data';
import { addIcons } from 'ionicons';
import { arrowBack, volumeHigh, school, home, play, checkmark, checkmarkCircle } from 'ionicons/icons';

interface AslSign {
  id: string;
  label: string;
  thumbUrl?: string;
  audioUrl?: string;
  actionName: string; // Name of the action in GLB file
}

interface Category {
  id: string;
  label: string;
  thumbUrl?: string;
  color?: string;
  audioUrl?: string;
  actionFile?: string; // Path to category's action GLB file
  signs: AslSign[];
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule
  ],
})
export class HomePage implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChildren('scrollCard', { read: ElementRef }) scrollCards!: QueryList<ElementRef>;

  // Data properties
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  selectedSign?: AslSign;

  // UI state
  loading = true;
  error?: string;
  characterLoaded = false;
  isPlaying = false;
  playedCount = 0;
  learnedSigns: string[] = []; // Track which signs user has marked as learned

  // Audio management
  private currentAudio?: HTMLAudioElement;

  constructor(
    private three: ThreeRenderer,
    private data: DataService,
    private router: Router
  ) {
    addIcons({volumeHigh,arrowBack,school,home,play,checkmark,checkmarkCircle});
  }

  goToLanding(): void {
    this.router.navigate(['/']);
  }

  async ngOnInit(): Promise<void> {
    try {
    this.categories = await this.data.loadCategories();
      console.log('Loaded categories:', this.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      this.error = 'Failed to load categories';
    }
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      if (!this.canvasRef) {
        console.error('Canvas not found!');
        return;
      }

      const canvas = this.canvasRef.nativeElement;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || Math.round(window.innerHeight * 0.5);

      this.three.initialize(this.canvasRef, width, height);

      // Load the main character model - BUBU
      await this.three.loadModel('assets/aslkidanimation/models/asl_new_Modle.glb');

      // Load default actions (if any)
      await this.three.loadActions('assets/aslkidanimation/actions/alsagirl_model_animation.glb');
      this.three.centerModel();

      this.characterLoaded = true;
      this.loading = false;
    } catch (e: any) {
      this.error = e?.message || 'Failed to load character';
      this.loading = false;
    }
  }

  //  Category Selection Logic
  async selectCategory(category: Category): Promise<void> {
    console.log('Selected category:', category);
    this.selectedCategory = category;

    // Play category audio
    if (category.audioUrl) {
      this.playAudio(category.audioUrl);
    }

    // Load category-specific actions if available
    if (category.actionFile) {
      try {
        await this.three.loadActions(category.actionFile);
        console.log('Loaded actions for category:', category.label);
      } catch (error) {
        console.warn('Could not load category actions:', error);
      }
    }
  }

  // 🔥 Sign Selection Logic - Only Animation, No Audio
  async playSign(sign: AslSign): Promise<void> {
    if (!this.characterLoaded || !this.selectedCategory) return;

    console.log('Playing sign:', sign);
    this.selectedSign = sign;

    try {
      // Play the sign animation only
      if (sign.actionName) {
        this.three.play(sign.actionName);
        console.log('Playing animation:', sign.actionName);
      }

      // ❌ Removed audio - audio will only play when user clicks Listen button
      // ❌ Removed progress update - progress will only update when user checks "I Learned"

    } catch (error) {
      console.error('Error playing sign:', error);
    }
  }

  //  Audio Management
  playAudio(audioUrl: string): void {
    // Stop current audio if playing
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = undefined;
    }

    try {
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.play().catch(error => {
        console.warn('Could not play audio:', error);
      });
    } catch (error) {
      console.warn('Error creating audio:', error);
    }
  }

  // 🔥 Category Audio Button
  playCategoryAudio(): void {
    if (this.selectedCategory?.audioUrl) {
      this.playAudio(this.selectedCategory.audioUrl);
    }
  }

  //  Sign Audio Button
  playSignAudio(): void {
    if (this.selectedSign?.audioUrl) {
      this.playAudio(this.selectedSign.audioUrl);
    }
  }

  //  Back to Categories
  backToCategories(): void {
    this.selectedCategory = null;
    this.selectedSign = undefined;
    this.playedCount = 0;
    this.learnedSigns = []; // Reset learned signs when going back
  }

  // 🔥 Replay Animation - Play the current selected sign animation again
  replayAnimation(): void {
    if (this.selectedSign) {
      console.log('🔄 Replaying animation for:', this.selectedSign.label);
      this.three.play(this.selectedSign.actionName);
    }
  }

  // 🔥 Navigate to Quiz
  goToQuiz(): void {
    this.router.navigate(['/quiz']);
  }

  // 🔥 Progress Calculation
  getProgress(): number {
    if (!this.selectedCategory || this.selectedCategory.signs.length === 0) {
      return 0;
    }
    return this.playedCount / this.selectedCategory.signs.length;
  }

  // 🔥 Check if sign is learned (checked by user)
  isSignPlayed(sign: AslSign): boolean {
    // Check if this sign is in the learned signs array
    return this.learnedSigns.includes(sign.id);
  }

  // 🔥 Toggle learned status when user checks/unchecks
  toggleLearnedStatus(sign: AslSign): void {
    if (this.isSignPlayed(sign)) {
      // Remove from learned signs
      this.learnedSigns = this.learnedSigns.filter(id => id !== sign.id);
      this.playedCount--;
    } else {
      // Add to learned signs
      this.learnedSigns.push(sign.id);
      this.playedCount++;
    }
    console.log('Learned signs:', this.learnedSigns);
    console.log('Progress:', this.playedCount, '/', this.selectedCategory?.signs.length);
  }

  //  Animation Controls
  listModelAnimations(): void {
    this.three.listModelAnimations();
  }

  // 🔥 Window resize handling
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

  // 🔥 Scroll effect for sign cards
  onScroll(event: any): void {
    const container = event.target as HTMLElement;
    const centerX = container.offsetWidth / 2;

    this.scrollCards.forEach((el) => {
      const card = el.nativeElement as HTMLElement;
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const offset = Math.abs(centerX - cardCenter);

      // Scale effect
      const scale = Math.max(0.8, 1 - offset / 300);
      card.style.transform = `scale(${scale})`;
      card.style.opacity = String(scale);
    });
  }

  ngOnDestroy(): void {
    // Clean up audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = undefined;
    }
  }
}
