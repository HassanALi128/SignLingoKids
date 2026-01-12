import { Component, OnInit } from '@angular/core';
import {
  IonicModule,
  ModalController,
  LoadingController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';
import { PurchasesService } from '../../services/purchases.service';
import { UserService } from '../../services/user.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-customer-center-modal',
  templateUrl: './customer-center-modal.component.html',
  styleUrls: ['./customer-center-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class CustomerCenterModalComponent implements OnInit {
  isLoading = false;

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertService: AlertService,
    private purchasesService: PurchasesService,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Component initialized
  }

  async presentCustomerCenter() {
    try {
      this.isLoading = true;

      // Present RevenueCat's Customer Center
      await RevenueCatUI.presentCustomerCenter();

      // Refresh customer info after customer center is dismissed
      await this.purchasesService.refreshCustomerInfo();
      await this.userService.syncPremiumStatusFromRevenueCat();
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
    await this.alertService.error('Error', message);
  }

  private async showSuccess(message: string) {
    await this.alertService.success('Success', message);
  }

  private async showInfo(message: string) {
    await this.alertService.info('Info', message);
  }
}
