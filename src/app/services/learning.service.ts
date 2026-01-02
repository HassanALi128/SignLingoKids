import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from './data';

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

  // Track total items count for overall progress calculation
  private totalItemsSubject = new BehaviorSubject<number>(0);

  // Track all non-premium item IDs for filtering
  private nonPremiumItemIds = new Set<string>();

  public progress$ = this.progressSubject.asObservable();

  // Observable for overall learning progress percentage (non-premium items only)
  public overallProgress$: Observable<number> = combineLatest([
    this.progressSubject,
    this.totalItemsSubject,
  ]).pipe(
    map(([progress, totalItems]) => {
      if (totalItems === 0) return 0;
      // Only count non-premium learned items
      const nonPremiumLearnedCount = progress.learnedItemIds.filter((id) =>
        this.nonPremiumItemIds.has(id)
      ).length;
      return Math.round((nonPremiumLearnedCount / totalItems) * 100);
    })
  );

  constructor(private dataService: DataService) {
    this.loadProgress();
    this.loadNonPremiumItems();
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

  unlearn(itemId: string) {
    const current = this.progressSubject.value;
    const learnedIds = new Set(current.learnedItemIds);

    if (learnedIds.has(itemId)) {
      learnedIds.delete(itemId);
      this.saveProgress({
        ...current,
        learnedItemIds: Array.from(learnedIds),
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

  // Set total items count and non-premium IDs from categories data
  setTotalItemsCount(count: number): void {
    this.totalItemsSubject.next(count);
  }

  // Load non-premium item IDs from categories
  private async loadNonPremiumItems() {
    try {
      const categories = await this.dataService.loadCategories();
      const nonPremiumIds = new Set<string>();

      categories.forEach((cat: any) => {
        if (cat.signs && Array.isArray(cat.signs)) {
          cat.signs.forEach((sign: any) => {
            if (!sign.isPremium) {
              nonPremiumIds.add(sign.id);
            }
          });
        }
      });

      this.nonPremiumItemIds = nonPremiumIds;
    } catch (error) {
      console.error('Error loading non-premium items:', error);
    }
  }

  // Get current overall progress percentage (non-premium items only)
  getOverallProgress(): number {
    const totalItems = this.totalItemsSubject.value;
    if (totalItems === 0) return 0;

    // Only count non-premium learned items
    const nonPremiumLearnedCount =
      this.progressSubject.value.learnedItemIds.filter((id) =>
        this.nonPremiumItemIds.has(id)
      ).length;
    return Math.round((nonPremiumLearnedCount / totalItems) * 100);
  }

  // Get total learned items count
  getLearnedItemsCount(): number {
    return this.progressSubject.value.learnedItemIds.length;
  }
}
