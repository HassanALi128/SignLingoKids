import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from './data';
import { ProgressService } from './progress.service';

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

  constructor(
    private dataService: DataService,
    private progressService: ProgressService
  ) {
    this.loadProgress();
    this.loadNonPremiumItems();
  }

  private loadProgress() {
    this.progressService.initProgress();
    this.progressService.progress$.subscribe((data) => {
      if (data) {
        this.progressSubject.next({
          learnedItemIds: data.learnedItemIds || [],
          activeCategoryIds: data.activeCategoryIds || [],
          lastAccessed: data.lastAccessed || Date.now(),
        });
      }
    });
  }

  markAsLearned(itemId: string, categoryId: string) {
    this.progressService.markAsLearned(itemId, categoryId);
  }

  unlearn(itemId: string) {
    this.progressService.unlearn(itemId);
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
