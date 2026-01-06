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
    details?: QuizAttemptDetail[]
  ): Promise<void> {
    const uid = this.userService.getCurrentUserId();
    if (!uid) return;

    // Check limits for free users
    if (!isPremiumQuiz) {
      // Logic for free quiz limits if any specific per-user limit exists
      // The device limit is checked in DeviceService
      const allowed = await this.deviceService.incrementQuizAttempt();
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
      `quizAttempts/${uid}/attempts`
    );
    await addDoc(attemptsRef, attempt);
  }

  async getRecentAttempts(limitCount: number = 5): Promise<QuizAttempt[]> {
    const uid = this.userService.getCurrentUserId();
    if (!uid) return [];

    const attemptsRef = collection(
      this.firestore,
      `quizAttempts/${uid}/attempts`
    );
    const q = query(
      attemptsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as QuizAttempt);
  }
}
