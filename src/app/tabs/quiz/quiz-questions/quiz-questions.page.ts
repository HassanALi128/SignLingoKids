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
} from 'src/app/services/quiz';
import { ThreeRenderer } from 'src/app/services/three-renderer.service';
import { Haptics, NotificationType } from '@capacitor/haptics';

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  selectedOption: QuizOption | null;
  isChecked: boolean;
  isCorrect: boolean | null;
  isLoading: boolean;
  isAnimationLoading: boolean; // New state for animation loading
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
    private navController: NavController
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
        'assets/aslkidanimation/actions/alsagirl_model_animation.glb'
      );

      // Preload all question animations
      const state = this.quizStateSubject.value;
      const actionFiles = state.questions
        .map((q) => q.actionFile)
        .filter((f): f is string => !!f);

      const uniqueFiles = [...new Set(actionFiles)];

      // 🚀 FIX: Load the FIRST animation immediately and await it
      // This prevents the "lag" on the first question
      if (state.questions.length > 0 && state.questions[0].actionFile) {
        const firstAnimFile = state.questions[0].actionFile;
        console.log(
          '🚀 Preloading FIRST animation immediately:',
          firstAnimFile
        );
        try {
          await this.threeRenderer.loadActions(firstAnimFile);
        } catch (e) {
          console.warn('Failed to preload first animation:', e);
        }
      }

      this.threeRenderer.centerModel();

      console.log('3D model initialized successfully');

      // Hide loader IMMEDIATELY after model is ready
      this.updateState({ isLoading: false });

      // Start loading remaining question animations in the background
      if (uniqueFiles.length > 0) {
        console.log('Background preloading remaining animations:', uniqueFiles);
        this.threeRenderer.preloadActionsBatch(uniqueFiles).catch((err) => {
          console.warn('Background preload error (non-fatal):', err);
        });
      }

      // Check and load the first question's animation immediately
      this.checkAndLoadCurrentAnimation();
    } catch (error) {
      console.error('Error initializing 3D model:', error);
      this.updateState({ isLoading: false });
    }
  }

  private async preloadQuestionAnimations() {
    const state = this.quizStateSubject.value;
    const actionFiles = state.questions
      .map((q) => q.actionFile)
      .filter((f): f is string => !!f);

    const uniqueFiles = [...new Set(actionFiles)];

    if (uniqueFiles.length > 0) {
      console.log('Background preloading animations:', uniqueFiles);
      // We don't await this, let it run in background
      this.threeRenderer.preloadActionsBatch(uniqueFiles).catch((err) => {
        console.warn('Background preload error (non-fatal):', err);
      });
    }
  }

  private async checkAndLoadCurrentAnimation() {
    const state = this.quizStateSubject.value;
    const currentQuestion = state.questions[state.currentIndex];

    if (!currentQuestion || !currentQuestion.actionFile) return;

    // If animation is not yet loaded, show loading state on play button
    // We can check if it's loaded by checking if the action exists in the renderer
    // But since ThreeRenderer doesn't expose a "hasAction" method easily for files,
    // we'll rely on the fact that loadActions caches.

    // Ideally we would check `threeRenderer.isActionLoaded(currentQuestion.actionFile)`
    // For now, we'll just ensure it's loaded before playing.
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
    this.updateState({
      isChecked: true,
      isCorrect,
      score: isCorrect ? state.score + 1 : state.score,
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

  private finishQuiz() {
    const state = this.quizStateSubject.value;
    const result: QuizResult = {
      date: new Date().toISOString(),
      score: state.score,
      total: state.questions.length,
      percentage: (state.score / state.questions.length) * 100,
    };

    this.quizService.saveResult(result);

    // Navigate back to quiz page to show results
    this.router.navigate(['/tabs/quiz']);
  }

  goBack() {
    this.navController.back();
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
