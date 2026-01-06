import { Injectable } from '@angular/core';
import { Auth, signInAnonymously, user, User } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  updateDoc,
  docData,
} from '@angular/fire/firestore';
import {
  Observable,
  of,
  switchMap,
  tap,
  map,
  BehaviorSubject,
  combineLatest,
} from 'rxjs';
import { DeviceService } from './device.service';

export interface UserData {
  uid: string;
  deviceIdHash: string;
  isAnonymous: boolean;
  isPremium: boolean;
  platform: string;
  createdAt: string;
  lastActiveAt: string;
  displayName?: string;
  photoURL?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  user$: Observable<User | null>;
  userData$: Observable<UserData | null>;

  private readonly TEST_PREMIUM_KEY = 'test_premium_status';
  private testPremiumSubject = new BehaviorSubject<boolean>(
    localStorage.getItem(this.TEST_PREMIUM_KEY) === 'true'
  );

  constructor(
    public auth: Auth,
    private firestore: Firestore,
    private deviceService: DeviceService
  ) {
    this.user$ = user(this.auth);

    this.userData$ = combineLatest([
      this.user$,
      this.testPremiumSubject.asObservable(),
    ]).pipe(
      switchMap(([u, isTestPremium]) => {
        if (u) {
          const userDoc = doc(this.firestore, `users/${u.uid}`);
          return docData(userDoc).pipe(
            map((data) => {
              const userData = data as UserData;
              // Override with test status if true (or handle logic as needed)
              // Requirement: "Toggling ON should: Set user as premium"
              // Requirement: "Toggling OFF should: Revert back to non-premium behavior"
              // So if test premium is ON, force true. If OFF, use DB value?
              // Or does the toggle mean "Force ON" vs "Force OFF"?
              // "Toggling OFF should: Revert back to non-premium behavior" implies reverting to actual user state,
              // but usually "non-premium behavior" means free.
              // Let's assume the toggle overrides the DB value when ON.
              // Wait, if I toggle OFF, I should probably respect the DB value.
              // But if the DB value is FALSE, and I toggle ON, it becomes TRUE.
              // If I toggle OFF, it goes back to FALSE (DB value).
              // What if DB value is TRUE? Then toggling OFF should probably not force it to FALSE if they paid?
              // "PREMIUM TOGGLE (FOR TESTING ONLY)"
              // "Toggling ON should: Set user as premium"
              // "Toggling OFF should: Revert back to non-premium behavior"
              // This implies the toggle is a "Force Premium" switch.

              if (isTestPremium) {
                userData.isPremium = true;
              }
              return userData;
            })
          );
        } else {
          return of(null);
        }
      })
    );
  }

  async ensureAuth() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      await signInAnonymously(this.auth);
    }
  }

  async createUserProfile(user: User) {
    const deviceIdHash = await this.deviceService.getDeviceId().toPromise();
    const userRef = doc(this.firestore, 'users', user.uid);
    const now = new Date().toISOString();

    const userData: UserData = {
      uid: user.uid,
      deviceIdHash: deviceIdHash || 'unknown',
      isAnonymous: user.isAnonymous,
      isPremium: false, // Default to false
      platform: 'web', // You might want to detect this dynamically
      createdAt: now,
      lastActiveAt: now,
    };

    // Use setDoc with merge: true to avoid overwriting if exists
    await setDoc(userRef, userData, { merge: true });

    // Link device
    await this.deviceService.registerDevice(user.uid);
  }

  async updateLastActive() {
    const user = this.auth.currentUser;
    if (user) {
      const userRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userRef, {
        lastActiveAt: new Date().toISOString(),
      });
    }
  }

  async setPremiumStatus(isPremium: boolean) {
    const user = this.auth.currentUser;
    if (user) {
      const userRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userRef, { isPremium });
    }
  }

  // For testing purposes only
  toggleTestPremium(status: boolean) {
    localStorage.setItem(this.TEST_PREMIUM_KEY, String(status));
    this.testPremiumSubject.next(status);
  }

  async updateUserProfile(data: Partial<UserData>) {
    const user = this.auth.currentUser;
    if (user) {
      const userRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userRef, data);
    }
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }
}
