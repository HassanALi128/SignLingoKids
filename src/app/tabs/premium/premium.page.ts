import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NavController,
  LoadingController,
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
  IonImg,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkCircle, star } from 'ionicons/icons';
import { MonetizationService } from '../../services/monetization.service';
import { PurchasesService } from '../../services/purchases.service';
import { UserService } from '../../services/user.service';
import { CommonService } from '../../core/services/common';
import { ParentalGateComponent } from '../../components/parental-gate/parental-gate.component';

@Component({
  selector: 'app-premium',
  templateUrl: './premium.page.html',
  styleUrls: ['./premium.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSpinner,
    IonImg,
  ],
})
export class PremiumPage implements OnInit {
  // Subscription packages
  packages: any[] = [];
  selectedPackage: any = null;
  isLoadingPackages = false;
  packagesError: string | null = null;

  constructor(
    private navCtrl: NavController,
    private monetizationService: MonetizationService,
    private purchasesService: PurchasesService,
    private userService: UserService,
    private commonService: CommonService,
    private loadingController: LoadingController,
    private modalController: ModalController
  ) {
    addIcons({
      'arrow-back': arrowBackOutline,
      'checkmark-circle': checkmarkCircle,
      star,
    });
  }

  ngOnInit() {
    this.loadSubscriptionPackages();
  }

  async loadSubscriptionPackages() {
    try {
      this.isLoadingPackages = true;
      this.packagesError = null;

      // Get offerings from PurchasesService
      let offerings = this.purchasesService.getOfferings();

      if (!offerings || !offerings.current) {
        // Fetch fresh offerings if not cached
        offerings = await this.purchasesService.fetchOfferings();
      }

      if (
        offerings &&
        offerings.current &&
        offerings.current.availablePackages.length > 0
      ) {
        this.packages = offerings.current.availablePackages;

        // Auto-select annual package, or first package if no annual
        const annual = this.packages.find(
          (p) =>
            p.packageType === 'ANNUAL' ||
            p.identifier.toLowerCase().includes('annual') ||
            p.identifier.toLowerCase().includes('yearly')
        );
        this.selectedPackage = annual || this.packages[0];

        console.log('✅ Loaded subscription packages:', this.packages.length);
      } else {
        this.packagesError = 'No subscription plans available';
      }
    } catch (error: any) {
      console.error('❌ Error loading packages:', error);
      this.packagesError = 'Failed to load subscription plans';
    } finally {
      this.isLoadingPackages = false;
    }
  }

  selectPackage(pkg: any) {
    this.selectedPackage = pkg;
    // Immediately trigger purchase when user taps a plan card
    this.buyPremium();
  }

  getPackageDisplayName(pkg: any): string {
    if (pkg.packageType === 'ANNUAL') return 'Annual Plan';
    if (pkg.packageType === 'MONTHLY') return 'Monthly Plan';
    if (pkg.packageType === 'WEEKLY') return 'Weekly Plan';

    // Check identifier for package type
    const identifier = pkg.identifier?.toLowerCase() || '';
    if (identifier.includes('weekly') || identifier.includes('week'))
      return 'Weekly Plan';
    if (
      identifier.includes('annual') ||
      identifier.includes('yearly') ||
      identifier.includes('year')
    )
      return 'Annual Plan';
    if (identifier.includes('monthly') || identifier.includes('month'))
      return 'Monthly Plan';

    return pkg?.product?.title || 'Premium Plan';
  }

  getPackagePeriod(pkg: any): string {
    if (pkg.packageType === 'ANNUAL') return '/year';
    if (pkg.packageType === 'MONTHLY') return '/month';
    if (pkg.packageType === 'WEEKLY') return '/week';

    // Check identifier for package type
    const identifier = pkg.identifier?.toLowerCase() || '';
    if (identifier.includes('weekly') || identifier.includes('week'))
      return '/week';
    if (
      identifier.includes('annual') ||
      identifier.includes('yearly') ||
      identifier.includes('year')
    )
      return '/year';
    if (identifier.includes('monthly') || identifier.includes('month'))
      return '/month';

    return '';
  }

  goBack() {
    this.navCtrl.back();
  }

  async buyPremium() {
    if (!this.selectedPackage) {
      this.commonService.messageWithToast(
        'Please select a subscription plan',
        2000,
        'warning',
        'top'
      );
      return;
    }

    // Step 1: Show parental gate for verification (as bottom sheet)
    const modal = await this.modalController.create({
      component: ParentalGateComponent,
      backdropDismiss: false,
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
      handle: true,
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    // If parental verification failed or was cancelled, stop here
    if (!data || !data.verified) {
      console.log('Parental verification cancelled or failed');
      return;
    }

    // Step 2: Proceed with purchase after successful verification
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
        console.log('✅ Purchase successful');
        await this.userService.syncPremiumStatusFromRevenueCat();

        this.commonService.messageWithToast(
          '🎉 Welcome to Premium!',
          2000,
          'success',
          'top'
        );

        // Navigate back to settings
        this.goBack();
      } else {
        this.commonService.messageWithToast(
          'Purchase processed but premium status not activated. Please try restoring your purchases.',
          3000,
          'warning',
          'top'
        );
      }
    } catch (error: any) {
      await loading.dismiss();

      // Handle user cancellation silently
      if (error.message === 'CANCELLED' || error.userCancelled) {
        console.log('User cancelled purchase');
        return;
      }

      console.error('Purchase error:', error);
      this.commonService.messageWithToast(
        error.message || 'Purchase failed. Please try again.',
        2000,
        'danger',
        'top'
      );
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

        this.commonService.messageWithToast(
          'Purchases restored successfully!',
          2000,
          'success',
          'top'
        );

        this.goBack();
      } else {
        this.commonService.messageWithToast(
          'No active subscriptions found.',
          2000,
          'primary',
          'top'
        );
      }
    } catch (error: any) {
      await loading.dismiss();
      this.commonService.messageWithToast(
        'Failed to restore purchases. Please try again.',
        2000,
        'danger',
        'top'
      );
    }
  }
}
