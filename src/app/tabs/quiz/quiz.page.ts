import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { NavController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, play, playCircle, star, swapHorizontal, handLeft, mic, time, refresh, home } from 'ionicons/icons';
import { QuizQuestion, QuizResult, QuizService } from 'src/app/services/quiz';
import { ThreeRenderer } from 'src/app/services/three-renderer.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: true,
  imports: [CommonModule,IonicModule]
})
export class QuizPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  quizStarted = false;
  quizCompleted = false;
  currentQuestionIndex = 0;
  selectedAnswer: number | null = null;
  showResult = false;
  showFeedback = false;
  isCorrectAnswer = false;
  correctAnswers = 0;
  totalQuestions = 0;
  showProgressModal = false;
  showResultModalFlag = false;
  selectedResult?: QuizResult;

  questions: QuizQuestion[] = [];
  resultsHistory: QuizResult[] = [];
  characterLoaded = false;
  loading = true;

  constructor(
    private navCtrl: NavController,
    private quizService: QuizService,
    private three: ThreeRenderer,
    private router: Router
  ) {
    addIcons({star,play,playCircle,checkmarkCircle,closeCircle,swapHorizontal,handLeft,mic,time,refresh,home })
  }

  goToLanding(): void {
    this.router.navigate(['/landing']);
  }

  ngOnInit() {
    this.resultsHistory = this.quizService.getResults();
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      if (!this.canvasRef) {
        console.error('Canvas not found!');
        return;
      }

      const canvas = this.canvasRef.nativeElement;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || Math.round(window.innerHeight * 0.45);

      this.three.initialize(this.canvasRef, width, height);

      // Load the main character model
      await this.three.loadModel('assets/aslkidanimation/models/alsagirl_model.glb');

      // Load default actions
      await this.three.loadActions('assets/aslkidanimation/actions/alsagirl_model_animation.glb');
      this.three.centerModel();

      this.characterLoaded = true;
      this.loading = false;
    } catch (e: any) {
      console.error('Failed to load character:', e);
      this.loading = false;
    }
  }

  startQuiz(): void {
    this.quizService.getRandomQuiz().subscribe((q) => {
      this.questions = q;
      this.totalQuestions = q.length;
    this.quizStarted = true;
    this.quizCompleted = false;
    this.currentQuestionIndex = 0;
    this.selectedAnswer = null;
      this.correctAnswers = 0;
    this.showResult = false;
    this.showFeedback = false;
    });
  }

  get currentQuestion(): QuizQuestion {
    return this.questions[this.currentQuestionIndex];
  }

  // 🔊 Play Question Media (Audio/Video) + Quiz Action
  playQuestionMedia(): void {
    // Play audio if available
    const mediaUrl = this.currentQuestion?.mediaUrl;
    if (mediaUrl) {
      const audio = new Audio(mediaUrl);
      audio.play().catch(err => {
        console.log('Audio play failed:', err);
      });
    }

    // Play quiz action on 3D model
    if (this.characterLoaded && this.currentQuestion) {
      try {
        // Play a quiz-related animation
        this.three.play('quiz_action'); // You can change this to any available action
        console.log('Playing quiz action on 3D model');
      } catch (error) {
        console.warn('Could not play quiz action:', error);
        // Fallback to any available action
        this.three.play('idle');
      }
    }
  }


  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questions.length - 1;
  }

  selectAnswer(answerIndex: number): void {
    if (!this.showResult) this.selectedAnswer = answerIndex;
  }

  checkAnswer(): void {
    if (this.selectedAnswer === null) return;

    const selectedOption = this.currentQuestion.options[this.selectedAnswer];
    this.isCorrectAnswer = selectedOption.isCorrect;
    if (this.isCorrectAnswer) this.correctAnswers++;

    this.showResult = true;
    this.showFeedback = true;

    // Remove automatic timeout - now user will click button to continue
  }

  nextQuestion(): void {
    if (this.isLastQuestion) {
      this.completeQuiz();
    } else {
      this.currentQuestionIndex++;
      this.selectedAnswer = null;
      this.showResult = false;
    }
  }

  completeQuiz(): void {
    // Save result in history
    const result: QuizResult = {
      score: this.correctAnswers,
      total: this.totalQuestions,
      percentage: this.getScorePercentage(),
      date: new Date().toISOString()
    };

    this.resultsHistory.unshift(result);

    // max 5 results rakho
    if (this.resultsHistory.length > 5) {
      this.resultsHistory.pop();
    }

    // Reset quiz flags
    this.quizCompleted = false; // ✅ ab result screen pe nahi jayega
    this.quizStarted = false;   // ✅ wapas start screen pe aayega
    this.showFeedback = false;
  }


  getScorePercentage(): number {
    return Math.round((this.correctAnswers / this.totalQuestions) * 100);
  }

  getProgressMessage(): string {
    const percentage = this.getScorePercentage();
    if (percentage >= 80) return 'Awesome';
    if (percentage >= 60) return 'Good';
    return 'Keep Learning';
  }

  showProgressPopup(): void {
    this.showProgressModal = true;
  }

  hideProgressPopup(): void {
    this.showProgressModal = false;
  }

  showResultModal(result: QuizResult): void {
    this.selectedResult = result;
    this.showResultModalFlag = true;
  }

  hideResultModal(): void {
    this.showResultModalFlag = false;
    this.selectedResult = undefined;
  }

  hideFeedback(): void {
    this.showFeedback = false;
    // Auto navigate to next question after hiding feedback
    setTimeout(() => {
      this.nextQuestion();
    }, 500);
  }

  goBack(): void {
    this.navCtrl.back();
  }

  // 🔥 Window resize handling
  @HostListener('window:resize')
  onResize(): void {
    if (this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || Math.round(window.innerHeight * 0.45);
      this.three.resize(width, height);
    }
  }

  ngOnDestroy(): void {
    // Clean up if needed
  }
}
