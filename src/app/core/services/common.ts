import { inject, Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import {
  ToastController,
  LoadingController,
  NavController,
} from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';

import { Router } from '@angular/router';
@Injectable({
  providedIn: 'root',
})
export class CommonService {

  private location = inject(Location);


  constructor(
    private alertCtrl: AlertController,
    private toastController: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private router:Router
  ) {}

  goToPage(pageName: string, data?: any) {
    this.navCtrl.navigateForward(pageName);
  }
  goBackPage() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['tabs/home']);
    }
  }
  rootPage(pageName: string) {
    console.log('Navigating to:', pageName);
    this.navCtrl.navigateRoot(pageName, { replaceUrl: true });
  }

  async confirmationAlert(header: string, message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: 'No',
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: 'Yes',
            handler: () => resolve(true),
          },
        ],
      });
      await alert.present();
    });
  }

  async alertMessage(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['Ok'],
    });
    await alert.present();
    return alert;
  }

  async messageWithToast(
    message: string,
    duration?: number,
    color?:
      | 'primary'
      | 'secondary'
      | 'tertiary'
      | 'success'
      | 'warning'
      | 'danger'
      | 'light'
      | 'medium'
      | 'dark'
      | string,
    position?: 'top' | 'middle' | 'bottom'
  ) {
    const checkToat = await this.toastController.getTop();
    if (checkToat) {
      this.toastController.dismiss();
    }
    const toast = await this.toastController.create({
      message,
      duration: duration || 3000,
      position: position || 'top',
      color: color || 'primary',
     cssClass: 'safe-top-toast',
    });
    await toast.present();
  }
  async showLoadingSpinner(message?: string) {
    const check = await this.loadingCtrl.getTop();
    if (check) {
      await this.loadingCtrl.dismiss();
      return;
    }
    const loading = await this.loadingCtrl.create({
      message: message || 'Please wait...',
      spinner: 'circles',
    });
    loading.present();
  }

  async hideLoadingSpinner() {
    await this.loadingCtrl.dismiss();
  }
  // logout() {
  //   this.navCtrl.navigateRoot('auth/login');
  //   localStorage.removeItem(environment.userLocal);
  //   localStorage.removeItem(environment.sairToken);
  //   this.userService.user = null;
  // }


  private clearAllStoreStates() {
    // Clear any other stores that might have state
    // This ensures clean state when switching between roles
    try {
      // Clear store states - we'll handle this differently
      // The stores will be reset when new user data is loaded
      console.log('Store states will be cleared on next login');
    } catch (error) {
      console.error('Error clearing store states:', error);
    }
  }




}
