import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { FavoritesService, FavoriteItem } from '../../services/favorites';
import { Subscription } from 'rxjs';
import { ThreeRenderer } from 'src/app/services/three-renderer.service';
import { DataService } from 'src/app/services/data';
import { LearningService } from 'src/app/services/learning.service';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  heart,
  heartOutline,
  play,
  refresh,
  resize,
  school,
  shareSocialOutline,
  star,
  volumeHigh,
} from 'ionicons/icons';
import { register } from 'swiper/element/bundle';

register();

interface AslSign {
  id: string;
  label: string;
  thumbUrl?: string;
  audioUrl?: string;
  actionName: string;
}

interface Category {
  id: string;
  label: string;
  thumbUrl?: string;
  color?: string;
  audioUrl?: string;
  actionFile?: string;
  signs: AslSign[];
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LandingPage implements OnInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  userName: string = 'User';
  userAvatar: string = '';
  private favoritesSubscription?: Subscription;

  categories: Category[] = [];

  featuredItems: (FavoriteItem & { isFavorite: boolean })[] = [];

  certificateProgress: number = 0;
  progressCircumference: number = 2 * Math.PI * 24; // 2πr where r=24
  progressOffset: number = 0;

  // ABC Learning tracking
  abcLearnedCount: number = 0;
  totalABCLetters: number = 26;

  selectedCategory: Category | null = null;
  categoryItems: AslSign[] = [];

  // Learning Progress
  currentSign: AslSign | null = null;
  recentLearning: { category: Category; progress: number } | null = null;

  isLoading3D: boolean = false;

  constructor(
    private navController: NavController,
    private favoritesService: FavoritesService,
    private three: ThreeRenderer,
    private dataService: DataService,
    private learningService: LearningService
  ) {
    addIcons({
      arrowBack,
      resize,
      refresh,
      play,
      volumeHigh,
      school,
      heartOutline,
      shareSocialOutline,
      heart,
      star,
    });
  }

  async ngOnInit() {
    // Load user profile from localStorage
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        const userData = JSON.parse(profile);
        this.userName = userData.name || 'User';
        this.userAvatar = userData.avatar || '';
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }

    // Load Categories
    try {
      this.categories = await this.dataService.loadCategories();
      console.log('Loaded categories:', this.categories);
      this.loadRecentLearning(); // Load recent learning after categories
      this.updateCertificateProgress();
    } catch (error) {
      console.error('Error loading categories:', error);
    }

    // Calculate progress offset for the circle
    this.progressOffset =
      this.progressCircumference -
      (this.certificateProgress / 100) * this.progressCircumference;

    // Subscribe to favorites updates
    this.favoritesSubscription = this.favoritesService.favorites$.subscribe(
      (favorites) => {
        this.featuredItems = this.favoritesService
          .getRecentFavorites(4)
          .map((f) => ({
            ...f,
            isFavorite: this.favoritesService.isFavorite(f.id), // boolean
            bgColor: f.bgColor ?? '#ffffff',
          }));
      }
    );

