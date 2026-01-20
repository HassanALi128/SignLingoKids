import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
} from '@angular/fire/firestore';
import { UserService } from './user.service';
import { DeviceService } from './device.service';

export interface QuizAttemptDetail {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface QuizAttempt {
  score: number;
  total: number;
  percentage: number;
  isPremiumQuiz: boolean;
  createdAt: string;
  details?: QuizAttemptDetail[];
}

@Injectable({
  providedIn: 'root',
})
export class QuizAttemptService {
  constructor(
    private firestore: Firestore,
    private userService: UserService,
    private deviceService: DeviceService
  ) {}

  async recordAttempt(
    score: number,
    total: number,
    isPremiumQuiz: boolean,
    details?: QuizAttemptDetail[],
    isUnlockedByLearning: boolean = false
  ): Promise<void> {
    const deviceId = await this.deviceService.getDeviceId().toPromise();
    if (!deviceId) return;

    // Check limits for free users
    if (!isPremiumQuiz) {
      // Logic for free quiz limits if any specific per-user limit exists
      // The device limit is checked in DeviceService
      // If unlocked by learning, we ignore the limit
      const allowed = await this.deviceService.incrementQuizAttempt(
        isUnlockedByLearning
      );
      if (!allowed) {
        throw new Error('Free quiz limit reached for this device.');
      }
    }

    const attempt: QuizAttempt = {
      score,
      total,
      percentage: Math.round((score / total) * 100),
      isPremiumQuiz,
      createdAt: new Date().toISOString(),
      details,
    };

    const attemptsRef = collection(
      this.firestore,
      `quizAttempts/${deviceId}/attempts`
    );
    await addDoc(attemptsRef, attempt);
  }

  async getRecentAttempts(limitCount: number = 5): Promise<QuizAttempt[]> {
    const deviceId = await this.deviceService.getDeviceId().toPromise();
    if (!deviceId) return [];

    const attemptsRef = collection(
      this.firestore,
      `quizAttempts/${deviceId}/attempts`
    );
    const q = query(
      attemptsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: any) => d.data() as QuizAttempt);
  }

  async resetQuizAttempts() {
    const deviceId = await this.deviceService.getDeviceId().toPromise();
    if (!deviceId) return;

    const attemptsRef = collection(
      this.firestore,
      `quizAttempts/${deviceId}/attempts`
    );
    const snapshot = await getDocs(attemptsRef);
    const deletePromises = snapshot.docs.map((d: any) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  }
}
