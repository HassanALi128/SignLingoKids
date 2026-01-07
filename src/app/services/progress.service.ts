import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  docData,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { DeviceService } from './device.service';

export interface ProgressData {
  learnedItemIds: string[];
  activeCategoryIds: string[];
  lastAccessed: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  progress$: Observable<ProgressData | null>;

  constructor(
    private firestore: Firestore,
    private deviceService: DeviceService
  ) {
    this.progress$ = this.deviceService.getDeviceId().pipe(
      switchMap((deviceId) => {
        if (deviceId) {
          const docRef = doc(this.firestore, `progress/${deviceId}`);
          return docData(docRef) as Observable<ProgressData>;
        }
        return of(null);
      })
    );
  }

  async initProgress() {
    const deviceId = await this.deviceService.getDeviceId().toPromise();
    if (!deviceId) return;

    const docRef = doc(this.firestore, `progress/${deviceId}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Initialize ONLY if not exists
      await setDoc(docRef, {
        learnedItemIds: [],
        activeCategoryIds: [],
        lastAccessed: Date.now(),
      });
    }
  }

  async markAsLearned(itemId: string, categoryId: string) {
    const deviceId = await this.deviceService.getDeviceId().toPromise();
    if (!deviceId) return;

    const docRef = doc(this.firestore, `progress/${deviceId}`);

    // We need to manage activeCategoryIds order manually if we want "recent" behavior
    // For simplicity with Firestore arrayUnion, we just add it.
    // If strict ordering is needed, we'd read, modify, and write back.

    await setDoc(
      docRef,
      {
        learnedItemIds: arrayUnion(itemId),
        activeCategoryIds: arrayUnion(categoryId),
        lastAccessed: Date.now(),
      },
      { merge: true }
    );
  }

  async unlearn(itemId: string) {
    const deviceId = await this.deviceService.getDeviceId().toPromise();
    if (!deviceId) return;

    const docRef = doc(this.firestore, `progress/${deviceId}`);
    await setDoc(
      docRef,
      {
        learnedItemIds: arrayRemove(itemId),
        lastAccessed: Date.now(),
      },
      { merge: true }
    );
  }

  async resetProgress() {
    const deviceId = await this.deviceService.getDeviceId().toPromise();
    if (!deviceId) return;

    const docRef = doc(this.firestore, `progress/${deviceId}`);
    await setDoc(docRef, {
      learnedItemIds: [],
      activeCategoryIds: [],
      lastAccessed: Date.now(),
    });
  }
}
