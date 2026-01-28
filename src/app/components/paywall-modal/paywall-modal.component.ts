import { Component, OnInit } from '@angular/core';
import {
  IonicModule,
  ModalController,
  LoadingController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { PurchasesService } from '../../services/purchases.service';
import { UserService } from '../../services/user.service';
import { AlertService } from '../../services/alert.service';
import { addIcons } from 'ionicons';
import {
  closeCircle,
  checkmarkSharp,
  bookOutline,
  handLeftOutline,
  banOutline,
  closeOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-paywall-modal',
  templateUrl: './paywall-modal.component.html',
  styleUrls: ['./paywall-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class PaywallModalComponent implements OnInit {
  isLoading = true;
  packages: any[] = [];
  selectedPackage: any = null;

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertService: AlertService,
    private purchasesService: PurchasesService,
    private userService: UserService
  ) {
    addIcons({
      closeCircle,
      checkmarkSharp,
      bookOutline,
      handLeftOutline,
      banOutline,
      closeOutline,
    });
  }

  async ngOnInit() {
    await this.loadOfferings();
  }

  async loadOfferings() {
    try {
      this.isLoading = true;
      console.log('Paywall: Loading offerings...');

      let offerings = this.purchasesService.getOfferings();

      if (!offerings || !offerings.current) {
        console.log('Paywall: No cached offerings, fetching...');
        offerings = await this.purchasesService.fetchOfferings();
      }

      console.log('Paywall: Offerings result:', JSON.stringify(offerings));

      if (
        offerings &&
        offerings.current &&
        offerings.current.availablePackages.length > 0
      ) {
        this.packages = offerings.current.availablePackages;
        console.log('Paywall: Available Packages:', this.packages);

        // Debug pricing
        if (this.packages.length > 0) {
          const first = this.packages[0];
          console.log(
            'Paywall: First Package Product:',
            JSON.stringify(first.product)
          );
          console.log('Paywall: PriceString:', first.product?.priceString);
        }

        // Auto-select the annual package if available
        const annual = this.packages.find(
          (p) =>
            p.packageType === 'ANNUAL' ||
            p.packageType === 1 ||
            p.identifier.toLowerCase().includes('annual') ||
            p.identifier.toLowerCase().includes('yearly')
        );

        // Fallback to first package if annual not found
        this.selectedPackage = annual || this.packages[0];
        console.log('Paywall: Selected Package:', this.selectedPackage);
      } else {
        console.error('Paywall: No packages found. Offerings object:', JSON.stringify(offerings));
        if (offerings && offerings.current) {
           console.error('Paywall: Current offering ID:', offerings.current.identifier);
           console.error('Paywall: Available packages count:', offerings.current.availablePackages.length);
        }
        this.packages = [];
        this.alertService.error('Error', 'No products found. Please check RevenueCat configuration.');
      }
    } catch (error) {
      console.error('Paywall: Error loading offerings:', error);
    } finally {
      this.isLoading = false;
    }
  }

  selectPackage(pkg: any) {
    this.selectedPackage = pkg;
    console.log('Paywall: User selected:', pkg);
  }

  async purchase() {
    if (!this.selectedPackage) return;

    const loading = await this.loadingController.create({
      message: 'Processing purchase...',
    });
    await loading.present();

    try {
      const customerInfo = await this.purchasesService.purchasePackage(
        this.selectedPackage
      );
      await loading.dismiss();

      if (customerInfo && this.purchasesService.hasProEntitlement()) {
        await this.userService.syncPremiumStatusFromRevenueCat();
        this.modalController.dismiss({ role: 'purchased', purchased: true });
        this.alertService.success('Success', 'Welcome to Premium!');
      }
    } catch (error: any) {
      await loading.dismiss();
      if (!error.userCancelled) {
        this.alertService.error(
          'Purchase Failed',
          error.message || 'Please try again.'
        );
      }
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
        await this.userService.syncPremiumStatusFromRevenueCat();
        this.modalController.dismiss({ role: 'restored', purchased: true });
        this.alertService.success(
          'Success',
          'Purchases restored successfully!'
        );
      } else {
        this.alertService.info('Restore', 'No active subscriptions found.');
      }
    } catch (error: any) {
      await loading.dismiss();
      this.alertService.error('Error', 'Failed to restore purchases.');
    }
  }

  close() {
    this.modalController.dismiss({ role: 'cancel', purchased: false });
  }

  openPrivacy() {
    window.open('https://www.handhero3d.com/privacy', '_system');
  }

  openTerms() {
    window.open('https://www.handhero3d.com/terms', '_system');
  }
}
