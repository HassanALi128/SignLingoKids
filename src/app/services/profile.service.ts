import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserService } from './user.service';

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

  constructor(private userService: UserService) {
    this.loadProfile();
  }

  private loadProfile() {
    this.userService.ensureAuth().then(() => {
      this.userService.userData$.subscribe((userData) => {
        if (userData) {
          const profile: UserProfile = {
            name: userData.displayName || 'Guest',
            avatar: userData.photoURL || 'assets/images/avatars/default.png',
            isPremium: userData.isPremium,
            createdAt: userData.createdAt,
          };
          this.profileSubject.next(profile);
        } else {
          // If no user data yet (e.g. just created), create it
          const user = this.userService.auth.currentUser;
          if (user) {
            this.userService.createUserProfile(user);
          }
        }
      });
    });
  }

  async updateProfile(profile: UserProfile) {
    try {
      await this.userService.updateUserProfile({
        displayName: profile.name,
        photoURL: profile.avatar,
      });
      // Local subject will be updated via subscription
    } catch (error) {
      console.error('Error saving profile to Firestore:', error);
    }
  }

  getProfile(): UserProfile | null {
    return this.profileSubject.value;
  }
}
