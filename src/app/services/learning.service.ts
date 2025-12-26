import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LearningProgress {
  learnedItemIds: string[];
  activeCategoryIds: string[]; // Changed from recentCategoryId
  lastAccessed: number;
}

@Injectable({
  providedIn: 'root',
})
export class LearningService {
  private readonly STORAGE_KEY = 'learning_progress';

  private progressSubject = new BehaviorSubject<LearningProgress>({
    learnedItemIds: [],
    activeCategoryIds: [],
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
        const parsed = JSON.parse(stored);
        // Migration: convert old recentCategoryId to activeCategoryIds if needed
        if (parsed.recentCategoryId && !parsed.activeCategoryIds) {
          parsed.activeCategoryIds = [parsed.recentCategoryId];
          delete parsed.recentCategoryId;
        }
        this.progressSubject.next(parsed);
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
    let activeCategories = [...(current.activeCategoryIds || [])];

    // Add category to active list if not present, or move to front
    const index = activeCategories.indexOf(categoryId);
    if (index !== -1) {
      activeCategories.splice(index, 1);
    }
    activeCategories.unshift(categoryId);

    // Limit to a reasonable number of recent categories if needed,
    // but for now let's keep all as requested.

    if (!learnedIds.has(itemId)) {
      learnedIds.add(itemId);
      this.saveProgress({
        learnedItemIds: Array.from(learnedIds),
        activeCategoryIds: activeCategories,
        lastAccessed: Date.now(),
      });
    } else {
      this.saveProgress({
        ...current,
        activeCategoryIds: activeCategories,
        lastAccessed: Date.now(),
      });
    }
  }

  isLearned(itemId: string): boolean {
    return this.progressSubject.value.learnedItemIds.includes(itemId);
  }

  getActiveCategoryIds(): string[] {
    return this.progressSubject.value.activeCategoryIds || [];
  }

  getCategoryProgress(categoryItemIds: string[]): number {
    if (!categoryItemIds || categoryItemIds.length === 0) return 0;

    const learnedCount = categoryItemIds.filter((id) =>
      this.isLearned(id)
    ).length;
    return Math.round((learnedCount / categoryItemIds.length) * 100);
  }
}
