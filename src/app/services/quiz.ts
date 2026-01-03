import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from './data';
import { LearningService } from './learning.service';
import { QuizAttemptService } from './quiz-attempt.service';
import { UserService } from './user.service';
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

export interface QuizResult {
  date: string;
  score: number;
  total: number;
  percentage: number;
}

@Injectable({ providedIn: 'root' })
export class QuizService {
  private resultsKey = 'quiz_results';
  private readonly PROGRESS_THRESHOLD = 15; // 25% learning progress required

  private premiumSubject = new BehaviorSubject<boolean>(false);
  public isPremium$ = this.premiumSubject.asObservable();

  // RxJS for Results
  private resultsSubject = new BehaviorSubject<QuizResult[]>([]);
  public results$ = this.resultsSubject.asObservable();

  // Quiz unlock state: combines progress and first quiz check
  public canStartQuiz$: Observable<boolean> = combineLatest([
    this.premiumSubject,
    this.resultsSubject,
    this.learningService.overallProgress$,
  ]).pipe(
    map(([isPremium, results, progress]) => {
      // Premium users always have access
      if (isPremium) return true;

      // First quiz is always unlocked
      if (results.length === 0) return true;

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
    private userService: UserService
  ) {
    this.checkInitialPremiumStatus();
    this.loadInitialResults();
    this.initializeTotalItemsCount();
  }

  private checkInitialPremiumStatus() {
    this.userService.userData$.subscribe((user) => {
      this.premiumSubject.next(user?.isPremium || false);
    });
  }

  private loadInitialResults() {
    this.quizAttemptService.getRecentAttempts().then((attempts) => {
      const results: QuizResult[] = attempts.map((a) => ({
        date: a.createdAt,
        score: a.score,
        total: a.total,
        percentage: a.percentage,
      }));
      this.resultsSubject.next(results);
    });
  }

  // Refresh premium status (call this after updating profile)
  refreshPremiumStatus() {
    // Handled by subscription in checkInitialPremiumStatus
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
      await this.quizAttemptService.recordAttempt(
        result.score,
        result.total,
        this.isPremium()
      );

      // Update local state by fetching fresh results
      this.loadInitialResults();
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

  getAttempts(): number {
    // This was local storage based, now we rely on backend limits or local cache if needed.
    // For now returning 0 or we could fetch from DeviceService if we exposed it.
    return 0;
  }

  incrementAttempts(): void {
    // Handled by backend in recordAttempt
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

    const hasQuizResults = this.resultsSubject.value.length > 0;
    if (!hasQuizResults) return true; // First quiz is free

    const progress = this.learningService.getOverallProgress();
    return progress >= this.PROGRESS_THRESHOLD;
  }
}
