import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LearningProgress {
  learnedItemIds: string[];
  recentCategoryId: string | null;
  lastAccessed: number;
}

@Injectable({
  providedIn: 'root',
})
export class LearningService {
  private readonly STORAGE_KEY = 'learning_progress';

  private progressSubject = new BehaviorSubject<LearningProgress>({
    learnedItemIds: [],
    recentCategoryId: null,
    lastAccessed: Date.now(),
  });

  public progress$ = this.progressSubject.asObservable();

  constructor() {
    this.loadProgress();
  }

  private loadProgress() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.progressSubject.next(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading learning progress:', error);
    }
  }

  private saveProgress(progress: LearningProgress) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
      this.progressSubject.next(progress);
    } catch (error) {
      console.error('Error saving learning progress:', error);
    }
  }

  markAsLearned(itemId: string, categoryId: string) {
    const current = this.progressSubject.value;
    const learnedIds = new Set(current.learnedItemIds);

    if (!learnedIds.has(itemId)) {
      learnedIds.add(itemId);

      this.saveProgress({
        learnedItemIds: Array.from(learnedIds),
        recentCategoryId: categoryId,
        lastAccessed: Date.now(),
      });
    } else if (current.recentCategoryId !== categoryId) {
      // Update recent category even if item is already learned
      this.saveProgress({
        ...current,
        recentCategoryId: categoryId,
        lastAccessed: Date.now(),
      });
    }
  }

  isLearned(itemId: string): boolean {
    return this.progressSubject.value.learnedItemIds.includes(itemId);
  }

  getRecentCategoryId(): string | null {
    return this.progressSubject.value.recentCategoryId;
  }

  getCategoryProgress(categoryItemIds: string[]): number {
    if (!categoryItemIds || categoryItemIds.length === 0) return 0;

    const learnedCount = categoryItemIds.filter((id) =>
      this.isLearned(id)
    ).length;
    return Math.round((learnedCount / categoryItemIds.length) * 100);
  }
}
