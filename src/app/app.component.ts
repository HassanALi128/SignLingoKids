import { Component, OnInit } from '@angular/core';
import {
  IonApp,
  IonRouterOutlet,
  Platform,
  ModalController,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { AlertService } from './services/alert.service';
import { MonetizationService } from './services/monetization.service';
import { UserService } from './services/user.service';
import { HardwareBackBtnService } from './services/hardware-back-btn.service';
// import { CrashlyticsService } from './services/crashlytics.service';
import { AnalyticsService } from './services/analytics.service';
import { InitLoaderComponent } from './components/init-loader/init-loader.component';
import { CommonModule } from '@angular/common';
import { PaywallModalComponent } from './components/paywall-modal/paywall-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, InitLoaderComponent, CommonModule],
})
export class AppComponent implements OnInit {
  showInitLoader = true;
  initStatus = 'Starting up...';

  constructor(
    private platform: Platform,
    private router: Router,
    private alertService: AlertService,
    private monetizationService: MonetizationService,
    private userService: UserService,
    private modalController: ModalController,
    // private crashlyticsService: CrashlyticsService,
    private analyticsService: AnalyticsService,
    private hardwareBackBtnService: HardwareBackBtnService
  ) {}

  ngOnInit() {
    this.initializeApp();
  }

  async initializeApp() {
    try {
      // Wrap entire initialization in a timeout to prevent indefinite hanging
      await Promise.race([
        this.performInitialization(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error('App initialization timed out after 10 seconds')
              ),
            10000
          )
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

  private async performInitialization() {
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
    // This will call purchasesService.identifyUser() which requires RevenueCat to be initialized
    const navigationPath = await this.userService.initializeUserFromDevice();

    // Update status
    this.initStatus = 'Loading your data...';

    // Give a brief moment for the status to show
    await this.delay(500);

    // Initialize Hardware Back Button Service
    this.hardwareBackBtnService.init();

    // Update status
    this.initStatus = 'Almost ready!';

    // Give a brief moment before hiding loader
    await this.delay(300);

    // Hide the init loader
    this.showInitLoader = false;

    // Hide native splash screen
    SplashScreen.hide();

    // Navigate to appropriate page
    this.navigateBasedOnPath(navigationPath);

    // After navigation, check premium status and show paywall if needed
    // We delay slightly to ensure the root page is loaded
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
    // Check if user is premium
    if (!this.monetizationService.isPro) {
      console.log('App: User is not premium, showing paywall...');
      const modal = await this.modalController.create({
        component: PaywallModalComponent,
        backdropDismiss: true, // Allow dismissal
        componentProps: {
          // any props
        },
      });
      await modal.present();
    } else {
      console.log('App: User is premium, skipping paywall.');
    }
  }
}
