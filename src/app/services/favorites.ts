import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FavoriteItem {
  id: string;
  name: string;
  image: string;
  type: 'abc' | 'category' | 'sign' | 'quiz';
  bgColor?: string;
  route?: string;
  addedAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly STORAGE_KEY = 'userFavorites';
  private favoritesSubject = new BehaviorSubject<FavoriteItem[]>([]);
  public favorites$: Observable<FavoriteItem[]> =
    this.favoritesSubject.asObservable();

  constructor() {
    this.loadFavorites();
  }

  /**
   * Load favorites from localStorage
   */
  private loadFavorites(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const favorites = JSON.parse(stored);
        this.favoritesSubject.next(favorites);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  /**
   * Save favorites to localStorage
   */
  private saveFavorites(favorites: FavoriteItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
      this.favoritesSubject.next(favorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }

  /**
   * Get all favorites
   */
  getFavorites(): FavoriteItem[] {
    return this.favoritesSubject.value;
  }

  /**
   * Get favorites by type
   */
  getFavoritesByType(type: FavoriteItem['type']): FavoriteItem[] {
    return this.favoritesSubject.value.filter((item) => item.type === type);
  }

  /**
   * Check if an item is favorited
   */
  isFavorite(id: string): boolean {
    return this.favoritesSubject.value.some((item) => item.id === id);
  }

  /**
   * Add item to favorites
   */
  addFavorite(item: FavoriteItem): void {
    const favorites = this.favoritesSubject.value;

    // Check if already exists
    if (this.isFavorite(item.id)) {
      return;
    }

    // Add timestamp
    item.addedAt = Date.now();

    // Add to favorites
    const updated = [...favorites, item];
    this.saveFavorites(updated);
  }

  /**
   * Remove item from favorites
   */
  removeFavorite(id: string): void {
    const favorites = this.favoritesSubject.value;
    const updated = favorites.filter((item) => item.id !== id);
    this.saveFavorites(updated);
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(item: FavoriteItem): boolean {
    if (this.isFavorite(item.id)) {
      this.removeFavorite(item.id);
      return false;
    } else {
      this.addFavorite(item);
      return true;
    }
  }

  /**
   * Get recent favorites (limited count)
   */
  getRecentFavorites(limit: number = 4): FavoriteItem[] {
    return this.favoritesSubject.value
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, limit);
  }

  /**
   * Clear all favorites
   */
  clearAllFavorites(): void {
    this.saveFavorites([]);
  }

  /**
   * Get favorites count
   */
  getFavoritesCount(): number {
    return this.favoritesSubject.value.length;
  }
}