    // Load initial favorites
    this.featuredItems = this.favoritesService
      .getRecentFavorites(4)
      .map((f) => ({
        ...f,
        isFavorite: this.favoritesService.isFavorite(f.id),
      }));
  }

  ngOnDestroy() {
    if (this.favoritesSubscription) {
      this.favoritesSubscription.unsubscribe();
    }
    // Cleanup 3D renderer if needed
  }

  goToPremium(): void {
    this.navController.navigateForward('/tabs/premium');
  }

  async selectCategory(category: Category): Promise<void> {
    this.selectedCategory = category;
    this.categoryItems = category.signs || [];

    // Give time for the view to render the canvas
    setTimeout(async () => {
      await this.init3DModel(category);
    }, 100);
  }

  async init3DModel(category: Category) {
    if (!this.canvasRef) return;

    this.isLoading3D = true;

    try {
      const canvas = this.canvasRef.nativeElement;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight * 0.6;

      this.three.initialize(this.canvasRef, width, height);

      // Load the main character model
      await this.three.loadModel(
        'assets/aslkidanimation/models/asl_new_Modle.glb'
      );

      // Load category-specific actions if available
      if (category.actionFile) {
        console.log('Loading actions for category:', category.label);
        await this.three.loadActions(category.actionFile);
      } else {
        // Fallback to default actions
        await this.three.loadActions(
          'assets/aslkidanimation/actions/alsagirl_model_animation.glb'
        );
      }

      this.three.centerModel();
    } catch (error) {
      console.error('Error initializing 3D model:', error);
    } finally {
      this.isLoading3D = false;
    }
  }

  closeCategoryDetail(): void {
    this.selectedCategory = null;
    this.categoryItems = [];
    this.stopAudio();
  }

  openFeatured(item: FavoriteItem & { isFavorite: boolean }): void {
    if (item.route) {
      this.navController.navigateForward(item.route);
    }
  }

  // Audio Management
  private currentAudio?: HTMLAudioElement;

  playAudio(audioUrl: string): void {
    this.stopAudio();
    try {
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.play().catch((error) => {
        console.warn('Could not play audio:', error);
      });
    } catch (error) {
      console.warn('Error creating audio:', error);
    }
  }

  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = undefined;
    }
  }

  async playSign(item: AslSign): Promise<void> {
    console.log('Playing sign:', item);
    this.currentSign = item;

    // Play Animation
    if (item.actionName) {
      this.three.play(item.actionName);
    }

    // Play Audio
    if (item.audioUrl) {
      this.playAudio(item.audioUrl);
    }
  }

  markAsLearned() {
    if (this.currentSign && this.selectedCategory) {
      const signId = this.currentSign.id;
      const categoryId = this.selectedCategory.id;

      this.learningService.markAsLearned(signId, categoryId);
      this.loadRecentLearning();
      this.updateCertificateProgress();
      console.log('Marked as learned:', this.currentSign.label);
    }
  }

  loadRecentLearning() {
    const recentCategoryId = this.learningService.getRecentCategoryId();
    if (recentCategoryId) {
      const category = this.categories.find((c) => c.id === recentCategoryId);
      if (category) {
        const itemIds = category.signs.map((s) => s.id);
        const progress = this.learningService.getCategoryProgress(itemIds);
        this.recentLearning = { category, progress };
      }
    }
  }

  updateCertificateProgress() {
    // Calculate total signs across all categories
    let totalSigns = 0;
    let learnedCount = 0;

    this.categories.forEach((cat) => {
      const signs = cat.signs || [];
      totalSigns += signs.length;
      learnedCount += signs.filter((s) =>
        this.learningService.isLearned(s.id)
      ).length;
    });

    // Add ABC letters to the total count
    totalSigns += this.totalABCLetters;

    // Get learned ABC letters from localStorage
    const learnedLetters = this.getLearnedABCLetters();
    this.abcLearnedCount = learnedLetters.length; // Update the count for display
    learnedCount += learnedLetters.length;

    if (totalSigns > 0) {
      this.certificateProgress = Math.round((learnedCount / totalSigns) * 100);

      // Update circle
      this.progressOffset =
        this.progressCircumference -
        (this.certificateProgress / 100) * this.progressCircumference;
    }
  }

  // Get learned ABC letters from localStorage
  getLearnedABCLetters(): string[] {
    try {
      const saved = localStorage.getItem('learnedLetters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading learned letters:', error);
    }
    return [];
  }

  isItemLearned(item: AslSign): boolean {
    return this.learningService.isLearned(item.id);
  }

  toggleFavorite(
    item: FavoriteItem & { isFavorite: boolean },
    event: Event
  ): void {
    event.stopPropagation();
    const newStatus = this.favoritesService.toggleFavorite(item);
    item.isFavorite = newStatus;
  }

  isFavorite(item: FavoriteItem): boolean {
    return this.favoritesService.isFavorite(item.id);
  }

  // Item Favorites (AslSign)
  toggleItemFavorite(item: AslSign, event: Event): void {
    event.stopPropagation();

    // Map AslSign to FavoriteItem
    const favoriteItem: FavoriteItem = {
      id: item.id,
      name: item.label,
      image: item.thumbUrl || '',
      type: 'sign',
      bgColor: this.selectedCategory?.color,
      addedAt: Date.now(),
    };

    this.favoritesService.toggleFavorite(favoriteItem);
  }

  isItemFavorite(item: AslSign): boolean {
    return this.favoritesService.isFavorite(item.id);
  }

  openCertificate(): void {
    this.navController.navigateForward('/abc');
  }

  goToHandSign(): void {
    this.navController.navigateForward('/home');
  }

  goToSettings(): void {
    this.navController.navigateForward('/settings');
  }

  goToAbc(): void {
    this.navController.navigateForward('/abc');
  }

  goToQuiz(): void {
    this.navController.navigateForward('/quiz');
  }

  // Action Button Handlers
  toggleRotate() {
    // Implement rotation toggle logic if supported by ThreeRenderer
    console.log('Toggle Rotate');
  }

  playAnimation() {
    // Play a random animation
    const animations = this.three.getClipNames();
    if (animations && animations.length > 0) {
      const randomAnim =
        animations[Math.floor(Math.random() * animations.length)];
      this.three.play(randomAnim);
      console.log('Playing:', randomAnim);
    }
  }

  playSound() {
    console.log('Play Sound');
  }
}
