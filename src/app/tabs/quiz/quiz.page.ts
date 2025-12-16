import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { NavController, IonicModule, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  closeCircle,
  play,
  playCircle,
  star,
  swapHorizontal,
  handLeft,
  mic,
  time,
  refresh,
  home,
  arrowBack,
  helpCircleOutline,
} from 'ionicons/icons';
import { QuizQuestion, QuizResult, QuizService } from 'src/app/services/quiz';
import { ThreeRenderer } from 'src/app/services/three-renderer.service';
import { DataService } from 'src/app/services/data';
import { Router } from '@angular/router';

interface ExtendedQuizResult extends QuizResult {
  image?: string;
  title?: string;
  subtitle?: string;
  color?: string;
}

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
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
  resultsHistory: ExtendedQuizResult[] = [];
  characterLoaded = false;
  loading = true;

  categories: any[] = [];

  constructor(
    private navCtrl: NavController,
    private quizService: QuizService,
    private three: ThreeRenderer,
    private router: Router,
    private alertCtrl: AlertController, // Inject AlertController
    private dataService: DataService // Inject DataService
  ) {
    addIcons({
      star,
      play,
      playCircle,
      checkmarkCircle,
      closeCircle,
      swapHorizontal,
      handLeft,
      mic,
      time,
      refresh,
      home,
      'arrow-back': arrowBack,
      'help-circle-outline': helpCircleOutline,
    });
  }

  goToLanding(): void {
    this.router.navigate(['tabs/quiz']);
  }

  userName: string = 'Babu';
  userAvatar: string = '';

  async ngOnInit() {
    this.loadUserProfile();
    this.resultsHistory = this.quizService.getResults().map((res) => ({
      ...res,
      image: this.getResultImage(res.percentage),
      subtitle: this.getResultSubtitle(res.percentage),
      title: this.getResultTitle(res.percentage),
      color: this.getResultColor(res.percentage),
    }));

    // Load categories to access animation data
    try {
      this.categories = await this.dataService.loadCategories();
      console.log(
        'QuizPage: Loaded categories for animations',
        this.categories
      );
    } catch (error) {
      console.error('QuizPage: Error loading categories', error);
    }
  }

  loadUserProfile() {
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        const userData = JSON.parse(profile);
        this.userName = userData.name || 'Babu';
        this.userAvatar = userData.avatar || '';
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  getResultImage(percentage: number): string {
    if (percentage >= 100) return 'assets/images/objects/apple.svg';
    if (percentage >= 80) return 'assets/images/objects/forest.svg';
    return 'assets/images/objects/tree.svg';
  }

  getResultSubtitle(percentage: number): string {
    if (percentage >= 100) return 'Your Progress Was Awesome';
    if (percentage >= 80) return 'You Did Awesome!';
    return 'Great Job! Keep Going!';
  }

  getResultTitle(percentage: number): string {
    if (percentage >= 100) return 'Perfect';
    if (percentage >= 80) return 'Almost Perfect';
    return 'Good Moments';
  }

  getResultColor(percentage: number): string {
    if (percentage >= 100) return '#FF0040'; // Red
    if (percentage >= 80) return '#FF4000'; // Orange-Red
    return '#FF8000'; // Orange
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      if (!this.canvasRef) {
        console.error('Canvas not found!');
        return;
      }

      const canvas = this.canvasRef.nativeElement;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;

      this.three.initialize(this.canvasRef, width, height);

      // Load the main character model
      await this.three.loadModel(
        'assets/aslkidanimation/models/asl_new_Modle.glb'
      );

      // Load default actions
      await this.three.loadActions(
        'assets/aslkidanimation/actions/alsagirl_model_animation.glb'
      );
      this.three.centerModel();

      this.characterLoaded = true;
      this.loading = false;
    } catch (e: any) {
      console.error('Failed to load character:', e);
      this.loading = false;
    }
  }

  hasIncompleteQuiz = false;

  // Handle Back Navigation with Confirmation
  async handleBackNavigation(): Promise<void> {
    if (this.quizStarted && !this.quizCompleted) {
      const alert = await this.alertCtrl.create({
        header: 'Quit Quiz?',
        message:
          'Are you sure you want to quit? Your progress will be saved so you can resume later.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Yes, Quit',
            handler: () => {
              this.quizStarted = false;
              this.hasIncompleteQuiz = true;
              this.loading = false; // Ensure loading is off
            },
          },
        ],
      });
      await alert.present();
    } else {
      this.goToLanding();
    }
  }

  // Start the quiz with limit check
  async startQuiz(isNew: boolean = true): Promise<void> {
    // Check if user is premium
    const isPremium = this.quizService.isPremium();
    // Get current attempts
    const attempts = this.quizService.getAttempts();

    // If not premium and attempts >= 5, show alert
    if (!isPremium && attempts >= 5) {
      const alert = await this.alertCtrl.create({
        header: 'Premium Required',
        message:
          'You have reached the free limit of 5 quizzes. Please upgrade to Premium to continue learning!',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Check for incomplete quiz if starting new
    if (isNew && this.hasIncompleteQuiz) {
      const alert = await this.alertCtrl.create({
        header: 'Incomplete Quiz',
        message:
          'You have an incomplete quiz. Do you want to start a new one? Your current progress will be lost.',
        buttons: [
          {
            text: 'Resume Existing',
            handler: () => {
              this.resumeQuiz();
            },
          },
          {
            text: 'Start New',
            handler: () => {
              this.hasIncompleteQuiz = false;
              this.startNewQuiz();
            },
          },
        ],
      });
      await alert.present();
      return;
    }

    if (isNew) {
      this.startNewQuiz();
    }
  }

  private startNewQuiz() {
    // Proceed to start quiz
    this.quizService.getRandomQuiz().subscribe(async (q) => {
      this.questions = q;
      this.totalQuestions = q.length;

      // 🚀 Preload animations for the selected questions
      this.loading = true; // Show loading spinner if needed
      console.log('🚀 Preloading quiz animations...');

      const uniqueActionFiles = new Set<string>();

      for (const question of this.questions) {
        const correctOption = question.options.find((opt) => opt.isCorrect);
        if (correctOption) {
          const signInfo = this.findSignInfo(correctOption.id);
          if (signInfo && signInfo.actionFile) {
            uniqueActionFiles.add(signInfo.actionFile);
          }
        }
      }

      // Load all required files
      for (const file of uniqueActionFiles) {
        try {
          await this.three.preloadActions(file);
          console.log('✅ Preloaded:', file);
        } catch (error) {
          console.warn('Failed to preload:', file, error);
        }
      }

      this.loading = false;
      console.log('✨ All animations preloaded!');

      this.quizStarted = true;
      this.quizCompleted = false;
      this.currentQuestionIndex = 0;
      this.selectedAnswer = null;
      this.correctAnswers = 0;
      this.showResult = false;
      this.showFeedback = false;
    });
  }

  resumeQuiz(): void {
    this.quizStarted = true;
    this.loading = false;
    // Don't reset question index or answers
  }

  get currentQuestion(): QuizQuestion {
    return this.questions[this.currentQuestionIndex];
  }

  // 🔊 Play Question Media (Audio/Video) + Quiz Action
  async playQuestionMedia(): Promise<void> {
    // Play quiz action on 3D model
    if (this.characterLoaded && this.currentQuestion) {
      try {
        // Find the correct answer option to determine which animation to play
        const correctOption = this.currentQuestion.options.find(
          (opt) => opt.isCorrect
        );

        if (correctOption) {
          // Find animation details for this sign
          const signInfo = this.findSignInfo(correctOption.id);

          if (signInfo && signInfo.actionFile && signInfo.actionName) {
            console.log(
              `Playing animation for ${correctOption.id}: ${signInfo.actionName}`
            );

            // Just play - file is already preloaded
            this.three.play(signInfo.actionName);
          } else {
            // Fallback if no specific animation found
            console.warn(
              `No animation found for ${correctOption.id}, playing default`
            );
            this.three.play('quiz_action');
          }
        } else {
          this.three.play('quiz_action');
        }
      } catch (error) {
        console.warn('Could not play quiz action:', error);
        // Fallback to any available action
        this.three.play('idle');
      }
    }
  }

  // Helper to find sign info from loaded categories
  findSignInfo(
    signId: string
  ): { actionFile?: string; actionName?: string } | null {
    for (const category of this.categories) {
      const sign = category.signs.find((s: any) => s.id === signId);
      if (sign) {
        return {
          actionFile: category.actionFile,
          actionName: sign.actionName,
        };
      }
    }
    return null;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questions.length - 1;
  }

  selectAnswer(answerIndex: number): void {
    if (this.showResult) return; // Prevent changing answer if result is already shown
    this.selectedAnswer = answerIndex;
  }

  checkAnswer(): void {
    if (this.selectedAnswer === null) return;

    const selectedOption = this.currentQuestion.options[this.selectedAnswer];
    this.isCorrectAnswer = selectedOption.isCorrect;
    if (this.isCorrectAnswer) this.correctAnswers++;

    this.showResult = true;
    this.showFeedback = false;

    // Auto-advance after a short delay
    setTimeout(() => {
      this.nextQuestion();
    }, 1500); // 1.5 second delay
  }

  nextQuestion(): void {
    if (this.isLastQuestion) {
      this.completeQuiz();
    } else {
      this.currentQuestionIndex++;
      this.selectedAnswer = null;
      this.showResult = false;

      // Play media for next question automatically if desired, or let user click play
      // this.playQuestionMedia();
    }
  }

  completeQuiz(): void {
    // Save result in history
    const result: QuizResult = {
      score: this.correctAnswers,
      total: this.totalQuestions,
      percentage: this.getScorePercentage(),
      date: new Date().toISOString(),
    };

    this.resultsHistory.unshift(result);

    // max 5 results rakho
    if (this.resultsHistory.length > 5) {
      this.resultsHistory.pop();
    }

    // Increment attempts count after completing a quiz
    this.quizService.incrementAttempts();

    // Reset quiz flags
    this.quizCompleted = false; // ✅ ab result screen pe nahi jayega
    this.quizStarted = false; // ✅ wapas start screen pe aayega
    this.showFeedback = false;
    this.hasIncompleteQuiz = false; // Reset incomplete flag
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
      const height = canvas.clientHeight || window.innerHeight;
      this.three.resize(width, height);
    }
  }

  ionViewWillLeave() {
    this.three.dispose();
  }

  ngOnDestroy(): void {
    this.three.dispose();
  }
}
