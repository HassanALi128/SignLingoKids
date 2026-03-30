import { Component, OnInit } from '@angular/core';
import {
  IonApp,
  IonRouterOutlet,
  Platform,
  ModalController,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { AlertService } from './services/alert.service';
import { MonetizationService } from './services/monetization.service';
import { UserService } from './services/user.service';
import { HardwareBackBtnService } from './services/hardware-back-btn.service';
// import { CrashlyticsService } from './services/crashlytics.service';
import { AnalyticsService } from './services/analytics.service';
import { InitLoaderComponent } from './components/init-loader/init-loader.component';
import { CommonModule, AsyncPipe } from '@angular/common';
import { PaywallModalComponent } from './components/paywall-modal/paywall-modal.component';
import { NetworkService } from './services/network.service';
import { StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    IonApp,
    IonRouterOutlet,
    InitLoaderComponent,
    CommonModule,
    AsyncPipe,
  ],
})
export class AppComponent implements OnInit {
  showInitLoader = true;
  initStatus = 'Starting up...';

  /** Exposed to template for the offline banner (used with async pipe). */
  readonly isOnline$ = this.networkService.isOnline$;

  /** Only show paywall once every 24 hours to avoid annoying daily users */
  private readonly PAYWALL_SHOWN_KEY = 'last_paywall_shown_ts';
  private readonly PAYWALL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private platform: Platform,
    private router: Router,
    private alertService: AlertService,
    private monetizationService: MonetizationService,
    private userService: UserService,
    private modalController: ModalController,
    // private crashlyticsService: CrashlyticsService,
    private analyticsService: AnalyticsService,
    private hardwareBackBtnService: HardwareBackBtnService,
    readonly networkService: NetworkService,
    private storageService: StorageService
  ) {}

  ngOnInit() {
    this.initializeApp();
  }

  async initializeApp() {
    // Flag so the background continuation knows it should NOT navigate if the
    // timeout already fired and the error handler took over.
    let aborted = false;

    try {
      // On cold start, the iOS Networking process can take 9-12s to spin up.
      // The inner timeout (12s) ensures Firebase network failures fail fast
      // within the outer 20s budget, giving the error handler time to recover.
      await Promise.race([
        this.performInitialization(() => aborted),
        new Promise((_, reject) =>
          setTimeout(() => {
            aborted = true;
            reject(new Error('App initialization timed out after 20 seconds'));
          }, 20000)
        ),
      ]);
    } catch (error) {
      console.error('Error during app initialization:', error);

      // Even on error, hide loaders and navigate to onboarding
      this.showInitLoader = false;
      SplashScreen.hide();
      this.router.navigateByUrl('/onboarding');
    }
  }

  private async performInitialization(isAborted: () => boolean = () => false) {
    // Wait for platform to be ready
    await this.platform.ready();

    // Lock screen orientation to portrait
    if (this.platform.is('hybrid')) {
      try {
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } catch (err) {
        console.warn('Could not lock screen orientation:', err);
      }
    }

    // Initialize Crashlytics
    // await this.crashlyticsService.init();

    // Initialize Analytics
    await this.analyticsService.init();

    // Update status
    this.initStatus = 'Initializing...';

    // Initialize RevenueCat & AdMob in background (non-blocking)
    this.monetizationService.init().catch((err) => {
      console.warn('Background monetization init failed:', err);
    });

    // Update status
    this.initStatus = 'Checking your device...';

    // Initialize user from device (this handles Firebase auth and device check)
    const navigationPath = await this.userService.initializeUserFromDevice();

    // If the timeout already fired, do not navigate — the error handler already did.
    if (isAborted()) {
      console.warn(
        'performInitialization: timeout already fired, aborting navigation.'
      );
      return;
    }

    // Initialize Hardware Back Button Service
    this.hardwareBackBtnService.init();

    // Hide the init loader
    this.showInitLoader = false;

    // Hide native splash screen
    SplashScreen.hide();

    // Navigate to appropriate page
    this.navigateBasedOnPath(navigationPath);

    // After navigation, check premium status and show paywall if needed
    setTimeout(() => {
      this.checkPremiumAndShowPaywall();
    }, 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private navigateBasedOnPath(path: string) {
    if (path === 'onboarding') {
      this.router.navigateByUrl('/onboarding');
    } else if (path === 'profile-setup') {
      this.router.navigateByUrl('/profile-setup');
    } else {
      this.router.navigateByUrl('/tabs/home');
    }
  }

  private async checkPremiumAndShowPaywall() {
    if (!this.monetizationService.isPro) {
      // Throttle: only show once per 24h so daily users aren't battered with the paywall.
      // Uses StorageService (Capacitor Preferences) instead of localStorage so it
      // survives WebView resets and is native-backed on iOS / Android.
      const lastShown = await this.storageService.getLastPaywallShown();
      const now = Date.now();
      if (now - lastShown < this.PAYWALL_INTERVAL_MS) {
        console.log('App: Paywall skipped (shown within last 24h)');
        return;
      }
      await this.storageService.setLastPaywallShown(now);

      console.log('App: User is not premium, showing paywall...');
      const modal = await this.modalController.create({
        component: PaywallModalComponent,
        backdropDismiss: true,
        componentProps: {},
      });
      await modal.present();
    } else {
      console.log('App: User is premium, skipping paywall.');
    }
  }
}
