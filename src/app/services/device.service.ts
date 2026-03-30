import { Injectable } from '@angular/core';
import { Device } from '@capacitor/device';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
} from '@angular/fire/firestore';
import { from, firstValueFrom, Observable, of } from 'rxjs';
import { map, switchMap, tap, shareReplay } from 'rxjs/operators';

export interface DeviceData {
  deviceIdHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  freeQuizAttempts: number;
  freeLearningCount: number;
  linkedUids: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private deviceIdHash$: Observable<string>;
  private readonly MAX_FREE_QUIZZES = 3; // Example limit
  private readonly MAX_FREE_LEARNING = 10; // Example limit

  constructor(private firestore: Firestore) {
    this.deviceIdHash$ = from(this.getDeviceIdHash()).pipe(shareReplay(1));
  }

  private async getDeviceIdHash(): Promise<string> {
    const info = await Device.getId();
    return this.hashString(info.identifier);
  }

  private async hashString(input: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  getDeviceId(): Observable<string> {
    return this.deviceIdHash$;
  }

  private getCachedDeviceId(): Promise<string> {
    return firstValueFrom(this.deviceIdHash$);
  }

  async registerDevice(uid?: string): Promise<void> {
    const deviceIdHash = await this.getCachedDeviceId();
    const deviceRef = doc(this.firestore, 'devices', deviceIdHash);
    const deviceSnap = await getDoc(deviceRef);
    const now = new Date().toISOString();

    if (!deviceSnap.exists()) {
      const newDevice: DeviceData = {
        deviceIdHash,
        firstSeenAt: now,
        lastSeenAt: now,
        freeQuizAttempts: 0,
        freeLearningCount: 0,
        linkedUids: uid ? [uid] : [],
      };
      await setDoc(deviceRef, newDevice);
    } else {
      const updates: any = { lastSeenAt: now };
      if (uid) {
        updates.linkedUids = arrayUnion(uid);
      }
      await updateDoc(deviceRef, updates);
    }
  }

  async incrementQuizAttempt(ignoreLimit: boolean = false): Promise<boolean> {
    const deviceIdHash = await this.getCachedDeviceId();
    const deviceRef = doc(this.firestore, 'devices', deviceIdHash);
    const deviceSnap = await getDoc(deviceRef);

    if (!deviceSnap.exists()) return false;

    const data = deviceSnap.data() as DeviceData;
    if (!ignoreLimit && data.freeQuizAttempts >= this.MAX_FREE_QUIZZES) {
      return false; // Limit reached
    }

    await updateDoc(deviceRef, {
      freeQuizAttempts: increment(1),
    });
    return true;
  }

  async checkQuizLimit(): Promise<boolean> {
    const deviceIdHash = await this.getCachedDeviceId();
    const deviceRef = doc(this.firestore, 'devices', deviceIdHash);
    const deviceSnap = await getDoc(deviceRef);

    if (!deviceSnap.exists()) return true; // Should ideally exist

    const data = deviceSnap.data() as DeviceData;
    return data.freeQuizAttempts < this.MAX_FREE_QUIZZES;
  }
  async resetDeviceProgress() {
    const deviceIdHash = await this.getCachedDeviceId();
    const deviceRef = doc(this.firestore, 'devices', deviceIdHash);
    await updateDoc(deviceRef, {
      freeQuizAttempts: 0,
      freeLearningCount: 0,
    });
  }
}
