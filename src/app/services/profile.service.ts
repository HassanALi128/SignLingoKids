import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserProfile {
  name: string;
  avatar: string;
  isPremium?: boolean;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private profileSubject = new BehaviorSubject<UserProfile | null>(null);
  profile$: Observable<UserProfile | null> = this.profileSubject.asObservable();

  constructor() {
    this.loadProfile();
  }

  private loadProfile() {
    try {
      const storedProfile = localStorage.getItem('userProfile');
      if (storedProfile) {
        this.profileSubject.next(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error('Error loading profile from localStorage:', error);
    }
  }

  updateProfile(profile: UserProfile) {
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile));
      this.profileSubject.next(profile);
    } catch (error) {
      console.error('Error saving profile to localStorage:', error);
    }
  }

  getProfile(): UserProfile | null {
    return this.profileSubject.value;
  }
}
