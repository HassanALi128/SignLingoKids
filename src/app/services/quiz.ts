import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from './data';
import { LearningService } from './learning.service';
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
    private learningService: LearningService
  ) {
    this.checkInitialPremiumStatus();
    this.loadInitialResults();
    this.initializeTotalItemsCount();
  }

  private checkInitialPremiumStatus() {
    this.premiumSubject.next(this.isPremium());
  }

  private loadInitialResults() {
    const stored = localStorage.getItem(this.resultsKey);
    const results = stored ? JSON.parse(stored) : [];
    this.resultsSubject.next(results);
  }

  // Refresh premium status (call this after updating profile)
  refreshPremiumStatus() {
    this.premiumSubject.next(this.isPremium());
  }

  // Generate dynamic quiz from all categories
  async generateDynamicQuiz(): Promise<QuizQuestion[]> {
    try {
      const categories = await this.dataService.loadCategories();
      const allSigns: any[] = [];

      // Flatten all signs with actionFile
      categories.forEach((cat: any) => {
        if (cat.signs) {
          const signsWithAction = cat.signs.map((s: any) => ({
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
  saveResult(result: QuizResult): void {
    let results = this.getResults();
    results.unshift(result); // add new at start
    if (results.length > 5) {
      results = results.slice(0, 5); // keep only 5
    }
    localStorage.setItem(this.resultsKey, JSON.stringify(results));

    // Update the subject to notify subscribers
    this.resultsSubject.next(results);
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
    const attempts = localStorage.getItem('quiz_attempts');
    return attempts ? parseInt(attempts, 10) : 0;
  }

  incrementAttempts(): void {
    let attempts = this.getAttempts();
    attempts++;
    localStorage.setItem('quiz_attempts', attempts.toString());
  }

  isPremium(): boolean {
    const profile = localStorage.getItem('userProfile');
    if (profile) {
      const userData = JSON.parse(profile);
      return userData.isPremium === true;
    }
    return false;
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
