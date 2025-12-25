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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline } from 'ionicons/icons';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuizService, QuizResult } from '../../services/quiz';

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
  ],
})
export class QuizPage implements OnInit, OnDestroy {
  // RxJS State Management
  private userNameSubject = new BehaviorSubject<string>('User');
  private userAvatarSubject = new BehaviorSubject<string | null>(null);
  private recentResultsSubject = new BehaviorSubject<ResultDisplay[]>([]);
  private isPremiumSubject = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  // Public Observables
  userName$: Observable<string> = this.userNameSubject.asObservable();
  userAvatar$: Observable<string | null> =
    this.userAvatarSubject.asObservable();
  recentResults$: Observable<ResultDisplay[]> =
    this.recentResultsSubject.asObservable();
  isPremium$: Observable<boolean> = this.isPremiumSubject.asObservable();

  constructor(private quizService: QuizService, private router: Router) {
    addIcons({ personCircleOutline });
  }

  ngOnInit() {
    this.loadUserProfile();
    this.loadRecentResults();
    this.subscribeToPremiumStatus();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile() {
    const profileStr = localStorage.getItem('userProfile');
    if (profileStr) {
      try {
        const profile: UserProfile = JSON.parse(profileStr);
        this.userNameSubject.next(profile.name || 'User');
        this.userAvatarSubject.next(profile.avatar || null);
        this.isPremiumSubject.next(profile.isPremium || false);
      } catch (error) {
        console.error('Error parsing user profile:', error);
      }
    }
  }

  private subscribeToPremiumStatus() {
    this.quizService.isPremium$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isPremium) => {
        this.isPremiumSubject.next(isPremium);
      });
  }

  private loadRecentResults() {
    const results = this.quizService.getResults();
    const displayResults: ResultDisplay[] = results
      .slice(0, 3)
      .map((result, index) => {
        return this.mapResultToDisplay(result, index);
      });
    this.recentResultsSubject.next(displayResults);
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
    // Check if user has reached attempt limit (non-premium users)
    const isPremium = this.isPremiumSubject.value;
    const attempts = this.quizService.getAttempts();

    if (!isPremium && attempts >= 3) {
      // Show premium modal or alert
      this.router.navigate(['/tabs/premium']);
      return;
    }

    // Increment attempts
    this.quizService.incrementAttempts();

    // Navigate to quiz questions page
    this.router.navigate(['/tabs/quiz/quiz-questions']);
  }

  viewAllResults() {
    // Navigate to full results history page
    // TODO: Implement results history page
    console.log('Viewing all results...');
  }

  goToProfile() {
    this.router.navigate(['/profile-setup']);
  }
}
