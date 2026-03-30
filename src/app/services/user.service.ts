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
  shareReplay,
} from 'rxjs';
import { DeviceService } from './device.service';
import { PurchasesService } from './purchases.service';
import { AlertService } from './alert.service';  // Added for debug alerts
import { StorageService } from './storage.service';
// import { CrashlyticsService } from './crashlytics.service';
import { AnalyticsService } from './analytics.service';
import { Platform } from '@ionic/angular';

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
  onboardingCompleted?: boolean;
  profileCompleted?: boolean;
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
    private deviceService: DeviceService,
    private purchasesService: PurchasesService,
    private alertService: AlertService,
    private storageService: StorageService,
    private platform: Platform,
    // private crashlyticsService: CrashlyticsService,
    private analyticsService: AnalyticsService
  ) {
    console.log('UserService: Initializing...');
    this.user$ = user(this.auth);

    this.userData$ = combineLatest([
      this.user$,
      this.testPremiumSubject.asObservable(),
    ]).pipe(
      switchMap(([u, isTestPremium]) => {
        if (u) {
          console.log('UserService: User authenticated', u.uid);
          // this.crashlyticsService.setUserId(u.uid);
          this.analyticsService.setUserId(u.uid);
          const userDoc = doc(this.firestore, `users/${u.uid}`);
          return docData(userDoc).pipe(
            map((data) => {
              const userData = data as UserData;
              // Override with test status if true
              if (isTestPremium && userData) {
                userData.isPremium = true;
              }
              return userData;
            })
          );
        } else {
          return of(null);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  async ensureAuth() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.log('UserService: No current user, signing in anonymously...');
      try {
        await signInAnonymously(this.auth);
        console.log('UserService: Anonymous sign-in successful');
      } catch (error) {
        console.error('UserService: Anonymous sign-in failed', error);
        this.alertService.error(
          'Auth Error',
          'Failed to sign in anonymously. Data may not save. ' + error
        );
      }
    } else {
      console.log('UserService: Already authenticated as', currentUser.uid);
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
      platform: this.platform.is('android')
        ? 'android'
        : this.platform.is('ios')
        ? 'ios'
        : 'web', // You might want to detect this dynamically
      createdAt: now,
      lastActiveAt: now,
    };

    // Use setDoc with merge: true to avoid overwriting if exists
    console.log('UserService: Creating/Updating user profile for', user.uid);
    try {
      await setDoc(userRef, userData, { merge: true });
      console.log('UserService: User profile created/updated successfully');
    } catch (e) {
      console.error('UserService: Error creating user profile', e);
      this.alertService.error(
        'Save Error',
        'Failed to create user profile: ' + e
      );
    }

    // Link device
    await this.deviceService.registerDevice(user.uid);
  }

  async updateLastActive() {
    const user = this.auth.currentUser;
    if (user) {
      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(
        userRef,
        {
          lastActiveAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((e) =>
        console.error('UserService: Error updating lastActive', e)
      );
    }
  }

  async setPremiumStatus(isPremium: boolean) {
    const user = this.auth.currentUser;
    if (user) {
      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userRef, { isPremium }, { merge: true });
      this.analyticsService.setUserProperty('is_premium', isPremium.toString());
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
      // Use setDoc with merge: true to ensure document is created if it doesn't exist
      // This fixes "No document to update" error on fresh installs
      console.log('UserService: Updating user profile', data);
      await setDoc(userRef, data, { merge: true })
        .then(() => {
          console.log('UserService: Profile updated successfully');
        })
        .catch((e) => {
          console.error('UserService: Error updating profile', e);
          this.alertService.error(
            'Update Error',
            'Failed to update profile: ' + e
          );
        });
    }
  }

  async completeOnboarding() {
    await this.updateUserProfile({ onboardingCompleted: true });
  }

  async completeProfile() {
    await this.updateUserProfile({ profileCompleted: true });
  }

  /**
   * Migrate user data from old UID to new UID
   */
  private async migrateUserData(oldUid: string, newUid: string) {
    try {
      console.log(`Migrating data from ${oldUid} to ${newUid}`);
      const oldUserRef = doc(this.firestore, 'users', oldUid);
      const oldUserSnap = await (
        await import('@angular/fire/firestore')
      ).getDoc(oldUserRef);

      if (oldUserSnap.exists()) {
        const oldData = oldUserSnap.data() as UserData;

        // Prepare data to copy
        // We don't copy UID, deviceIdHash (maybe), or createdAt of the new user
        // But we want to keep the profile info and status
        const dataToCopy: Partial<UserData> = {
          displayName: oldData.displayName,
          photoURL: oldData.photoURL,
          isPremium: oldData.isPremium,
          onboardingCompleted: oldData.onboardingCompleted,
          profileCompleted: oldData.profileCompleted,
          // We can also copy other fields if needed
        };

        // Remove undefined values
        Object.keys(dataToCopy).forEach(
          (key) =>
            (dataToCopy as any)[key] === undefined &&
            delete (dataToCopy as any)[key]
        );

        const newUserRef = doc(this.firestore, 'users', newUid);
        await setDoc(newUserRef, dataToCopy, { merge: true });
        console.log('Migration successful');
      }
    } catch (error) {
      console.error('Error migrating user data:', error);
    }
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  /**
   * Initialize user from device.
   *
   * Standard approach: read local state first (instant, no network),
   * navigate immediately, then sync with Firebase in the background.
   * This eliminates the 20-second timeout that happened when Firebase
   * was slow or offline.
   */
  async initializeUserFromDevice(): Promise<string> {
    try {
      // ── Step 1: Fast local check ─────────────────────────────────────
      // Capacitor Preferences is synchronous-ish and never needs network.
      const hasSeenOnboarding = await this.storageService.getHasSeenOnboarding();
      const hasProfile = !!localStorage.getItem('user_profile_completed');

      if (!hasSeenOnboarding) {
        // First launch — kick off auth+profile creation in background
        this.bootstrapFirebaseInBackground();
        return 'onboarding';
      }

      if (!hasProfile) {
        this.bootstrapFirebaseInBackground();
        return 'profile-setup';
      }

      // ── Step 2: Background Firebase sync (non-blocking) ──────────────
      // Auth + last-active update happens after navigation, not before.
      this.bootstrapFirebaseInBackground();

      return 'home';
    } catch (error) {
      console.error('Error initializing user from device:', error);
      return 'onboarding';
    }
  }

  /**
   * Runs Firebase authentication and Firestore sync in the background
   * after the app has already navigated. Never blocks the UI.
   */
  private async bootstrapFirebaseInBackground(): Promise<void> {
    try {
      // Ensure anonymous auth (quick if already authenticated)
      await Promise.race([
        this.ensureAuth(),
        new Promise<void>((resolve) => setTimeout(resolve, 8000)), // 8s max
      ]);

      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      // Non-blocking: register device + update lastActive
      this.deviceService.registerDevice(currentUser.uid).catch(() => {});
      this.updateLastActive().catch(() => {});
    } catch (err) {
      console.warn('Background Firebase sync failed (non-critical):', err);
    }
  }

  /**
   * Check if device exists in Firebase devices collection
   */
  private async checkDeviceExistsInFirebase(
    deviceIdHash: string
  ): Promise<boolean> {
    try {
      const deviceRef = doc(this.firestore, 'devices', deviceIdHash);
      const deviceSnap = await (
        await import('@angular/fire/firestore')
      ).getDoc(deviceRef);
      return deviceSnap.exists();
    } catch (error) {
      console.error('Error checking device existence:', error);
      return false;
    }
  }

  /**
   * Load user data by device hash
   * This syncs the device with the user account
   */
  private async loadUserDataByDevice(
    deviceIdHash: string,
    currentUid: string
  ): Promise<void> {
    try {
      // Update device record with current session
      await this.deviceService.registerDevice(currentUid);

      // The userData$ observable will automatically load the user data
      // from Firestore based on the authenticated user's UID

      // We just need to ensure the lastActiveAt is updated
      await this.updateLastActive();
    } catch (error) {
      console.error('Error loading user data by device:', error);
    }
  }

  /**
   * Sync premium status from RevenueCat to Firestore
   * Called after restore purchases or successful purchase
   */
  async syncPremiumStatusFromRevenueCat(): Promise<void> {
    try {
      const isPremium = this.purchasesService.hasProEntitlement();
      await this.setPremiumStatus(isPremium);
      console.log('Premium status synced from RevenueCat:', isPremium);
    } catch (error) {
      console.error('Error syncing premium status from RevenueCat:', error);
    }
  }
}
