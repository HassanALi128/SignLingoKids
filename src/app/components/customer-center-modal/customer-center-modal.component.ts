import { Component, OnInit } from '@angular/core';
import {
  IonicModule,
  ModalController,
  LoadingController,
  AlertController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';
import {
  PurchasesService,
  SubscriptionStatus,
} from '../../services/purchases.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-customer-center-modal',
  templateUrl: './customer-center-modal.component.html',
  styleUrls: ['./customer-center-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class CustomerCenterModalComponent implements OnInit {
  isLoading = false;
  subscriptionStatus: SubscriptionStatus | null = null;

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private purchasesService: PurchasesService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadSubscriptionStatus();
  }

  loadSubscriptionStatus() {
    this.subscriptionStatus = this.purchasesService.getSubscriptionStatus();
  }

  async presentCustomerCenter() {
    try {
      this.isLoading = true;

      // Present RevenueCat's Customer Center
      await RevenueCatUI.presentCustomerCenter();

      // Refresh customer info after customer center is dismissed
      await this.purchasesService.refreshCustomerInfo();
      await this.userService.syncPremiumStatusFromRevenueCat();

      // Reload subscription status
      this.loadSubscriptionStatus();
    } catch (error: any) {
      console.error('Customer Center error:', error);
      await this.showError('An error occurred. Please try again.');
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

        // Reload subscription status
        this.loadSubscriptionStatus();

        await this.showSuccess('Purchases restored successfully!');
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
    this.modalController.dismiss();
  }

  private async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showSuccess(message: string) {
    const alert = await this.alertController.create({
      header: 'Success',
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showInfo(message: string) {
    const alert = await this.alertController.create({
      header: 'Info',
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  get formattedExpirationDate(): string {
    if (!this.subscriptionStatus?.expirationDate) return 'N/A';
    return this.subscriptionStatus.expirationDate.toLocaleDateString();
  }
}
