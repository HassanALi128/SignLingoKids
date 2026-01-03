import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { UserService } from './user.service';

export interface AnalyticsEvent {
  eventName: string;
  payload: any;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  constructor(private firestore: Firestore, private userService: UserService) {}

  async logEvent(eventName: string, payload: any = {}) {
    const uid = this.userService.getCurrentUserId();
    // We can log events even if user is not fully authenticated yet,
    // but typically we want to link to a uid.
    // If no uid, we might want to skip or log to a general collection.
    if (!uid) return;

    const event: AnalyticsEvent = {
      eventName,
      payload,
      createdAt: new Date().toISOString(),
    };

    const eventsRef = collection(
      this.firestore,
      `analyticsEvents/${uid}/events`
    );
    try {
      await addDoc(eventsRef, event);
    } catch (e) {
      console.error('Failed to log analytics event', e);
    }
  }
}
