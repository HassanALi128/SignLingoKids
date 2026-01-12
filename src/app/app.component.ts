import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { AlertService } from './services/alert.service';
import { MonetizationService } from './services/monetization.service';
import { UserService } from './services/user.service';
import { InitLoaderComponent } from './components/init-loader/init-loader.component';
import { CommonModule } from '@angular/common';

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
    private userService: UserService
  ) {}

  ngOnInit() {
    this.initializeApp();
  }

  async initializeApp() {
    try {
      // Wait for platform to be ready
      await this.platform.ready();

      // Update status
      this.initStatus = 'Initializing...';

      // IMPORTANT: Initialize RevenueCat FIRST before any user operations
      // This ensures the SDK is configured before identifyUser() is called
      await this.monetizationService.init();

      // Update status
      this.initStatus = 'Checking your device...';

      // Initialize user from device (this handles Firebase auth and device check)
      // This will call purchasesService.identifyUser() which requires RevenueCat to be initialized
      const navigationPath = await this.userService.initializeUserFromDevice();

      // Update status
      this.initStatus = 'Loading your data...';

      // Give a brief moment for the status to show
      await this.delay(500);

      // Setup back button handler
      this.handleBackButton();

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
    } catch (error) {
      console.error('Error during app initialization:', error);

      // Even on error, hide loaders and navigate to onboarding
      this.showInitLoader = false;
      SplashScreen.hide();
      this.router.navigateByUrl('/onboarding');
    }
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

  private handleBackButton() {
    this.platform.backButton.subscribeWithPriority(
      10,
      async (processNextHandler) => {
        const url = this.router.url;

        if (url === '/tabs/home' || url === '/') {
          await this.showExitConfirm();
        } else {
          // Allow default Ionic back navigation for other pages
          processNextHandler();
        }
      }
    );
  }

  private async showExitConfirm() {
    const shouldExit = await this.alertService.exitApp();
    if (shouldExit) {
      App.exitApp();
    }
  }
}
