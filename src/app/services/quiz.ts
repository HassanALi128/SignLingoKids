import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

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

  constructor(private http: HttpClient) {}

  // Load questions from JSON and pick random 5
  getRandomQuiz(): Observable<QuizQuestion[]> {
    return this.http.get<QuizQuestion[]>('assets/data/quiz-data.json').pipe(
      map((questions) => this.shuffle(questions).slice(0, 5))
    );
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

  // Load results
  getResults(): QuizResult[] {
    const stored = localStorage.getItem(this.resultsKey);
    return stored ? JSON.parse(stored) : [];
  }

  // Utility: shuffle array
  private shuffle<T>(array: T[]): T[] {
    return array
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }
}
