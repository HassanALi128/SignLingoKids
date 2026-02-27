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
  serverTimestamp,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, of, switchMap } from 'rxjs';
import { DeviceService } from './device.service';

// ─── Existing Device-Based Progress (unchanged) ───────────────────────────────

export interface ProgressData {
  learnedItemIds: string[];
  activeCategoryIds: string[];
  lastAccessed: number;
}

// ─── New User-Based Progress & Quiz Types ─────────────────────────────────────

export interface UserSignProgress {
  /** Array of ASL sign IDs the user has marked as learned. */
  learnedSignIds: string[];
  lastUpdated: number;
}

export interface QuizScore {
  quizId: string;
  score: number;
  completedAt: ReturnType<typeof serverTimestamp> | number;
}

/**
 * ProgressService
 *
 * Handles two distinct tracking models:
 *
 * 1. **Device-based** (`progress/{deviceId}`) — pre-existing behaviour for
 *    anonymous / guest users. All `markAsLearned`, `unlearn`, `resetProgress`
 *    methods here remain unchanged.
 *
 * 2. **User-based** (`users/{userId}/progress/signs` and
 *    `users/{userId}/quizScores/{quizId}`) — new authenticated-user tracking.
 *    Writes use standard Firestore `setDoc` with `merge: true` so Firestore's
 *    **built-in offline mutation queue** stores the write locally and syncs it
 *    automatically when connectivity is restored.
 *
 * **Optimistic UI**: `learnedSignIds$` is updated synchronously in-memory
 * before the Firestore call resolves, so the UI reflects the new state
 * immediately even if the device is offline.
 */
@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  // ─── Device-Based (existing) ───────────────────────────────────────────────

  progress$: Observable<ProgressData | null>;

  // ─── User-Based (new) ─────────────────────────────────────────────────────

  /**
   * Optimistic local cache of learned sign IDs for the currently logged-in
   * user. Updated immediately on `markSignAsLearned()` — no round-trip needed.
   * Components can subscribe to this for instant UI feedback.
   */
  readonly learnedSignIds$ = new BehaviorSubject<string[]>([]);

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

  // ──────────────────────────────────────────────────────────────────────────
  // TASK 4: User-Based Sign & Quiz Tracking
  // All writes go straight to Firestore with merge:true.
  // No "if online" guard — Firestore's offline mutation queue handles it.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Mark an ASL sign as learned for a specific user.
   *
   * **Optimistic UI**: `learnedSignIds$` is updated *before* the Firestore
   * write so the checkmark appears instantly regardless of connectivity.
   * If the write fails (very rare — Firestore retries indefinitely), the
   * BehaviorSubject can be corrected by re-fetching from Firestore.
   *
   * @param userId  Firebase Auth UID of the signed-in user.
   * @param signId  Unique identifier of the ASL sign lesson.
   */
  async markSignAsLearned(userId: string, signId: string): Promise<void> {
    // 1. Optimistic UI update — happens synchronously, zero network latency.
    const current = this.learnedSignIds$.getValue();
    if (!current.includes(signId)) {
      this.learnedSignIds$.next([...current, signId]);
    }

    // 2. Firestore write — queued offline if no connectivity, synced later.
    const progressRef = doc(this.firestore, `users/${userId}/progress/signs`);
    await setDoc(
      progressRef,
      {
        learnedSignIds: arrayUnion(signId),
        lastUpdated: Date.now(),
      },
      { merge: true }
    );
  }

  /**
   * Save a quiz score for a specific user.
   *
   * Uses `setDoc` with `merge: true` so re-taking a quiz properly overwrites
   * the previous score rather than creating a second document.
   * Firestore queues this offline if there is no connectivity.
   *
   * @param userId   Firebase Auth UID of the signed-in user.
   * @param quizId   Unique identifier of the quiz.
   * @param score    Numeric score (e.g. 0–100 or correct answer count).
   */
  async saveQuizScore(
    userId: string,
    quizId: string,
    score: number
  ): Promise<void> {
    const scoreRef = doc(
      this.firestore,
      `users/${userId}/quizScores/${quizId}`
    );
    await setDoc(
      scoreRef,
      {
        quizId,
        score,
        completedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Seed `learnedSignIds$` from Firestore on app start or after login.
   * Called once after the user authenticates so the optimistic BehaviorSubject
   * starts with accurate persisted data.
   *
   * @param userId Firebase Auth UID.
   */
  async loadUserProgress(userId: string): Promise<void> {
    const progressRef = doc(this.firestore, `users/${userId}/progress/signs`);
    const snap = await getDoc(progressRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<UserSignProgress>;
      this.learnedSignIds$.next(data.learnedSignIds ?? []);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Existing Device-Based Methods (unchanged)
  // ──────────────────────────────────────────────────────────────────────────

  async initProgress() {
    const deviceId = await this.deviceService.getDeviceId().toPromise();
    if (!deviceId) return;

    const docRef = doc(this.firestore, `progress/${deviceId}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
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
