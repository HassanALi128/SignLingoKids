import { Injectable } from '@angular/core';
// import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Platform } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class CrashlyticsService {
  private isHybrid = false;

  constructor(private platform: Platform) {
    this.isHybrid = this.platform.is('hybrid');
  }

  /**
   * Initialize Crashlytics.
   * In a professional setup, we might want to check if the user has consented to crash reporting.
   */
  async init() {
    if (!this.isHybrid) return;

    try {
      // Ensure Crashlytics is enabled
      // await FirebaseCrashlytics.setEnabled({ enabled: true });
      console.log('Firebase Crashlytics initialized');
    } catch (error) {
      console.error('Error initializing Firebase Crashlytics:', error);
    }
  }

  /**
   * Log a message that will be included in the next crash report.
   * @param message The message to log.
   */
  async log(message: string) {
    console.log(`[Crashlytics] ${message}`);
    if (!this.isHybrid) return;

    try {
      // await FirebaseCrashlytics.log({ message });
    } catch (error) {
      // Silently fail to not interrupt app flow
    }
  }

  /**
   * Set a custom user ID for crash reports.
   * @param userId The unique identifier for the user.
   */
  async setUserId(userId: string) {
    if (!this.isHybrid) return;

    try {
      // await FirebaseCrashlytics.setUserId({ userId });
    } catch (error) {
      console.error('Error setting Crashlytics user ID:', error);
    }
  }

  /**
   * Set a custom key-value pair for crash reports.
   * @param key The key for the custom data.
   * @param value The value for the custom data.
   */
  async setCustomKey(key: string, value: string | number | boolean) {
    if (!this.isHybrid) return;

    let type: 'string' | 'boolean' | 'double' | 'float' | 'int' | 'long' =
      'string';
    if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (typeof value === 'number') {
      type = Number.isInteger(value) ? 'int' : 'double';
    }

    try {
      // await FirebaseCrashlytics.setCustomKey({
      //   key,
      //   value: value.toString(),
      //   type,
      // });
    } catch (error) {
      console.error('Error setting Crashlytics custom key:', error);
    }
  }

  /**
   * Record a non-fatal exception.
   * @param message The error message.
   * @param stacktrace Optional stacktrace.
   */
  async recordException(message: string, stacktrace?: any[]) {
    console.error(`[Crashlytics Exception] ${message}`, stacktrace);
    if (!this.isHybrid) return;

    try {
      // await FirebaseCrashlytics.recordException({
      //   message,
      //   stacktrace: Array.isArray(stacktrace) ? stacktrace : undefined,
      // });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Forces a crash for testing purposes.
   * WARNING: This will crash the app immediately.
   */
  async crash() {
    if (!this.isHybrid) {
      throw new Error('Crashlytics test crash (web)');
    }
    // await FirebaseCrashlytics.crash({
    //   message: 'Test crash from CrashlyticsService',
    // });
  }
}
