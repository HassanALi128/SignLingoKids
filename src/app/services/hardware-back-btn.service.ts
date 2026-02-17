import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { App } from '@capacitor/app';
import { AlertService } from './alert.service';

@Injectable({
  providedIn: 'root',
})
export class HardwareBackBtnService {
  constructor(
    private platform: Platform,
    private router: Router,
    private location: Location,
    private alertService: AlertService
  ) {}

  init() {
    this.platform.backButton.subscribeWithPriority(
      10,
      async (processNextHandler) => {
        const url = this.router.url;

        // Check if we are on a root tab
        if (
          url === '/tabs/home' ||
          url === '/tabs/quiz' ||
          url === '/tabs/abc' ||
          url === '/tabs/settings' ||
          url === '/'
        ) {
          if (url === '/tabs/home' || url === '/') {
            // On Home Tab -> Confirm Exit
            await this.showExitConfirm();
          } else {
            // On other Root Tabs -> Go to Home
            this.router.navigateByUrl('/tabs/home');
          }
        }
        // Handle specific sub-pages that should redirect primarily to their parent tab or home
        else {
          // Default behavior: go back in history "First In, Last Out"
          this.location.back();
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
