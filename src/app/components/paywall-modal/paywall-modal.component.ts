import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  IonicModule,
  ModalController,
  LoadingController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { PurchasesService } from '../../services/purchases.service';
import { UserService } from '../../services/user.service';
import { MonetizationService } from '../../services/monetization.service';
import { AlertService } from '../../services/alert.service';
import { ParentalGateComponent } from '../parental-gate/parental-gate.component';
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
export class PaywallModalComponent implements OnInit, OnDestroy {
  isLoading = true;
  packages: any[] = [];
  selectedPackage: any = null;
  errorMessage: string | null = null;
  showDebugInfo = false; // Set to true for debugging

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertService: AlertService,
    private purchasesService: PurchasesService,
    private userService: UserService,
    private monetizationService: MonetizationService
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
    this.monetizationService.freezeAdsForPaywall();
    await this.loadOfferings();
  }

  ngOnDestroy() {
    this.monetizationService.unfreezeAdsForPaywall();
  }

  async loadOfferings() {
    try {
      this.isLoading = true;
      this.errorMessage = null;
      console.log('🛍️ Paywall: Loading offerings...');

      let offerings = this.purchasesService.getOfferings();

      if (!offerings || !offerings.current) {
        console.log(
          '📡 Paywall: No cached offerings, fetching from RevenueCat...'
        );
        offerings = await this.purchasesService.fetchOfferings();
      }

      if (
        offerings &&
        offerings.current &&
        offerings.current.availablePackages.length > 0
      ) {
        this.packages = offerings.current.availablePackages;
        console.log(`✅ Found ${this.packages.length} package(s)`);

        // Auto-select the annual package if available, otherwise monthly, otherwise first
        const annual = this.packages.find(
          (p) =>
            p.packageType === 'ANNUAL' ||
            p.packageType === 1 ||
            p.packageType === '$rc_annual' ||
            p.identifier.toLowerCase().includes('annual') ||
            p.identifier.toLowerCase().includes('yearly')
        );

        const monthly = this.packages.find(
          (p) =>
            p.packageType === 'MONTHLY' ||
            p.packageType === 0 ||
            p.packageType === '$rc_monthly' ||
            p.identifier.toLowerCase().includes('monthly')
        );

        // Prefer annual, fallback to monthly, then first package
        this.selectedPackage = annual || monthly || this.packages[0];
        console.log('📦 Selected package:', this.selectedPackage.identifier);
      } else {
        // No products found - show helpful error
        console.error('❌ No packages found in offerings');

        const errorDetails = this.purchasesService.getLastError();
        this.errorMessage = errorDetails || 'No products available';

        if (this.showDebugInfo) {
          console.log(
            'Debug info:',
            this.purchasesService.getLastErrorDetails()
          );
        }

        // Show user-friendly alert
        const message = this.getNoProductsHelpMessage();
        this.alertService.error('Products Unavailable', message);

        this.packages = [];
      }
    } catch (error: any) {
      console.error('❌ Paywall: Error loading offerings:', error);
      this.errorMessage = error?.message || 'Failed to load products';

      this.alertService.error(
        'Error',
        'Unable to load subscription options. Please try again later.'
      );
    } finally {
      this.isLoading = false;
    }
  }

  private getNoProductsHelpMessage(): string {
    const platform = this.purchasesService['platform'].is('ios')
      ? 'iOS'
      : 'Android';

    return (
      `Could not load products for ${platform}. Please ensure:\n\n` +
      `1. You're connected to the internet\n` +
      `2. You're signed in to ${
        platform === 'iOS' ? 'your Apple ID' : 'Google Play'
      }\n` +
      `3. Products are configured in RevenueCat dashboard`
    );
  }

  selectPackage(pkg: any) {
    this.selectedPackage = pkg;
    console.log('Paywall: User selected:', pkg);
  }

  async purchase() {
    // strict parental gate interceptor for purchases
    await this.executeWithParentalGate(async () => {
      if (!this.selectedPackage) {
        this.alertService.error('Error', 'Please select a subscription plan.');
        return;
      }

      const loading = await this.loadingController.create({
        message: 'Processing purchase...',
      });
      await loading.present();

      try {
        console.log('💳 Starting purchase flow...');

        const customerInfo = await this.purchasesService.purchasePackage(
          this.selectedPackage
        );

        await loading.dismiss();

        if (customerInfo && this.purchasesService.hasProEntitlement()) {
          console.log('✅ Purchase successful - syncing premium status');
          await this.userService.syncPremiumStatusFromRevenueCat();
          this.modalController.dismiss({ role: 'purchased', purchased: true });
          this.alertService.success('Success', '🎉 Welcome to Premium!');
        } else {
          console.warn('⚠️ Purchase completed but no entitlement found');
          this.alertService.error(
            'Purchase Issue',
            'Purchase processed but premium status not activated. Please try restoring your purchases.'
          );
        }
      } catch (error: any) {
        await loading.dismiss();

        console.error('Purchase error:', error);

        // Handle user cancellation silently
        if (error.message === 'CANCELLED' || error.userCancelled) {
          console.log('User cancelled purchase');
          return;
        }

        // Show user-friendly error
        let errorMessage =
          error.message || 'An unexpected error occurred. Please try again.';

        this.alertService.error('Purchase Failed', errorMessage);
      }
    });
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
 
  async openPrivacy() {
    await this.executeWithParentalGate(() => {
      window.open(
        'https://veldorastudio.com/legal/hand-hero-privacy',
        '_system'
      );
    });
  }

  async openTerms() {
    await this.executeWithParentalGate(() => {
      window.open('https://veldorastudio.com/legal/hand-hero-terms', '_system');
    });
  }

  /**
   * strict interceptor that presents the math gate before executing an action.
   */
  private async executeWithParentalGate(action: () => void | Promise<void>) {
    const modal = await this.modalController.create({
      component: ParentalGateComponent,
      cssClass: 'parental-gate-modal',
      backdropDismiss: false,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.verified) {
      // Parent verified, proceed with action
      await action();
    } else {
      console.log('Parental gate cancelled or failed verification.');
    }
  }
}
