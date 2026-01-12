import { Component, OnInit } from '@angular/core';
import {
  IonicModule,
  ModalController,
  LoadingController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {
  RevenueCatUI,
  PaywallResultEnum,
} from '@revenuecat/purchases-capacitor-ui';
import { PurchasesService } from '../../services/purchases.service';
import { UserService } from '../../services/user.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-paywall-modal',
  templateUrl: './paywall-modal.component.html',
  styleUrls: ['./paywall-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class PaywallModalComponent implements OnInit {
  isLoading = false;

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertService: AlertService,
    private purchasesService: PurchasesService,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Present the paywall immediately when modal opens
    this.presentPaywall();
  }

  async presentPaywall() {
    try {
      this.isLoading = true;

      // Check if offerings are available
      const offerings = this.purchasesService.getOfferings();
      if (!offerings || !offerings.current) {
        await this.showError(
          'No subscription plans available at the moment. Please try again later.'
        );
        this.close();
        return;
      }

      // Present RevenueCat's native paywall
      const result = await RevenueCatUI.presentPaywall();

      // Handle the result
      if (
        result &&
        (result.result === PaywallResultEnum.PURCHASED ||
          result.result === PaywallResultEnum.RESTORED)
      ) {
        // Purchase was successful
        console.log('Paywall purchase successful');

        // Sync premium status
        await this.userService.syncPremiumStatusFromRevenueCat();

        // Dismiss with success
        this.modalController.dismiss({
          role: 'purchased',
          purchased: true,
        });
      } else {
        // User dismissed without purchasing
        console.log('Paywall dismissed without purchase');
        this.close();
      }
    } catch (error: any) {
      console.error('Paywall presentation error:', error);

      // Check if user cancelled
      if (error.userCancelled || error.code === 'USER_CANCELLED') {
        console.log('User cancelled paywall');
        this.close();
      } else {
        await this.showError('An error occurred. Please try again.');
        this.close();
      }
    } finally {
      this.isLoading = false;
    }
  }

  async restorePurchases() {
    const loading = await this.loadingController.create({
      message: 'Restoring purchases...',
    });
    await loading.present();

    try {
      const customerInfo = await this.purchasesService.restorePurchases();
      await loading.dismiss();

      if (customerInfo && this.purchasesService.hasProEntitlement()) {
        // Sync premium status
        await this.userService.syncPremiumStatusFromRevenueCat();

        await this.showSuccess('Purchases restored successfully!');
        this.modalController.dismiss({
          role: 'restored',
          purchased: true,
        });
      } else {
        await this.showInfo('No previous purchases found.');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('Restore purchases error:', error);
      await this.showError('Failed to restore purchases. Please try again.');
    }
  }

  close() {
    this.modalController.dismiss({
      role: 'cancel',
      purchased: false,
    });
  }

  private async showError(message: string) {
    await this.alertService.error('Error', message);
  }

  private async showSuccess(message: string) {
    await this.alertService.success('Success', message);
  }

  private async showInfo(message: string) {
    await this.alertService.info('Info', message);
  }
}
