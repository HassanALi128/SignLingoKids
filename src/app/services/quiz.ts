import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from './data';
import { LearningService } from './learning.service';
import { QuizAttemptService } from './quiz-attempt.service';
import { UserService } from './user.service';
import { DeviceService } from './device.service';
import { Observable, BehaviorSubject, from, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

export interface QuizOption {
  id: string;
  text: string;
  imageUrl: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  mediaUrl?: string;
  actionName?: string;
  actionFile?: string;
  options: QuizOption[];
}

export interface QuizResultDetail {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface QuizResult {
  date: string;
  score: number;
  total: number;
  percentage: number;
  details?: QuizResultDetail[];
}

@Injectable({ providedIn: 'root' })
export class QuizService {
  private resultsKey = 'quiz_results';
  private readonly PROGRESS_THRESHOLD = 25; // 25% learning progress required

  private premiumSubject = new BehaviorSubject<boolean>(false);
  public isPremium$ = this.premiumSubject.asObservable();

  private firstQuizCompletedSubject = new BehaviorSubject<boolean>(false);

  // RxJS for Results
  private resultsSubject = new BehaviorSubject<QuizResult[]>([]);
  public results$ = this.resultsSubject.asObservable();

  // Quiz unlock state: combines progress and first quiz check
  public canStartQuiz$: Observable<boolean> = combineLatest([
    this.premiumSubject,
    this.firstQuizCompletedSubject,
    this.learningService.overallProgress$,
  ]).pipe(
    map(([isPremium, firstCompleted, progress]) => {
      // Premium users always have access
      if (isPremium) return true;

      // If user hasn't completed their first quiz, they can start
      if (!firstCompleted) return true;

      // After first quiz, check progress threshold
      return progress >= this.PROGRESS_THRESHOLD;
    })
  );

  // Combined unlock state with progress info for UI
  public quizUnlockState$: Observable<{
    canStart: boolean;
    progress: number;
    message: string;
  }> = combineLatest([
    this.canStartQuiz$,
    this.learningService.overallProgress$,
  ]).pipe(
    map(([canStart, progress]) => ({
      canStart,
      progress,
      message: this.getQuizLockMessage(canStart, progress),
    }))
  );

  constructor(
    private http: HttpClient,
    private dataService: DataService,
    private learningService: LearningService,
    private quizAttemptService: QuizAttemptService,
    private userService: UserService,
    private deviceService: DeviceService
  ) {
    this.initialize();
  }

  private initialize() {
    // Subscribe to user data to handle auth changes and load data
    this.userService.userData$.subscribe((user) => {
      if (user) {
        this.premiumSubject.next(user.isPremium || false);
        this.loadResults();
        this.checkFirstQuizStatus();
      } else {
        // Clear results if no user (e.g. logout)
        this.resultsSubject.next([]);
        this.premiumSubject.next(false);
        this.firstQuizCompletedSubject.next(false);
      }
    });

    this.initializeTotalItemsCount();
  }

  private async checkFirstQuizStatus() {
    // Check local storage first for immediate UI update
    const localStatus = localStorage.getItem('quiz_ever_attempted') === 'true';
    if (localStatus) {
      this.firstQuizCompletedSubject.next(true);
      return;
    }

    // Double check with Firestore results
    const attempts = await this.quizAttemptService.getRecentAttempts(1);
    if (attempts.length > 0) {
      this.firstQuizCompletedSubject.next(true);
      localStorage.setItem('quiz_ever_attempted', 'true');
    }
  }

  // Renamed from loadInitialResults to be more generic
  private loadResults() {
    this.quizAttemptService.getRecentAttempts().then((attempts) => {
      const results: QuizResult[] = attempts.map((a) => ({
        date: a.createdAt,
        score: a.score,
        total: a.total,
        percentage: a.percentage,
        details: a.details,
      }));
      this.resultsSubject.next(results);
    });
  }

  // Refresh premium status (call this after updating profile)
  refreshPremiumStatus() {
    // Handled by subscription in initialize()
  }

  // Generate dynamic quiz from all categories
  async generateDynamicQuiz(): Promise<QuizQuestion[]> {
    try {
      const categories = await this.dataService.loadCategories();
      const allSigns: any[] = [];

      const isPremium = this.isPremium();

      // Flatten all signs with actionFile
      categories.forEach((cat: any) => {
        if (cat.signs) {
          // Filter signs based on premium status
          const availableSigns = isPremium
            ? cat.signs
            : cat.signs.filter((s: any) => !s.isPremium);

          const signsWithAction = availableSigns.map((s: any) => ({
            ...s,
            actionFile: cat.actionFile,
          }));
          allSigns.push(...signsWithAction);
        }
      });

      if (allSigns.length < 5) {
        console.warn('Not enough signs to generate quiz');
        return [];
      }

      // Shuffle and pick 5 correct answers
      const correctAnswers = this.shuffle(allSigns).slice(0, 5);

      const questions: QuizQuestion[] = correctAnswers.map((sign) => {
        // Pick 2 distractors
        const otherSigns = allSigns.filter((s) => s.id !== sign.id);
        const distractors = this.shuffle(otherSigns).slice(0, 2);

        // Create options
        const options: QuizOption[] = [
          {
            id: sign.id,
            text: sign.label,
            imageUrl: sign.thumbUrl || 'assets/images/placeholder.png',
            isCorrect: true,
          },
          ...distractors.map((d) => ({
            id: d.id,
            text: d.label,
            imageUrl: d.thumbUrl || 'assets/images/placeholder.png',
            isCorrect: false,
          })),
        ];

        return {
          id: sign.id,
          question: 'Select the answer!',
          mediaUrl: sign.audioUrl,
          actionName: sign.actionName,
          actionFile: sign.actionFile,
          options: this.shuffle(options),
        };
      });

      return questions;
    } catch (error) {
      console.error('Error generating quiz:', error);
      return [];
    }
  }

  // Load questions (now uses dynamic generation)
  getRandomQuiz(): Observable<QuizQuestion[]> {
    return from(this.generateDynamicQuiz());
  }

  // Save quiz result (max 5)
  async saveResult(result: QuizResult): Promise<void> {
    try {
      const progress = this.learningService.getOverallProgress();
      const isUnlockedByLearning = progress >= this.PROGRESS_THRESHOLD;

      await this.quizAttemptService.recordAttempt(
        result.score,
        result.total,
        this.isPremium(),
        result.details,
        isUnlockedByLearning
      );

      // Mark first quiz as completed and persist
      this.firstQuizCompletedSubject.next(true);
      localStorage.setItem('quiz_ever_attempted', 'true');

      // Update local state by fetching fresh results
      this.loadResults();
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  }

  getResults(): QuizResult[] {
    return this.resultsSubject.value;
  }

  private shuffle<T>(array: T[]): T[] {
    return array
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  private sessionAttempts = 0;

  getAttempts(): number {
    return this.sessionAttempts;
  }

  incrementAttempts(): void {
    this.sessionAttempts++;
  }

  isPremium(): boolean {
    return this.premiumSubject.value;
  }

  // Initialize total items count for progress calculation (non-premium items only)
  private async initializeTotalItemsCount() {
    try {
      const categories = await this.dataService.loadCategories();
      let totalItems = 0;

      categories.forEach((cat: any) => {
        if (cat.signs && Array.isArray(cat.signs)) {
          // Only count non-premium items for progress calculation
          const nonPremiumSigns = cat.signs.filter(
            (sign: any) => !sign.isPremium
          );
          totalItems += nonPremiumSigns.length;
        }
      });

      this.learningService.setTotalItemsCount(totalItems);
    } catch (error) {
      console.error('Error initializing total items count:', error);
    }
  }

  // Check if user has completed their first quiz
  hasCompletedFirstQuiz(): boolean {
    return this.resultsSubject.value.length > 0;
  }

  // Get user-friendly lock message
  private getQuizLockMessage(canStart: boolean, progress: number): string {
    if (canStart) {
      return 'Ready to test your knowledge!';
    }

    const remaining = this.PROGRESS_THRESHOLD - progress;
    if (remaining <= 5) {
      return `Almost there! Learn a few more signs to unlock! 🌟`;
    }

    return `🔒 Learn some signs to unlock the quiz!`;
  }

  // Get current quiz accessibility (synchronous check)
  canStartQuizNow(): boolean {
    const isPremium = this.premiumSubject.value;
    if (isPremium) return true;

    const firstCompleted = this.firstQuizCompletedSubject.value;
    if (!firstCompleted) return true;

    const progress = this.learningService.getOverallProgress();
    return progress >= this.PROGRESS_THRESHOLD;
  }

  async resetQuizData() {
    await this.quizAttemptService.resetQuizAttempts();
    this.resultsSubject.next([]);
    // Note: We DO NOT reset firstQuizCompletedSubject here
    // because the user has still attempted a quiz before.
    // The lock should persist if they haven't reached 25% learning.
  }
}
