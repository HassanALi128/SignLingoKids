import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import {
  CustomAlertComponent,
  AlertConfig,
} from '../components/custom-alert/custom-alert.component';
import { addIcons } from 'ionicons';
import { helpCircle } from 'ionicons/icons';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  constructor(private modalController: ModalController) {
    addIcons({ helpCircle });
  }

  /**
   * Presents a custom alert modal.
   * @param config Configuration for the alert
   * @returns Promise<boolean> - true if primary button clicked, false if secondary or dismissed
   */
  async presentAlert(config: AlertConfig): Promise<boolean> {
    const modal = await this.modalController.create({
      component: CustomAlertComponent,
      componentProps: { config },
      cssClass: 'custom-alert-modal',
      backdropDismiss: false, // Force user to choose
      showBackdrop: true,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    return !!data;
  }

  /**
   * Shows a confirmation alert (Yes/No)
   */
  async confirm(
    header: string,
    message: string,
    primaryText: string = 'Yes',
    secondaryText: string = 'No',
    type: 'confirm' | 'unlearn' = 'confirm'
  ): Promise<boolean> {
    return this.presentAlert({
      header,
      message,
      type,
      primaryButtonText: primaryText,
      secondaryButtonText: secondaryText,
      icon: 'help-circle',
    });
  }

  /**
   * Shows an info alert (OK)
   */
  async info(
    header: string,
    message: string,
    buttonText: string = 'OK'
  ): Promise<boolean> {
    return this.presentAlert({
      header,
      message,
      type: 'info',
      primaryButtonText: buttonText,
      icon: 'information-circle',
    });
  }

  /**
   * Shows a warning alert
   */
  async warning(header: string, message: string): Promise<boolean> {
    return this.presentAlert({
      header,
      message,
      type: 'warning',
      primaryButtonText: 'Understood',
      secondaryButtonText: 'Cancel',
      icon: 'warning',
    });
  }

  /**
   * Shows the Exit App alert
   */
  async exitApp(): Promise<boolean> {
    return this.presentAlert({
      header: 'Exit App',
      message: 'Are you sure you want to exit the app?',
      type: 'exit',
      primaryButtonText: 'Exit',
      secondaryButtonText: 'Stay',
      icon: 'log-out',
    });
  }

  /**
   * Shows a success alert
   */
  async success(header: string, message: string): Promise<boolean> {
    return this.presentAlert({
      header,
      message,
      type: 'success',
      primaryButtonText: 'Great!',
      icon: 'checkmark-circle',
    });
  }

  /**
   * Shows an error alert
   */
  async error(header: string, message: string): Promise<boolean> {
    return this.presentAlert({
      header,
      message,
      type: 'warning', // Use warning style for errors or add specific error style
      primaryButtonText: 'OK',
      icon: 'alert-circle',
    });
  }
}
