import { Component, OnInit } from '@angular/core';
import {
  IonApp,
  IonRouterOutlet,
  Platform,
  AlertController,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { MonetizationService } from './services/monetization.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private router: Router,
    private alertController: AlertController,
    private monetizationService: MonetizationService
  ) {
    this.initializeApp();
  }

  ngOnInit() {}

  initializeApp() {
    this.platform.ready().then(() => {
      this.monetizationService.init();
      this.handleNavigation();
      this.handleBackButton();
      SplashScreen.hide();
    });
  }

  private handleNavigation() {
    const completed = localStorage.getItem('onboardingCompleted') === 'true';
    if (!completed) {
      this.router.navigateByUrl('/onboarding');
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
    const alert = await this.alertController.create({
      header: 'Exit App',
      message: 'Are you sure you want to exit this app?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Exit',
          handler: () => {
            App.exitApp();
          },
        },
      ],
    });

    await alert.present();
  }
}
