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
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonImg,
  IonSpinner,
  NavController,
  ToastController,
  ModalController,
  AlertController,
  Platform,
} from '@ionic/angular/standalone';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { FavoritesService, FavoriteItem } from '../../services/favorites';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { ThreeRenderer } from 'src/app/services/three-renderer.service';
import { DataService } from 'src/app/services/data';
import { LearningService } from 'src/app/services/learning.service';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  heart,
  heartOutline,
  personCircleOutline,
  play,
  refresh,
  resize,
  school,
  shareSocialOutline,
  star,
  volumeHigh,
  lockClosed,
} from 'ionicons/icons';
import { register } from 'swiper/element/bundle';
import { CommonService } from 'src/app/core/services/common';
import { ProfileService } from 'src/app/services/profile.service';
import { SubscriptionModalComponent } from 'src/app/components/subscription-modal/subscription-modal.component';
import { AlertService } from 'src/app/services/alert.service';
import { MonetizationService } from '../../services/monetization.service';

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
  imports: [CommonModule, IonContent, IonButton, IonIcon, IonImg, IonSpinner],
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LandingPage implements OnInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('swiper') swiperRef!: ElementRef;

  private destroy$ = new Subject<void>();
  private backButtonSub?: { unsubscribe: () => void };

  userName: string = 'User';
  userAvatar: string = '';
  isPremium: boolean = false;

  categories: Category[] = [];
  private categoriesSubject = new BehaviorSubject<Category[]>([]);

  featuredItems: (FavoriteItem & { isFavorite: boolean })[] = [];

  certificateProgress: number = 0;
  progressCircumference: number = 2 * Math.PI * 24;
  progressOffset: number = 0;

  abcLearnedCount: number = 0;
  totalABCLetters: number = 26;

  selectedCategory: Category | null = null;
  categoryItems: AslSign[] = [];

  currentSign: AslSign | null = null;
  recentLearningList: { category: Category; progress: number }[] = [];

  isLoading3D: boolean = false;
  isFullscreen: boolean = false;
  private isInitializing3D: boolean = false;
  private isSwiperProgrammaticSlide: boolean = false;

  constructor(
    private navController: NavController,
    private favoritesService: FavoritesService,
    private three: ThreeRenderer,
    private dataService: DataService,
    private learningService: LearningService,
    private toastController: ToastController,
    private commonService: CommonService,
    private profileService: ProfileService,
    private modalController: ModalController,
    private alertController: AlertController,
    private alertService: AlertService,
    private platform: Platform,
    private route: ActivatedRoute,
    private router: Router,
    private monetizationService: MonetizationService
  ) {
    addIcons({
      arrowBack,
      resize,
      refresh,
      play,
      volumeHigh,
      school,
      heartOutline,
      personCircleOutline,
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
    this.profileService.profile$
      .pipe(takeUntil(this.destroy$))
      .subscribe((profile) => {
        if (profile) {
          this.userName = profile.name || 'User';
          this.userAvatar = profile.avatar || '';
        }
      });

    this.monetizationService.isPremium$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.isPremium = status;
      });

    combineLatest([this.learningService.progress$, this.categoriesSubject])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([progress, categories]) => {
        if (progress && categories.length > 0) {
          this.loadRecentLearning();
          this.updateCertificateProgress();
        }
      });

    // Load Categories
    try {
      this.categories = await this.dataService.loadCategories();
      this.categoriesSubject.next(this.categories);

      // Preload the model + ALL category action files in background so every
      // category opens instantly (not just Basics). Files are staggered to
      // avoid hammering the network simultaneously.
      setTimeout(async () => {
        await this.three.preloadModel();

        // Always-needed idle/default animation first
        await this.three.preloadAction(
          'assets/aslkidanimation/actions/new-asl-default-animation.glb'
        );

        // Collect all unique actionFiles from loaded categories
        const actionFiles = [
          ...new Set(
            this.categories
              .map((c) => c.actionFile)
              .filter((f): f is string => !!f)
          ),
        ];

        // Stagger preloads 300 ms apart so they don't race for bandwidth
        for (const file of actionFiles) {
          this.three.preloadAction(file).catch(() => {}); // fire-and-forget
          await new Promise((r) => setTimeout(r, 300));
        }
      }, 1500);
    } catch (error) {
      console.error('Error loading categories:', error);
    }

    // Open category from query params (no setInterval — categories already loaded above)
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const categoryId = params['categoryId'];
        const signId = params['signId'];

        if (categoryId && this.categories.length > 0) {
          const category = this.categories.find((c) => c.id === categoryId);
          if (category) {
            setTimeout(() => this.selectCategory(category, false, signId), 300);
          }
        }
      });

    this.progressOffset =
      this.progressCircumference -
      (this.certificateProgress / 100) * this.progressCircumference;

    this.favoritesService.favorites$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.featuredItems = this.favoritesService
          .getRecentFavorites(4)
          .map((f) => ({
            ...f,
            isFavorite: this.favoritesService.isFavorite(f.id),
            bgColor: f.bgColor ?? '#ffffff',
          }));
      });
  }

  ionViewWillEnter() {
    if (!this.isPremium) {
      this.monetizationService.showBanner();
    }
  }

  ionViewWillLeave() {
    this.monetizationService.hideBanner();
    this.stopAudio();
    this.three.pauseRendering();
    this.toggleTabBar(true);
    this.backButtonSub?.unsubscribe();
    this.backButtonSub = undefined;
  }

  ionViewDidEnter() {
    // Pre-initialize the WebGL renderer while idle (before any category is tapped).
    // This creates the renderer once; subsequent category opens reuse it via reinitialize().
    if (this.canvasRef) {
      const el = this.canvasRef.nativeElement;
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      this.three.preInitializeRenderer(this.canvasRef, w, h);
      // Renderer is created but we don't need to render on the home screen.
      // reinitialize() will call startRendering() when a category is opened.
      if (!this.selectedCategory) {
        this.three.pauseRendering();
      }
    }

    if (this.selectedCategory) {
      this.three.resumeRendering();
    }

    // Hardware back button: close category detail if open, else default handler
    this.backButtonSub = this.platform.backButton.subscribeWithPriority(
      20,
      (processNextHandler) => {
        if (this.selectedCategory) {
          this.closeCategoryDetail();
        } else {
          processNextHandler();
        }
      }
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.backButtonSub?.unsubscribe();
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
    if (!this.isPremium) {
      await this.monetizationService.showInterstitial();
    }

    this.isLoading3D = true;
    this.selectedCategory = category;
    this.categoryItems = category.signs || [];
    this.toggleTabBar(false);

    // this.showToast('Select an item to see the animation');

    // Canvas is always in DOM (outside @if block) so no tick delay needed
    await this.init3DModel(category);

    let initialIndex = 0;
    if (resume) {
      const learnedStatuses = this.categoryItems.map((item) =>
        this.isItemLearned(item)
      );
      const lastLearnedIndex = learnedStatuses.lastIndexOf(true);
      if (lastLearnedIndex !== -1) initialIndex = lastLearnedIndex;
    }

    if (targetSignId) {
      const targetIndex = this.categoryItems.findIndex(
        (item) => item.id === targetSignId
      );
      if (targetIndex !== -1) initialIndex = targetIndex;
    }

    if (this.categoryItems.length > 0) {
      this.currentSign = this.categoryItems[initialIndex];
    }

    // Give Swiper web component one cycle to initialize before calling slideTo
    if (initialIndex > 0) {
      await new Promise((r) => setTimeout(r, 50));
      this.swiperRef?.nativeElement?.swiper?.slideTo(initialIndex, 300, true);
    }
  }

  onSlideChange(event: any) {
    const swiper = event.target.swiper;
    const index = swiper.realIndex;
    if (this.categoryItems?.[index]) {
      this.currentSign = this.categoryItems[index];
    }
    this.isSwiperProgrammaticSlide = false;
    // Auto-play animation on every slide change — whether from card tap or manual swipe
    this.playAnimation();
  }

  async init3DModel(category: Category) {
    if (!this.canvasRef) return;
    if (this.isInitializing3D) return;

    this.isInitializing3D = true;
    this.isLoading3D = true;

    try {
      const canvas = this.canvasRef.nativeElement;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;

      // reinitialize() reuses the existing WebGL renderer (preserves context, avoids freeze).
      // Falls back to full initialize() only on the very first call.
      this.three.reinitialize(this.canvasRef, width, height);

      await this.three.loadModel(
        'assets/aslkidanimation/models/asl_new_modle.glb'
      );

      if (category.actionFile) {
        await this.three.loadActions(category.actionFile);
      } else {
        await this.three.loadActions(
          'assets/aslkidanimation/actions/asl_new_Animation_Basic.glb'
        );
      }

      this.three.centerModel();

      await this.three.loadActions(
        'assets/aslkidanimation/actions/new-asl-default-animation.glb'
      );

      this.three.play('idel-common');
    } catch (error) {
      console.error('Error initializing 3D model:', error);
    } finally {
      this.isLoading3D = false;
      this.isInitializing3D = false;
    }
  }

  closeCategoryDetail(): void {
    // Reset init guard so rapid tap-back-tap doesn't permanently block re-init
    this.isInitializing3D = false;
    this.isLoading3D = false;

    this.three.stop();
    this.three.pauseRendering(); // Stop RAF loop — renderer stays alive for next open
    this.selectedCategory = null;
    this.categoryItems = [];
    this.stopAudio();
    this.toggleTabBar(true);

    // Clear query parameters so switching tabs doesn't falsely trigger re-open
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoryId: null, signId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private toggleTabBar(show: boolean) {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      tabBar.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Opens a favorited sign directly in the category viewer on this page.
   * Parses categoryId/signId from the saved route instead of navigating away
   * (navigating away loses the canvas context and breaks 3D).
   */
  openFeatured(item: FavoriteItem & { isFavorite: boolean }): void {
    if (!item.route) return;

    // Route format: /tabs/home?categoryId=XXX&signId=YYY
    const url = new URL(item.route, window.location.origin);
    const categoryId = url.searchParams.get('categoryId');
    const signId = url.searchParams.get('signId') || undefined;

    if (this.categories.length > 0) {
      // Primary: match by categoryId (works for properly-encoded new routes)
      let category = categoryId
        ? this.categories.find((c) => c.id === categoryId)
        : undefined;

      // Fallback for legacy broken routes (e.g. "emotions&colors" split the URL):
      // Search all categories for a sign matching signId
      if (!category && signId) {
        category = this.categories.find((c) =>
          c.signs.some((s) => s.id === signId)
        );
      }

      if (category) {
        this.selectCategory(category, false, signId);
        return;
      }
    }

    // Final fallback: navigate if we still can't resolve locally
    if (item.route) {
      this.navController.navigateForward(item.route);
    }
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  /** Returns a translucent gradient wash for a favorite card based on the category color. */
  getCardGradient(bgColor?: string): string {
    const base = bgColor || '#ff9a9e';
    return `linear-gradient(135deg, ${base}44, ${base}22)`;
  }

  private currentAudio?: HTMLAudioElement;

  playAudio(audioUrl: string): void {
    this.stopAudio();
    try {
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio
        .play()
        .catch((e) => console.warn('Audio play failed:', e));
    } catch (error) {
      console.warn('Error creating audio:', error);
    }
  }

  stopAudio(): void {
    this.currentAudio?.pause();
    this.currentAudio = undefined;
  }

  // ── Sign playback ──────────────────────────────────────────────────────────

  /**
   * Called when user taps a card inside the swiper.
   * Slides to the tapped card; playAnimation() fires via onSlideChange.
   * If the swiper isn't ready yet, falls back to playing animation directly.
   */
  async playSign(item: AslSign, index: number = -1): Promise<void> {
    this.currentSign = item;

    const swiper = this.swiperRef?.nativeElement?.swiper;
    if (index >= 0 && swiper) {
      this.isSwiperProgrammaticSlide = true;
      swiper.slideTo(index, 300, true);
      // playAnimation() will be triggered by onSlideChange once the slide settles
    } else {
      // Swiper not ready or no index — play animation directly
      this.playAnimation();
    }
  }

  async openSubscriptionModal() {
    const modal = await this.modalController.create({
      component: SubscriptionModalComponent,
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'subscription-modal-sheet',
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'unlock') {
      this.goToPremium();
    }
  }

  async markAsLearned() {
    if (!this.currentSign || !this.selectedCategory) return;

    if (this.currentSign.isPremium && !this.isPremium) {
      this.openSubscriptionModal();
      return;
    }

    const signId = this.currentSign.id;
    const categoryId = this.selectedCategory.id;

    if (this.learningService.isLearned(signId)) {
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
      this.learningService.markAsLearned(signId, categoryId);
      this.loadRecentLearning();
      this.updateCertificateProgress();
      this.showToast('Great job! Item learned!');
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
    let totalSigns = 0;
    let learnedCount = 0;

    this.categories.forEach((cat) => {
      const signs = cat.signs || [];
      totalSigns += signs.length;
      learnedCount += signs.filter((s) =>
        this.learningService.isLearned(s.id)
      ).length;
    });

    totalSigns += this.totalABCLetters;
    this.abcLearnedCount = this.learnedABCCount;
    learnedCount += this.learnedABCCount;

    if (totalSigns > 0) {
      this.certificateProgress = Math.round((learnedCount / totalSigns) * 100);
      this.progressOffset =
        this.progressCircumference -
        (this.certificateProgress / 100) * this.progressCircumference;
    }
  }

  /**
   * Cached count of learned ABC letters, loaded from Capacitor Preferences.
   * Starts at 0 and updates asynchronously.
   */
  private learnedABCCount = 0;

  private async loadLearnedABCCount(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'learnedLetters' });
      this.learnedABCCount = value ? (JSON.parse(value) as string[]).length : 0;
    } catch {
      this.learnedABCCount = 0;
    }
  }

  isItemLearned(item: AslSign): boolean {
    return this.learningService.isLearned(item.id);
  }

  async toggleFavorite(
    item: FavoriteItem & { isFavorite: boolean },
    event: Event
  ): Promise<void> {
    event.stopPropagation();

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
      const newStatus = this.favoritesService.toggleFavorite(item);
      item.isFavorite = newStatus;
    }
  }

  isFavorite(item: FavoriteItem): boolean {
    return this.favoritesService.isFavorite(item.id);
  }

  toggleItemFavorite(item: AslSign, event: Event): void {
    event.stopPropagation();

    if (item.isPremium && !this.isPremium) {
      this.openSubscriptionModal();
      return;
    }

    const favoriteItem: FavoriteItem = {
      id: item.id,
      name: item.label,
      image: item.thumbUrl || '',
      type: 'sign',
      bgColor: this.selectedCategory?.color,
      addedAt: Date.now(),
      // Properly encode categoryId so special chars like & in 'emotions&colors' don't corrupt the URL
      route: `/tabs/home?categoryId=${encodeURIComponent(this.selectedCategory?.id ?? '')}&signId=${encodeURIComponent(item.id)}`,
    };

    this.favoritesService.toggleFavorite(favoriteItem);
  }

  isItemFavorite(item: AslSign): boolean {
    return this.favoritesService.isFavorite(item.id);
  }

  openCertificate(): void {
    this.navController.navigateForward('/tabs/abc');
  }

  goToAbc(): void {
    this.navController.navigateForward('/tabs/abc');
  }

  goToQuiz(): void {
    this.navController.navigateForward('/tabs/quiz');
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
  }

  playAnimation() {
    if (!this.currentSign) {
      this.showToast('Select an item to play the animation');
      return;
    }

    if (this.currentSign.isPremium && !this.isPremium) {
      this.openSubscriptionModal();
      return;
    }

    if (this.currentSign.actionName) {
      this.three.playTemporary(this.currentSign.actionName);
    }

    if (this.currentSign.audioUrl) {
      this.playAudio(this.currentSign.audioUrl);
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color: 'dark',
      cssClass: 'custom-toast',
    });
    await toast.present();
  }

  viewAllFavorites() {
    this.navController.navigateForward('/favorites-view-all');
  }
}
