import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { arrowBack, helpCircleOutline, playCircle } from 'ionicons/icons';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  QuizService,
  QuizQuestion,
  QuizOption,
  QuizResult,
} from '../../../services/quiz';
import { ThreeRenderer } from '../../../services/three-renderer.service';

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  selectedAnswerId: string | null;
  isLoading: boolean;
  isAnswered: boolean;
}

@Component({
  selector: 'app-quiz-questions',
  templateUrl: './quiz-questions.page.html',
  styleUrls: ['./quiz-questions.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
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
    selectedAnswerId: null,
    isLoading: true,
    isAnswered: false,
  });

  private destroy$ = new Subject<void>();

  // Public Observables
  quizState$: Observable<QuizState> = this.quizStateSubject.asObservable();

  // Derived observables for template
  get currentQuestion$(): Observable<QuizQuestion | null> {
    return new Observable((observer) => {
      this.quizState$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
        const question = state.questions[state.currentIndex] || null;
        observer.next(question);
      });
    });
  }

  get isLoading$(): Observable<boolean> {
    return new Observable((observer) => {
      this.quizState$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
        observer.next(state.isLoading);
      });
    });
  }

  // Audio management
  private currentAudio?: HTMLAudioElement;

  constructor(
    private quizService: QuizService,
    private threeRenderer: ThreeRenderer,
    private router: Router,
    private navController: NavController
  ) {
    addIcons({ arrowBack, helpCircleOutline, playCircle });
  }

  async ngOnInit() {
    await this.loadQuizQuestions();
    this.hideTabBar();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAudio();
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
        isLoading: false,
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

      this.threeRenderer.centerModel();

      console.log('3D model initialized successfully');
    } catch (error) {
      console.error('Error initializing 3D model:', error);
    }
  }

  playQuestionAudio() {
    const state = this.quizStateSubject.value;
    const currentQuestion = state.questions[state.currentIndex];

    if (!currentQuestion) return;

    // Stop any currently playing audio
    this.stopAudio();

    // Play audio if available
    if (currentQuestion.mediaUrl) {
      try {
        this.currentAudio = new Audio(currentQuestion.mediaUrl);
        this.currentAudio.play().catch((error) => {
          console.warn('Could not play audio:', error);
        });
      } catch (error) {
        console.warn('Error creating audio:', error);
      }
    }

    // Play animation if available (you can customize this based on question)
    // For now, we'll play a generic animation
    const animations = this.threeRenderer.getClipNames();
    if (animations.length > 0) {
      // Play a random animation or the first one
      this.threeRenderer.play(animations[0]);
    }
  }

  private stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = undefined;
    }
  }

  selectAnswer(option: QuizOption) {
    const state = this.quizStateSubject.value;

    // Prevent selecting if already answered
    if (state.isAnswered) return;

    // Update selected answer
    this.updateState({
      selectedAnswerId: option.id,
      isAnswered: true,
    });

    // Update score if correct
    if (option.isCorrect) {
      this.updateState({
        score: state.score + 1,
      });
    }

    // Auto-advance to next question after a delay
    setTimeout(() => {
      this.nextQuestion();
    }, 1000);
  }

  nextQuestion() {
    const state = this.quizStateSubject.value;
    const nextIndex = state.currentIndex + 1;

    // Check if quiz is complete
    if (nextIndex >= state.questions.length) {
      this.finishQuiz();
      return;
    }

    // Move to next question
    this.updateState({
      currentIndex: nextIndex,
      selectedAnswerId: null,
      isAnswered: false,
    });

    // Stop audio when moving to next question
    this.stopAudio();
  }

  finishQuiz() {
    const state = this.quizStateSubject.value;

    // Calculate results
    const total = state.questions.length;
    const score = state.score;
    const percentage = Math.round((score / total) * 100);

    // Save result
    const result: QuizResult = {
      date: new Date().toISOString(),
      score,
      total,
      percentage,
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
    return state.selectedAnswerId === option.id;
  }

  isOptionCorrect(option: QuizOption): boolean {
    const state = this.quizStateSubject.value;
    return state.isAnswered && option.isCorrect;
  }

  isOptionWrong(option: QuizOption): boolean {
    const state = this.quizStateSubject.value;
    return (
      state.isAnswered &&
      state.selectedAnswerId === option.id &&
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
