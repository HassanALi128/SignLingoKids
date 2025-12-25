import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from './data';
import { Observable, BehaviorSubject, from } from 'rxjs';

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
  private premiumSubject = new BehaviorSubject<boolean>(false);
  public isPremium$ = this.premiumSubject.asObservable();

  constructor(private http: HttpClient, private dataService: DataService) {
    this.checkInitialPremiumStatus();
  }

  private checkInitialPremiumStatus() {
    this.premiumSubject.next(this.isPremium());
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
  }

  getResults(): QuizResult[] {
    const stored = localStorage.getItem(this.resultsKey);
    return stored ? JSON.parse(stored) : [];
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
}
