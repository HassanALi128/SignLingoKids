import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserService } from './user.service';
import { PurchasesService } from './purchases.service';

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

  constructor(
    private userService: UserService,
    private purchasesService: PurchasesService
  ) {
    this.loadProfile();
  }

  private loadProfile() {
    this.userService.ensureAuth().then(() => {
      this.userService.userData$.subscribe((userData) => {
        if (userData) {
          const currentProfile = this.profileSubject.value;
          const profile: UserProfile = {
            name: userData.displayName || 'Guest',
            avatar: userData.photoURL || 'assets/images/avatars/default.png',
            isPremium: this.purchasesService.isPremium() || userData.isPremium, // Prefer RevenueCat
            createdAt: userData.createdAt,
          };
          this.profileSubject.next(profile);

          // Identify user in RevenueCat
          // Use deviceIdHash for better persistence across reinstalls
          if (userData.deviceIdHash) {
            this.purchasesService.identifyUser(userData.deviceIdHash);
          } else if (userData.uid) {
            this.purchasesService.identifyUser(userData.uid);
          }
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
