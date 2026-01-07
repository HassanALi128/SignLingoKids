import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonImg,
  IonProgressBar,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, lockClosedOutline } from 'ionicons/icons';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuizService, QuizResult } from '../../services/quiz';
import { ProfileService } from '../../services/profile.service';
import { ResultModalComponent } from './result-modal/result-modal.component';

interface UserProfile {
  name: string;
  avatar?: string;
  isPremium?: boolean;
}

interface ResultDisplay extends QuizResult {
  label: string;
  description: string;
  imageUrl: string;
  color: string;
}

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonIcon,
    IonImg,
    IonProgressBar,
  ],
})
export class QuizPage implements OnInit, OnDestroy {
  // RxJS State Management
  private userNameSubject = new BehaviorSubject<string>('User');
  private userAvatarSubject = new BehaviorSubject<string | null>(null);
  private recentResultsSubject = new BehaviorSubject<ResultDisplay[]>([]);
  private isPremiumSubject = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();
  private backButtonSubscription?: Subscription;

  // Public Observables
  userName$: Observable<string> = this.userNameSubject.asObservable();
  userAvatar$: Observable<string | null> =
    this.userAvatarSubject.asObservable();
  recentResults$: Observable<ResultDisplay[]> =
    this.recentResultsSubject.asObservable();
  isPremium$: Observable<boolean> = this.isPremiumSubject.asObservable();

  // Quiz unlock state observables
  quizUnlockState$: Observable<{
    canStart: boolean;
    progress: number;
    message: string;
  }> = this.quizService.quizUnlockState$;

  constructor(
    private quizService: QuizService,
    private router: Router,
    private profileService: ProfileService,
    private modalController: ModalController,
    private platform: Platform
  ) {
    addIcons({ personCircleOutline, lockClosedOutline });
  }

  ngOnInit() {
    this.subscribeToProfile();
    this.loadRecentResults();
    this.subscribeToPremiumStatus();
    this.subscribeToPremiumStatus();
  }

  ionViewDidEnter() {
    this.backButtonSubscription =
      this.platform.backButton.subscribeWithPriority(10, () => {
        this.router.navigate(['/tabs/home']);
      });
  }

  ionViewWillLeave() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToProfile() {
    this.profileService.profile$
      .pipe(takeUntil(this.destroy$))
      .subscribe((profile) => {
        if (profile) {
          this.userNameSubject.next(profile.name || 'User');
          this.userAvatarSubject.next(profile.avatar || null);
          this.isPremiumSubject.next(profile.isPremium || false);
        }
      });
  }

  private subscribeToPremiumStatus() {
    this.quizService.isPremium$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isPremium) => {
        this.isPremiumSubject.next(isPremium);
      });
  }

  private loadRecentResults() {
    this.quizService.results$
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        const displayResults: ResultDisplay[] = results
          .slice(0, 3)
          .map((result, index) => {
            return this.mapResultToDisplay(result, index);
          });
        this.recentResultsSubject.next(displayResults);
      });
  }

  private mapResultToDisplay(result: QuizResult, index: number): ResultDisplay {
    const percentage = result.percentage;
    let label = 'Good Moments';
    let description = 'Great Job! Keep Going!';
    let color = '#FFA726'; // Orange
    let imageUrl = 'assets/landing/landing.png';

    if (percentage === 100) {
      label = 'Perfect';
      description = 'Your Progress Was Awesome';
      color = '#66BB6A'; // Green
      imageUrl = 'assets/landing/landing.png';
    } else if (percentage >= 80) {
      label = 'Almost Perfect';
      description = 'You Did Awesome!';
      color = '#FF7043'; // Red-Orange
      imageUrl = 'assets/landing/landing.png';
    } else if (percentage >= 60) {
      label = 'Good Moments';
      description = 'Great Job! Keep Going!';
      color = '#FFA726'; // Orange
      imageUrl = 'assets/landing/landing.png';
    }

    return {
      ...result,
      label,
      description,
      imageUrl,
      color,
    };
  }

  startQuiz() {
    // Check if quiz is accessible (soft-lock check)
    if (!this.quizService.canStartQuizNow()) {
      // Quiz is locked, do nothing (UI already shows lock state)
      return;
    }

    // Check if user has reached attempt limit (non-premium users)
    const isPremium = this.isPremiumSubject.value;
    const attempts = this.quizService.getAttempts();

    if (!isPremium && attempts >= 5) {
      // Show premium modal or alert
      this.router.navigate(['/tabs/premium']);
      return;
    }

    // Increment attempts
    this.quizService.incrementAttempts();

    // Navigate to quiz questions page
    this.router.navigate(['/tabs/quiz/quiz-questions']);
  }

  async openResultModal(result: ResultDisplay) {
    const modal = await this.modalController.create({
      component: ResultModalComponent,
      componentProps: {
        result: result,
      },
      cssClass: 'result-modal',
      breakpoints: [0, 0.8, 1],
      initialBreakpoint: 0.8,
    });
    await modal.present();
  }

  viewAllResults() {
    // Navigate to full results history page
    // TODO: Implement results history page
    console.log('Viewing all results...');
  }

  goToProfile() {
    this.router.navigate(['tabs/setting']);
  }
}
