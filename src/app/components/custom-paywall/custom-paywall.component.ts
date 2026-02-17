import { Component, OnInit, signal, computed } from '@angular/core';
import {
  IonicModule,
  ModalController,
  LoadingController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../services/subscription.service';
import { UserService } from '../../services/user.service';
import { PurchasesPackage } from '@revenuecat/purchases-typescript-internal-esm';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  checkmarkCircle,
  starOutline,
  lockClosedOutline,
  refreshOutline,
} from 'iconicons/icons';

/**
 * CUSTOM PAYWALL COMPONENT
 * Conversion-focused UI for subscription purchases
 * Does NOT use RevenueCat UI library
 */
@Component({
  selector: 'app-custom-paywall',
  templateUrl: './custom-paywall.component.html',
  styleUrls: ['./custom-paywall.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class CustomPaywallComponent implements OnInit {
  // State signals
  isLoading = signal<boolean>(true);
  packages = signal<PurchasesPackage[]>([]);
  selectedPackage = signal<PurchasesPackage | null>(null);
  errorMessage = signal<string | null>(null);

  // Computed values
  monthlyPackage = computed(() => {
    return this.packages().find(
      (pkg) =>
        pkg.identifier.includes('monthly') || pkg.identifier === '$rc_monthly'
    );
  });

  annualPackage = computed(() => {
    return this.packages().find(
      (pkg) =>
        pkg.identifier.includes('annual') || pkg.identifier === '$rc_annual'
    );
  });

  // Calculate savings for annual plan
  annualSavings = computed(() => {
    const monthly = this.monthlyPackage();
    const annual = this.annualPackage();

    if (!monthly || !annual) return null;

    const monthlyPrice = monthly.product.price;
    const annualPrice = annual.product.price;
    const yearlyMonthlyTotal = monthlyPrice * 12;
    const savings = yearlyMonthlyTotal - annualPrice;
    const savingsPercent = Math.round((savings / yearlyMonthlyTotal) * 100);

    return {
      amount: savings,
      percent: savingsPercent,
      priceString: `Save ${savingsPercent}%`,
    };
  });

  // Features list
  features = [
    'Unlimited access to all lessons',
    'Advanced hand tracking',
    'Personalized learning path',
    'Progress tracking',
    'Ad-free experience',
    'Priority support',
  ];

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private subscriptionService: SubscriptionService,
    private userService: UserService
  ) {
    addIcons({
      closeOutline,
      checkmarkCircle,
      starOutline,
      lockClosedOutline,
      refreshOutline,
    });
  }

  async ngOnInit() {
    await this.loadOfferings();
  }

  /**
   * Load offerings from RevenueCat
   * Shows loading state while fetching
   */
  async loadOfferings() {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      console.log('🛍️ Paywall: Loading offerings...');

      const offerings = await this.subscriptionService.getCurrentOffering();

      if (!offerings?.current) {
        throw new Error('No subscription options available');
      }

      const availablePackages = offerings.current.availablePackages;

      if (availablePackages.length === 0) {
        throw new Error('No packages found');
      }

      this.packages.set(availablePackages);

      // Auto-select annual by default (better value)
      const annual = this.annualPackage();
      const monthly = this.monthlyPackage();
      this.selectedPackage.set(annual || monthly || availablePackages[0]);

      console.log('✅ Paywall: Offerings loaded successfully');
      console.log('📦 Packages:', availablePackages.length);
    } catch (error: any) {
      console.error('❌ Paywall: Failed to load offerings', error);
      this.errorMessage.set(
        error.message || 'Could not load subscription options'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handle package selection
   */
  selectPackage(pkg: PurchasesPackage) {
    this.selectedPackage.set(pkg);
  }

  /**
   * Is package selected?
   */
  isSelected(pkg: PurchasesPackage): boolean {
    return this.selectedPackage()?.identifier === pkg.identifier;
  }

  /**
   * Is package the annual (best value) package?
   */
  isBestValue(pkg: PurchasesPackage): boolean {
    const annual = this.annualPackage();
    return annual?.identifier === pkg.identifier;
  }

  /**
   * Purchase the selected package
   */
  async purchase() {
    const selected = this.selectedPackage();
    if (!selected) {
      console.warn('⚠️ Paywall: No package selected');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Processing purchase...',
      spinner: 'crescent',
    });

    await loading.present();

    try {
      console.log('💳 Paywall: Starting purchase flow...');

      const customerInfo = await this.subscriptionService.purchasePackage(
        selected
      );

      await loading.dismiss();

      // Check if purchase was successful
      if (this.subscriptionService.hasProAccess()) {
        console.log('✅ Paywall: Purchase successful!');

        // Sync premium status to Firestore
        await this.userService.syncPremiumStatusFromRevenueCat();

        // Close modal with success
        await this.modalController.dismiss({
          purchased: true,
          role: 'purchased',
        });
      } else {
        console.warn('⚠️ Paywall: Purchase completed but no entitlement');
        throw new Error('Purchase processed but premium access not activated');
      }
    } catch (error: any) {
      await loading.dismiss();

      // Handle user cancellation silently
      if (error?.cancelled) {
        console.log('🚫 Paywall: User cancelled purchase');
        return;
      }

      // Show error to user
      console.error('❌ Paywall: Purchase failed', error);

      const alert = await this.createAlert(
        'Purchase Failed',
        error.message || 'Something went wrong. Please try again.'
      );
      await alert.present();
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases() {
    const loading = await this.loadingController.create({
      message: 'Restoring purchases...',
      spinner: 'crescent',
    });

    await loading.present();

    try {
      console.log('🔄 Paywall: Restoring purchases...');

      const customerInfo = await this.subscriptionService.restorePurchases();

      await loading.dismiss();

      if (this.subscriptionService.hasProAccess()) {
        console.log('✅ Paywall: Restore successful!');

        // Sync to Firestore
        await this.userService.syncPremiumStatusFromRevenueCat();

        const alert = await this.createAlert(
          'Success',
          '🎉 Your purchases have been restored!'
        );
        await alert.present();

        // Close modal
        setTimeout(() => {
          this.modalController.dismiss({ purchased: true, role: 'restored' });
        }, 1500);
      } else {
        const alert = await this.createAlert(
          'No Purchases Found',
          'No previous purchases were found for this account.'
        );
        await alert.present();
      }
    } catch (error: any) {
      await loading.dismiss();

      console.error('❌ Paywall: Restore failed', error);

      const alert = await this.createAlert(
        'Restore Failed',
        error.message || 'Could not restore purchases'
      );
      await alert.present();
    }
  }

  /**
   * Close modal
   */
  dismiss() {
    this.modalController.dismiss({ role: 'cancelled' });
  }

  /**
   * Open Terms of Service
   */
  openTerms() {
    // TODO: Replace with your actual Terms URL
    window.open('https://yourapp.com/terms', '_blank');
  }

  /**
   * Open Privacy Policy
   */
  openPrivacy() {
    // TODO: Replace with your actual Privacy URL
    window.open('https://yourapp.com/privacy', '_blank');
  }

  /**
   * Helper to create alerts
   */
  private async createAlert(header: string, message: string) {
    const { AlertController } = await import('@ionic/angular');
    const alertController = new AlertController();
    return alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
  }

  /**
   * Get price per month for annual plan
   */
  getMonthlyPrice(pkg: PurchasesPackage): string {
    if (pkg.identifier.includes('annual') || pkg.identifier === '$rc_annual') {
      const monthlyPrice = pkg.product.price / 12;
      const currencyCode = pkg.product.currencyCode || 'USD';
      return `${currencyCode} ${monthlyPrice.toFixed(2)}/mo`;
    }
    return pkg.product.priceString;
  }
}
