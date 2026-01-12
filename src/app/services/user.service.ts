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
import { PurchasesService } from './purchases.service';

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
    private purchasesService: PurchasesService
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
      await setDoc(
        userRef,
        {
          lastActiveAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  }

  async setPremiumStatus(isPremium: boolean) {
    const user = this.auth.currentUser;
    if (user) {
      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userRef, { isPremium }, { merge: true });
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
      await setDoc(userRef, data, { merge: true });
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
   * Initialize user from device
   * This is the main entry point for app initialization
   * Returns navigation path: 'onboarding', 'profile-setup', or 'home'
   */
  async initializeUserFromDevice(): Promise<string> {
    try {
      // Step 1: Get device ID
      const deviceIdHash = await this.deviceService.getDeviceId().toPromise();

      if (!deviceIdHash) {
        throw new Error('Failed to get device ID');
      }

      // Step 2: Check if device exists in Firebase
      // We need to get the actual document data to check linkedUids
      const deviceRef = doc(this.firestore, 'devices', deviceIdHash);
      const deviceSnap = await (
        await import('@angular/fire/firestore')
      ).getDoc(deviceRef);

      const deviceExists = deviceSnap.exists();
      let oldUid: string | null = null;

      if (deviceExists) {
        const deviceData = deviceSnap.data();
        const linkedUids = deviceData?.['linkedUids'] || [];
        if (linkedUids.length > 0) {
          oldUid = linkedUids[linkedUids.length - 1];
        }
      }

      // Step 3: Ensure Firebase auth
      await this.ensureAuth();

      // Step 4: Create or update user profile
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Failed to authenticate user');
      }

      if (!deviceExists) {
        // New device - create profile and register device
        await this.createUserProfile(currentUser);

        // New user should go through onboarding
        return 'onboarding';
      } else {
        // Existing device

        // Check if we need to migrate data
        if (oldUid && oldUid !== currentUser.uid) {
          await this.migrateUserData(oldUid, currentUser.uid);
        }

        // Link current user to device
        await this.loadUserDataByDevice(deviceIdHash, currentUser.uid);

        // Check user status from FIRESTORE, not localStorage
        const userRef = doc(this.firestore, 'users', currentUser.uid);
        const userSnap = await (
          await import('@angular/fire/firestore')
        ).getDoc(userRef);

        let onboardingCompleted = false;
        let profileCompleted = false;

        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData;
          onboardingCompleted = !!userData.onboardingCompleted;
          profileCompleted = !!userData.profileCompleted;
        }

        if (!onboardingCompleted) {
          return 'onboarding';
        } else if (!profileCompleted) {
          return 'profile-setup';
        } else {
          return 'home';
        }
      }
    } catch (error) {
      console.error('Error initializing user from device:', error);
      // On error, default to onboarding to ensure user can still use the app
      return 'onboarding';
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
