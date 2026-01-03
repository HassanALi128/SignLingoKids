import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  docData,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { UserService } from './user.service';

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

  constructor(private firestore: Firestore, private userService: UserService) {
    this.progress$ = this.userService.user$.pipe(
      switchMap((user) => {
        if (user) {
          const docRef = doc(this.firestore, `progress/${user.uid}`);
          return docData(docRef) as Observable<ProgressData>;
        }
        return of(null);
      })
    );
  }

  async initProgress() {
    const uid = this.userService.getCurrentUserId();
    if (!uid) return;

    const docRef = doc(this.firestore, `progress/${uid}`);
    // Initialize if not exists, but don't overwrite
    await setDoc(
      docRef,
      {
        learnedItemIds: [],
        activeCategoryIds: [],
        lastAccessed: Date.now(),
      },
      { merge: true }
    );
  }

  async markAsLearned(itemId: string, categoryId: string) {
    const uid = this.userService.getCurrentUserId();
    if (!uid) return;

    const docRef = doc(this.firestore, `progress/${uid}`);

    // We need to manage activeCategoryIds order manually if we want "recent" behavior
    // For simplicity with Firestore arrayUnion, we just add it.
    // If strict ordering is needed, we'd read, modify, and write back.

    await updateDoc(docRef, {
      learnedItemIds: arrayUnion(itemId),
      activeCategoryIds: arrayUnion(categoryId),
      lastAccessed: Date.now(),
    });
  }

  async unlearn(itemId: string) {
    const uid = this.userService.getCurrentUserId();
    if (!uid) return;

    const docRef = doc(this.firestore, `progress/${uid}`);
    await updateDoc(docRef, {
      learnedItemIds: arrayRemove(itemId),
      lastAccessed: Date.now(),
    });
  }
}
