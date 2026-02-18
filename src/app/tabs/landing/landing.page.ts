import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import {
  IonicModule,
  NavController,
  ToastController,
  ModalController,
  AlertController,
  Platform,
} from '@ionic/angular';
import { App } from '@capacitor/app';
import { FavoritesService, FavoriteItem } from '../../services/favorites';
import { Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
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
  lockClosed,
} from 'ionicons/icons';
import { QuizService } from 'src/app/services/quiz';
import { register } from 'swiper/element/bundle';
import { CommonService } from 'src/app/core/services/common';
import { ProfileService } from 'src/app/services/profile.service';
import { SubscriptionModalComponent } from 'src/app/components/subscription-modal/subscription-modal.component';
import { AlertService } from 'src/app/services/alert.service';

register();

interface AslSign {
  id: string;
  label: string;
  thumbUrl?: string;
  audioUrl?: string;
  actionName: string;
  isPremium?: boolean;
}

interface Category {
  id: string;
  label: string;
  thumbUrl?: string;
  color?: string;
  audioUrl?: string;
  actionFile?: string;
  isPremium?: boolean;
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
  @ViewChild('swiper') swiperRef!: ElementRef;

  userName: string = 'User';
  userAvatar: string = '';
  isPremium: boolean = false;
  private favoritesSubscription?: Subscription;

  categories: Category[] = [];
  private categoriesSubject = new BehaviorSubject<Category[]>([]);

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
  recentLearningList: { category: Category; progress: number }[] = [];

  isLoading3D: boolean = false;
  isFullscreen: boolean = false;

  private backButtonSubscription: Subscription | undefined;

