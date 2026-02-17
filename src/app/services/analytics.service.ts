import { Injectable } from '@angular/core';
// import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Platform } from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private isHybrid = false;

  constructor(private platform: Platform, private router: Router) {
    this.isHybrid = this.platform.is('hybrid');
  }

  /**
   * Initialize Analytics and setup automatic screen tracking.
   */
  async init() {
    if (!this.isHybrid) return;

    try {
      // await FirebaseAnalytics.setEnabled({ enabled: true });
      console.log('Firebase Analytics initialized');

      // Setup automatic screen tracking
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: any) => {
          this.setScreenName(event.urlAfterRedirects);
        });
    } catch (error) {
      console.error('Error initializing Firebase Analytics:', error);
    }
  }

  /**
   * Log a custom event.
   * @param name The name of the event.
   * @param params Optional parameters for the event.
   */
  async logEvent(name: string, params?: any) {
    console.log(`[Analytics Event] ${name}`, params);
    if (!this.isHybrid) return;

    try {
      // await FirebaseAnalytics.logEvent({ name, params });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Set the current screen name.
   * @param screenName The name of the screen.
   */
  async setScreenName(screenName: string) {
    console.log(`[Analytics Screen] ${screenName}`);
    if (!this.isHybrid) return;

    try {
      // In @capacitor-firebase/analytics, setScreenName might be logEvent with screen_view
      // await FirebaseAnalytics.logEvent({
      //   name: 'screen_view',
      //   params: {
      //     firebase_screen: screenName,
      //     firebase_screen_class: 'AngularRouter',
      //   },
      // });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Set a custom user ID for analytics.
   * @param userId The unique identifier for the user.
   */
  async setUserId(userId: string) {
    if (!this.isHybrid) return;

    try {
      // await FirebaseAnalytics.setUserId({ userId });
    } catch (error) {
      console.error('Error setting Analytics user ID:', error);
    }
  }

  /**
   * Set a custom user property.
   * @param name The name of the property.
   * @param value The value of the property.
   */
  async setUserProperty(name: string, value: string) {
    if (!this.isHybrid) return;

    try {
      // await FirebaseAnalytics.setUserProperty({ key: name, value });
    } catch (error) {
      console.error('Error setting Analytics user property:', error);
    }
  }
}
