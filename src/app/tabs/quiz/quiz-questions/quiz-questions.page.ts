import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  NavController,
  IonPopover,
  AlertController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  helpCircleOutline,
  play,
  checkmarkCircle,
  closeCircle,
  arrowForward,
} from 'ionicons/icons';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import {
  QuizService,
  QuizQuestion,
  QuizOption,
  QuizResult,
  QuizResultDetail,
} from 'src/app/services/quiz';
import { ThreeRenderer } from 'src/app/services/three-renderer.service';
import { Haptics, NotificationType } from '@capacitor/haptics';
import confetti from 'canvas-confetti';
import { MonetizationService } from 'src/app/services/monetization.service';

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  selectedOption: QuizOption | null;
  isChecked: boolean;
  isCorrect: boolean | null;
  isLoading: boolean;
  isAnimationLoading: boolean; // New state for animation loading
  answers: QuizResultDetail[];
}

@Component({
  selector: 'app-quiz-questions',
  templateUrl: './quiz-questions.page.html',
  styleUrls: ['./quiz-questions.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonSpinner,
    IonPopover,
  ],
})
export class QuizQuestionsPage implements OnInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // RxJS State Management
  private quizStateSubject = new BehaviorSubject<QuizState>({
    questions: [],
    currentIndex: 0,
    score: 0,
    selectedOption: null,
    isChecked: false,
    isCorrect: null,
    isLoading: true,
    isAnimationLoading: false,
    answers: [],
  });

  private destroy$ = new Subject<void>();

  // Public Observables
  quizState$ = this.quizStateSubject.asObservable();

  // Derived observables for template
  isLoading$ = this.quizStateSubject.pipe(
    takeUntil(this.destroy$),
    map((s) => s.isLoading)
  );

  isAnimationLoading$ = this.quizStateSubject.pipe(
    takeUntil(this.destroy$),
    map((s) => s.isAnimationLoading)
  );

  constructor(
    private quizService: QuizService,
    private threeRenderer: ThreeRenderer,
    private router: Router,
    private navController: NavController,
    private monetizationService: MonetizationService,
    private alertController: AlertController,
    private platform: Platform
  ) {
    addIcons({
      arrowBack,
      helpCircleOutline,
      play,
      checkmarkCircle,
      closeCircle,
      arrowForward,
    });
  }

  async ngOnInit() {
    await this.loadQuizQuestions();
    this.hideTabBar();
  }

  ionViewWillLeave() {
    this.threeRenderer.pauseRendering();
    this.showTabBar();
    // Unregister back button action if needed (Ionic handles this stack usually, but good to be safe)
  }

  ionViewDidEnter() {
    this.threeRenderer.resumeRendering();

    // Handle Hardware Back Button
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.confirmQuit();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.threeRenderer.dispose();
    this.showTabBar();
  }

  private async loadQuizQuestions() {
    try {
      this.updateState({ isLoading: true });

      // Load random quiz questions
      const questions = await this.quizService.getRandomQuiz().toPromise();

      if (!questions || questions.length === 0) {
        console.error('No quiz questions loaded');
        this.goBack();
        return;
      }

      this.updateState({
        questions,
      });

      // Initialize 3D model after questions are loaded
      setTimeout(() => {
        this.init3DModel();
      }, 100);
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      this.updateState({ isLoading: false });
      this.goBack();
    }
  }

  private async init3DModel() {
    if (!this.canvasRef) {
      console.warn('Canvas not available yet');
      return;
    }

    try {
      const canvas = this.canvasRef.nativeElement;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight * 0.6;

      this.threeRenderer.initialize(this.canvasRef, width, height);

      // Load the 3D character model
      await this.threeRenderer.loadModel(
        'assets/aslkidanimation/models/asl_new_Modle.glb'
      );

      // Load animations
      await this.threeRenderer.loadActions(
        'assets/aslkidanimation/actions/asl_new_Animation_Basic.glb'
      );

      // Preload all question animations
      const state = this.quizStateSubject.value;
      const actionFiles = state.questions
        .map((q) => q.actionFile)
        .filter((f): f is string => !!f);

      const uniqueFiles = [...new Set(actionFiles)];

      this.threeRenderer.centerModel();

      console.log('3D model initialized successfully');

      // Hide loader IMMEDIATELY after model is ready
      this.updateState({ isLoading: false });

      // Start loading ALL question animations in the background
      if (uniqueFiles.length > 0) {
        console.log('Background preloading animations:', uniqueFiles);
        this.threeRenderer.preloadActionsBatch(uniqueFiles).catch((err) => {
          console.warn('Background preload error (non-fatal):', err);
        });
      }

      // Check and load the first question's animation immediately
      // This will show the spinner on the play button if it's not ready yet
      this.checkAndLoadCurrentAnimation();
    } catch (error) {
      console.error('Error initializing 3D model:', error);
      this.updateState({ isLoading: false });
    }
  }

  private async preloadQuestionAnimations() {
    // Deprecated: Logic moved to init3DModel
  }

  private async checkAndLoadCurrentAnimation() {
    const state = this.quizStateSubject.value;
    const currentQuestion = state.questions[state.currentIndex];

    if (!currentQuestion || !currentQuestion.actionFile) return;

    // Check if animation is already loaded
    if (this.threeRenderer.isActionLoaded(currentQuestion.actionFile)) {
      console.log('Animation already loaded:', currentQuestion.actionFile);
      return;
    }

    // If not loaded, show loading state on play button
    console.log(
      'Animation not loaded, showing spinner:',
      currentQuestion.actionFile
    );
    this.updateState({ isAnimationLoading: true });

    try {
      await this.threeRenderer.loadActions(currentQuestion.actionFile);
    } catch (error) {
      console.error('Error loading current animation:', error);
    } finally {
      this.updateState({ isAnimationLoading: false });
    }
  }

  async playQuestionAnimation() {
    const state = this.quizStateSubject.value;
    if (state.isAnimationLoading) return;

    const currentQuestion = state.questions[state.currentIndex];

    if (!currentQuestion) return;

    // Play animation if available
    if (currentQuestion.actionName) {
      try {
        // If it's a file-based animation, ensure it's loaded
        if (currentQuestion.actionFile) {
          // Check if we need to load it
          // We set loading state just in case it takes a moment
          this.updateState({ isAnimationLoading: true });

          // This will use the cache if already loaded by preloadQuestionAnimations
          await this.threeRenderer.loadActions(currentQuestion.actionFile);

          this.updateState({ isAnimationLoading: false });
        }

        this.threeRenderer.play(currentQuestion.actionName);
      } catch (error) {
        console.error('Error playing animation:', error);
        this.updateState({ isAnimationLoading: false });
      }
    } else {
      // Fallback to generic animation
      const animations = this.threeRenderer.getClipNames();
      if (animations.length > 0) {
        this.threeRenderer.play(animations[0]);
      }
    }
  }

  selectAnswer(option: QuizOption) {
    const state = this.quizStateSubject.value;
    if (state.isChecked) return; // Prevent changing after check

    this.updateState({ selectedOption: option });
  }

  async checkAnswer() {
    const state = this.quizStateSubject.value;
    if (!state.selectedOption || state.isChecked) return;

    const isCorrect = state.selectedOption.isCorrect;

    // Update state
    const currentQuestion = state.questions[state.currentIndex];
    const correctAnswer = currentQuestion.options.find((o) => o.isCorrect);

    const answerDetail: QuizResultDetail = {
      question: correctAnswer?.text || 'Unknown Sign',
      userAnswer: state.selectedOption.text,
      correctAnswer: correctAnswer?.text || 'Unknown',
      isCorrect: isCorrect,
    };

    this.updateState({
      isChecked: true,
      isCorrect,
      score: isCorrect ? state.score + 1 : state.score,
      answers: [...state.answers, answerDetail],
    });

    // Feedback
    if (isCorrect) {
      // Happy animation
      // Try to find a happy animation, otherwise play generic
      const happyAnims = ['Happy', 'Jump', 'Victory', 'Success'];
      const available = this.threeRenderer.getClipNames();
      const happyAnim = happyAnims.find((a) =>
        available.some((av) => av.includes(a))
      );

      if (happyAnim) {
        this.threeRenderer.play(happyAnim);
      }

      await Haptics.notification({ type: NotificationType.Success });
    } else {
      // Vibrate for wrong answer
      await Haptics.notification({ type: NotificationType.Error });
    }
  }

  nextQuestion() {
    const state = this.quizStateSubject.value;

    if (state.currentIndex < state.questions.length - 1) {
      this.updateState({
        currentIndex: state.currentIndex + 1,
        selectedOption: null,
        isChecked: false,
        isCorrect: null,
      });

      // Pre-check/load next animation
      this.checkAndLoadCurrentAnimation();
    } else {
      this.finishQuiz();
    }
  }

  private async finishQuiz() {
    const state = this.quizStateSubject.value;
    const percentage = (state.score / state.questions.length) * 100;

    const result: QuizResult = {
      date: new Date().toISOString(),
      score: state.score,
      total: state.questions.length,
      percentage: percentage,
      details: state.answers,
    };

    this.quizService.saveResult(result);

    // 🎉 Celebration or Vibration based on score
    if (percentage > 70) {
      this.triggerConfetti();
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.vibrate({ duration: 500 }); // Long vibration for low score
    }

    // Navigate back to quiz page to show results
    await this.monetizationService.showInterstitial();
    this.router.navigate(['/tabs/quiz']);
  }

  private triggerConfetti() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }

  goBack() {
    this.confirmQuit();
  }

  async confirmQuit() {
    const alert = await this.alertController.create({
      header: 'Quit Quiz? 😢',
      message: "Are you sure you want to give up? You're doing great!",
      cssClass: 'modern-alert',
      buttons: [
        {
          text: 'Quit',
          role: 'confirm',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.navController.back();
          },
        },
        {
          text: 'Keep Playing',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
          handler: () => {
            // Do nothing, stay in quiz
          },
        },
      ],
    });

    await alert.present();
  }

  showHelp() {
    // TODO: Implement help modal or tooltip
    console.log('Show help');
  }

  isOptionSelected(option: QuizOption): boolean {
    const state = this.quizStateSubject.value;
    return state.selectedOption?.id === option.id;
  }

  isOptionCorrect(option: QuizOption): boolean {
    const state = this.quizStateSubject.value;
    return state.isChecked && option.isCorrect;
  }

  isOptionWrong(option: QuizOption): boolean {
    const state = this.quizStateSubject.value;
    return (
      state.isChecked &&
      state.selectedOption?.id === option.id &&
      !option.isCorrect
    );
  }

  private updateState(partialState: Partial<QuizState>) {
    const currentState = this.quizStateSubject.value;
    this.quizStateSubject.next({
      ...currentState,
      ...partialState,
    });
  }

  private hideTabBar() {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      tabBar.style.display = 'none';
    }
  }

  private showTabBar() {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      tabBar.style.display = 'flex';
    }
  }
}