  constructor(
    private navController: NavController,
    private favoritesService: FavoritesService,
    private three: ThreeRenderer,
    private dataService: DataService,
    private learningService: LearningService,
    private toastController: ToastController,
    private commonService: CommonService,
    private quizService: QuizService,
    private profileService: ProfileService,
    private modalController: ModalController,
    private alertController: AlertController,
    private alertService: AlertService,
    private platform: Platform,
    private route: ActivatedRoute
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
      lockClosed,
    });
  }

  goToProfile() {
    this.commonService.goToPage('tabs/setting');
  }

  async ngOnInit() {
    // Subscribe to profile updates
    this.profileService.profile$.subscribe((profile) => {
      if (profile) {
        this.userName = profile.name || 'User';
        this.userAvatar = profile.avatar || '';
      }
    });

    // Subscribe to premium status
    this.quizService.isPremium$.subscribe((status) => {
      this.isPremium = status;
    });

    // Reactive setup for Recent Learning & Certificate Progress
    // We combine progress updates and categories loading to ensure data is ready
    combineLatest([
      this.learningService.progress$,
      this.categoriesSubject,
    ]).subscribe(([progress, categories]) => {
      if (progress && categories.length > 0) {
        this.loadRecentLearning();
        this.updateCertificateProgress();
      }
    });

    // Load Categories
    try {
      this.categories = await this.dataService.loadCategories();
      console.log('Loaded categories:', this.categories);
      this.categoriesSubject.next(this.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }

    // Check for query params to open a specific category/item
    this.route.queryParams.subscribe((params) => {
      const categoryId = params['categoryId'];
      const signId = params['signId'];

      if (categoryId) {
        // Wait for categories to be loaded
        const checkCategories = setInterval(() => {
          if (this.categories.length > 0) {
            clearInterval(checkCategories);
            const category = this.categories.find((c) => c.id === categoryId);
            if (category) {
              console.log('Opening category from URL:', category.label);
              // Small delay to ensure view is ready
              setTimeout(() => {
                this.selectCategory(category, false, signId);
              }, 500);
            }
          }
        }, 100);
      }
    });

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
            isFavorite: this.favoritesService.isFavorite(f.id),
            bgColor: f.bgColor ?? '#ffffff',
          }));
      }
    );
  }

  ionViewWillLeave() {
    this.stopAudio();
    this.three.pauseRendering();
    this.toggleTabBar(true);

    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  ionViewDidEnter() {
    if (this.selectedCategory) {
      this.three.resumeRendering();
    }

    this.backButtonSubscription =
      this.platform.backButton.subscribeWithPriority(
        20,
        async (processNextHandler) => {
          if (this.selectedCategory) {
            this.closeCategoryDetail();
          } else {
            // Let the global handler (Priority 10) take over
            processNextHandler();
          }
        }
      );
  }

  ngOnDestroy() {
    if (this.favoritesSubscription) {
      this.favoritesSubscription.unsubscribe();
    }
    this.three.dispose();
    this.toggleTabBar(true);
  }

  goToPremium(): void {
    this.navController.navigateForward('/tabs/premium');
  }

  async selectCategory(
    category: Category,
    resume: boolean = false,
    targetSignId?: string
  ): Promise<void> {
    this.isLoading3D = true;
    this.selectedCategory = category;
    this.categoryItems = category.signs || [];
    this.toggleTabBar(false);

    // Show tooltip when entering category
    this.showToast('Select an item to see the animation');

    // Give time for the view to render the canvas
    setTimeout(async () => {
      await this.init3DModel(category);

      let initialIndex = 0;
      if (resume) {
        // Find the LAST item that was marked as learned
        // We iterate backwards or use lastIndexOf logic
        // Since isItemLearned checks a service, we map first
        const learnedStatuses = this.categoryItems.map((item) =>
          this.isItemLearned(item)
        );
        const lastLearnedIndex = learnedStatuses.lastIndexOf(true);

        if (lastLearnedIndex !== -1) {
          initialIndex = lastLearnedIndex;
        } else {
          // If nothing is learned yet, start at 0
          initialIndex = 0;
        }
        console.log(
          'Resuming learning at last learned item index:',
          initialIndex
        );
      }

      // If targetSignId is provided, find its index (overrides resume logic)
      if (targetSignId) {
        const targetIndex = this.categoryItems.findIndex(
          (item) => item.id === targetSignId
        );
        if (targetIndex !== -1) {
          initialIndex = targetIndex;
          console.log('Jumping to target sign index:', initialIndex);
        }
      }

      // Initialize currentSign
      if (this.categoryItems.length > 0) {
        this.currentSign = this.categoryItems[initialIndex];
      }

      // Slide to the calculated index
      if (initialIndex > 0 && this.swiperRef && this.swiperRef.nativeElement) {
        const swiperEl = this.swiperRef.nativeElement;
        if (swiperEl.swiper) {
          // Use 0ms duration for instant jump if resuming, or small animation
          swiperEl.swiper.slideTo(initialIndex, 500, true);
        }
      }
    }, 100);
  }

  onSlideChange(event: any) {
    const swiper = event.target.swiper;
    const index = swiper.realIndex; // Use realIndex for loop mode compatibility if needed, or activeIndex
    if (this.categoryItems && this.categoryItems[index]) {
      this.currentSign = this.categoryItems[index];
      console.log('Active item updated via swipe:', this.currentSign.label);
    }
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
        'assets/aslkidanimation/models/asl_new_modle.glb'
      );

      // Load category-specific actions if available
      if (category.actionFile) {
        console.log('Loading actions for category:', category.label);
        await this.three.loadActions(category.actionFile);
      } else {
        // Fallback to default actions
        await this.three.loadActions(
          'assets/aslkidanimation/actions/asl_new_Animation_Basic.glb'
        );
      }

      this.three.centerModel();

      // Load idle animations from the default animation file
      await this.three.loadActions(
        'assets/aslkidanimation/actions/new-asl-default-animation.glb'
      );

      // Start Idle Loop
      this.three.play('idel-common');
    } catch (error) {
      console.error('Error initializing 3D model:', error);
    } finally {
      this.isLoading3D = false;
    }
  }

  closeCategoryDetail(): void {
    this.three.stop();
    this.selectedCategory = null;
    this.categoryItems = [];
    this.stopAudio();
    this.toggleTabBar(true);
  }

  private toggleTabBar(show: boolean) {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      tabBar.style.display = show ? 'flex' : 'none';
    }
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

  async playSign(item: AslSign, index: number = -1): Promise<void> {
    // We update the currentSign immediately for responsiveness
    this.currentSign = item;

    // Slide to the selected item if index is provided
    if (index >= 0 && this.swiperRef && this.swiperRef.nativeElement) {
      const swiperEl = this.swiperRef.nativeElement;
      if (swiperEl.swiper) {
        swiperEl.swiper.slideTo(index, 500, true);
      } else {
        console.warn('Swiper instance not ready yet');
      }
    }

    // We do NOT automatically play the animation here anymore when clicking a card,
    // unless we want to maintain that behavior. The user said:
    // "Clicking an item card inside the swiper is optional, but it should NOT be required to make an item active."
    // And "When the PLAY button is clicked: It must play the animation of the CURRENTLY CENTERED swiper item"
    // However, usually clicking a card implies "select and play".
    // Let's keep the "play on click" behavior for better UX, but route it through the central logic if needed.
    // Actually, the user's problem was that clicking PLAY played the LAST CLICKED item, not the CENTERED one.
    // By updating currentSign on slideChange, we solve that.
    // So here we can just play it if we want immediate feedback.

    this.playAnimation();
  }

  async openSubscriptionModal() {
    const modal = await this.modalController.create({
      component: SubscriptionModalComponent,
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'subscription-modal-sheet',
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'unlock') {
      this.goToPremium();
    }
  }

  async markAsLearned() {
    if (this.currentSign && this.selectedCategory) {
      // Check Premium Status
      if (this.currentSign.isPremium && !this.isPremium) {
        this.openSubscriptionModal();
        return;
      }

      const signId = this.currentSign.id;
      const categoryId = this.selectedCategory.id;

      if (this.learningService.isLearned(signId)) {
        // Already learned, ask to unlearn
        const confirmed = await this.alertService.confirm(
          'Unlearn Item?',
          'Do you want to unlearn this item?',
          'Unlearn',
          'Cancel',
          'unlearn'
        );

        if (confirmed) {
          this.learningService.unlearn(signId);
          this.loadRecentLearning();
          this.updateCertificateProgress();
          this.showToast('Item unlearned');
        }
      } else {
        // Not learned, mark as learned
        this.learningService.markAsLearned(signId, categoryId);
        this.loadRecentLearning();
        this.updateCertificateProgress();
        console.log('Marked as learned:', this.currentSign.label);
        this.showToast('Great job! Item learned!');
      }
    }
  }

  loadRecentLearning() {
    const activeCategoryIds = this.learningService.getActiveCategoryIds();
    this.recentLearningList = [];

    activeCategoryIds.forEach((id) => {
      const category = this.categories.find((c) => c.id === id);
      if (category) {
        const itemIds = category.signs.map((s) => s.id);
        const progress = this.learningService.getCategoryProgress(itemIds);
        this.recentLearningList.push({ category, progress });
      }
    });
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

  async toggleFavorite(
    item: FavoriteItem & { isFavorite: boolean },
    event: Event
  ): Promise<void> {
    event.stopPropagation();

    // If currently a favorite, ask for confirmation before removing
    if (item.isFavorite) {
      const confirmed = await this.alertService.confirm(
        'Remove Favorite?',
        `Are you sure you want to remove "${item.name}" from your favorites?`,
        'Remove',
        'Cancel',
        'confirm'
      );

      if (confirmed) {
        const newStatus = this.favoritesService.toggleFavorite(item);
        item.isFavorite = newStatus;
      }
    } else {
      // If adding, just do it
      const newStatus = this.favoritesService.toggleFavorite(item);
      item.isFavorite = newStatus;
    }
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
      route: `/tabs/home?categoryId=${this.selectedCategory?.id}&signId=${item.id}`,
    };

    if (item.isPremium && !this.isPremium) {
      this.openSubscriptionModal();
      return;
    }

    this.favoritesService.toggleFavorite(favoriteItem);
  }

  isItemFavorite(item: AslSign): boolean {
    return this.favoritesService.isFavorite(item.id);
  }

  openCertificate(): void {
    this.navController.navigateForward('/tabs/abc');
  }

  goToHandSign(): void {
    this.navController.navigateForward('/tabs/home');
  }

  goToSettings(): void {
    this.navController.navigateForward('/tabs/setting');
  }

  goToAbc(): void {
    this.navController.navigateForward('/tabs/abc');
  }

  goToQuiz(): void {
    this.navController.navigateForward('/tabs/quiz');
  }

  // Action Button Handlers
  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
  }

  playAnimation() {
    // Play the animation of the current sign (which is always the centered one)
    if (this.currentSign) {
      // Check Premium Status
      if (this.currentSign.isPremium && !this.isPremium) {
        this.openSubscriptionModal();
        return;
      }

      if (this.currentSign.actionName) {
        // Play sign animation temporarily, will return to idle animations when done
        this.three.playTemporary(this.currentSign.actionName);
        console.log('Playing current sign:', this.currentSign.actionName);
      }

      // Also play audio if available
      if (this.currentSign.audioUrl) {
        this.playAudio(this.currentSign.audioUrl);
      } else {
        console.log('No audio available for:', this.currentSign.label);
      }
    } else {
      // Show tooltip if no item is selected
      this.showToast('Select the item to play the animation');
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'top',
      color: 'dark',
      cssClass: 'custom-toast',
    });
    await toast.present();
  }

  async showPremiumAlert(type: string) {
    // Deprecated in favor of openSubscriptionModal
    this.openSubscriptionModal();
  }

  playSound() {
    if (this.currentSign && this.currentSign.audioUrl) {
      this.playAudio(this.currentSign.audioUrl);
    } else {
      this.showToast('No audio available for this item');
    }
  }

  viewAllFavorites() {
    this.navController.navigateForward('/favorites-view-all');
  }
}
