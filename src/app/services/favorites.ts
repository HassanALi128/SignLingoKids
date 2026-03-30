import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

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
  public favorites$: Observable<FavoriteItem[]> = this.favoritesSubject.asObservable();

  constructor() {
    this.loadFavorites();
  }

  private async loadFavorites(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEY });
      if (value) {
        this.favoritesSubject.next(JSON.parse(value));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  private async saveFavorites(favorites: FavoriteItem[]): Promise<void> {
    try {
      await Preferences.set({ key: this.STORAGE_KEY, value: JSON.stringify(favorites) });
      this.favoritesSubject.next(favorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }

  getFavorites(): FavoriteItem[] {
    return this.favoritesSubject.value;
  }

  getFavoritesByType(type: FavoriteItem['type']): FavoriteItem[] {
    return this.favoritesSubject.value.filter((item) => item.type === type);
  }

  isFavorite(id: string): boolean {
    return this.favoritesSubject.value.some((item) => item.id === id);
  }

  addFavorite(item: FavoriteItem): void {
    if (this.isFavorite(item.id)) return;
    item.addedAt = Date.now();
    const updated = [...this.favoritesSubject.value, item];
    this.saveFavorites(updated);
  }

  removeFavorite(id: string): void {
    const updated = this.favoritesSubject.value.filter((item) => item.id !== id);
    this.saveFavorites(updated);
  }

  toggleFavorite(item: FavoriteItem): boolean {
    if (this.isFavorite(item.id)) {
      this.removeFavorite(item.id);
      return false;
    }
    this.addFavorite(item);
    return true;
  }

  getRecentFavorites(limit: number = 4): FavoriteItem[] {
    return [...this.favoritesSubject.value]
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, limit);
  }

  clearAllFavorites(): void {
    this.saveFavorites([]);
  }

  getFavoritesCount(): number {
    return this.favoritesSubject.value.length;
  }
}
