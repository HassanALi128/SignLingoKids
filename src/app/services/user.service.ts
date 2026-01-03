import { Injectable } from '@angular/core';
import { Auth, signInAnonymously, user, User } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  updateDoc,
  docData,
} from '@angular/fire/firestore';
import { Observable, of, switchMap, tap } from 'rxjs';
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

  constructor(
    public auth: Auth,
    private firestore: Firestore,
    private deviceService: DeviceService
  ) {
    this.user$ = user(this.auth);

    this.userData$ = this.user$.pipe(
      switchMap((u) => {
        if (u) {
          const userDoc = doc(this.firestore, `users/${u.uid}`);
          return docData(userDoc) as Observable<UserData>;
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
