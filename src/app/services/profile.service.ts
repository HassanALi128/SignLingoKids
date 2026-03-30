import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
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
export class ProfileService implements OnDestroy {
  private profileSubject = new BehaviorSubject<UserProfile | null>(null);
  profile$: Observable<UserProfile | null> = this.profileSubject.asObservable();

  /** Track last ID sent to RevenueCat to prevent duplicate logIn calls */
  private lastIdentifiedUserId: string | null = null;
  private userDataSub?: Subscription;

  constructor(
    private userService: UserService,
    private purchasesService: PurchasesService
  ) {
    console.log('ProfileService: Initializing...');
    this.loadProfile();
  }

  ngOnDestroy() {
    this.userDataSub?.unsubscribe();
  }

  private loadProfile() {
    this.userService.ensureAuth();
    this.userDataSub = this.userService.userData$.subscribe((userData) => {
      if (userData) {
        console.log('ProfileService: Received user data', userData);
        const currentProfile = this.profileSubject.value;
        const profile: UserProfile = {
          name: userData.displayName || 'Guest',
          avatar: userData.photoURL || 'assets/images/avatars/default.png',
          isPremium: this.purchasesService.isPremium() || userData.isPremium, // Prefer RevenueCat
          createdAt: userData.createdAt,
        };
        this.profileSubject.next(profile);

        // Identify user in RevenueCat — only when the ID actually changes
        // (userData$ emits multiple times per session; without this guard,
        //  RevenueCat.logIn fires 4+ times causing redundant network calls)
        const userIdForRC = userData.deviceIdHash || userData.uid;
        if (userIdForRC && userIdForRC !== this.lastIdentifiedUserId) {
          this.lastIdentifiedUserId = userIdForRC;
          this.purchasesService.identifyUser(userIdForRC);
        }
      } else {
        // If no user data yet (e.g. just created), create it
        const user = this.userService.auth.currentUser;
        if (user) {
          this.userService.createUserProfile(user);
        }
      }
    });
  }

  async updateProfile(profile: UserProfile) {
    console.log('ProfileService: Updating profile', profile);
    try {
      await this.userService.updateUserProfile({
        displayName: profile.name,
        photoURL: profile.avatar,
      });

      // ── Immediate local update ──────────────────────────────────────────
      // Don't wait for Firestore to round-trip back through userData$.
      // Update the BehaviorSubject right now so the UI reflects the change instantly.
      const current = this.profileSubject.value;
      if (current) {
        this.profileSubject.next({
          ...current,
          name: profile.name,
          avatar: profile.avatar,
        });
      }
    } catch (error) {
      console.error('Error saving profile to Firestore:', error);
    }
  }

  getProfile(): UserProfile | null {
    return this.profileSubject.value;
  }
}
