import { Injectable, signal, computed } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesError,
} from '@revenuecat/purchases-typescript-internal-esm';
import { environment } from '../../environments/environment';

/**
 * BANK-GRADE SUBSCRIPTION SERVICE
 * Handles RevenueCat integration with custom UI
 *
 * Entitlement ID: 'pro_access'
 * Offering ID: 'default'
 * Package Identifiers: Auto-mapped by RevenueCat ($rc_monthly, $rc_annual)
 */
@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  // Reactive state using Angular Signals
  private customerInfoSignal = signal<CustomerInfo | null>(null);
  private offeringsSignal = signal<PurchasesOfferings | null>(null);
  private isInitializedSignal = signal<boolean>(false);

  // Public computed signals
  isPro = computed(() => {
    const customer = this.customerInfoSignal();
    if (!customer) return false;
    return customer.entitlements?.active?.['pro_access'] !== undefined;
  });

  customerInfo = this.customerInfoSignal.asReadonly();
  offerings = this.offeringsSignal.asReadonly();
  isInitialized = this.isInitializedSignal.asReadonly();

  private initPromise: Promise<void> | null = null;

  constructor(private platform: Platform) {}

  /**
   * TASK 1.1: Initialize RevenueCat SDK
   * Sets log level to DEBUG for troubleshooting
   */
  async init(): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitializedSignal()) {
      console.log('✅ SubscriptionService: Already initialized');
      return;
    }

    // Reuse existing init promise if in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInit();
    return this.initPromise;
  }

  private async performInit(): Promise<void> {
    try {
      await this.platform.ready();

      // Step 1: Get platform-specific API key
      const apiKey = this.platform.is('ios')
        ? environment.revenuecat.apiKeyIOS
        : environment.revenuecat.apiKeyAndroid;

      if (!apiKey || apiKey.includes('YOUR_') || apiKey.includes('test_')) {
        console.warn(
          '⚠️ SubscriptionService: Using test API key or no key configured'
        );
        // Don't throw - allow testing in dev mode
      }

      // Step 2: Configure Purchases SDK
      console.log('🔧 SubscriptionService: Configuring RevenueCat...');
      await Purchases.configure({
        apiKey,
        appUserID: undefined, // Let RevenueCat generate anonymous ID
      });

      // Step 3: Set log level to DEBUG
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      console.log('📝 SubscriptionService: Log level set to DEBUG');

      // Step 4: Fetch initial customer info
      const { customerInfo } = await Purchases.getCustomerInfo();
      this.customerInfoSignal.set(customerInfo);

      // Step 5: Setup customer info update listener
      this.setupCustomerInfoListener();

      this.isInitializedSignal.set(true);
      console.log('✅ SubscriptionService: Initialization complete');
      console.log('🔒 Pro status:', this.isPro());
    } catch (error) {
      console.error('❌ SubscriptionService: Init failed', error);
      throw new Error('Failed to initialize subscription service');
    }
  }

  /**
   * Setup listener for customer info updates
   * Updates signal whenever RevenueCat emits new customer data
   */
  private setupCustomerInfoListener(): void {
    try {
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        console.log('🔄 SubscriptionService: Customer info updated');
        this.customerInfoSignal.set(customerInfo);
      });
    } catch (error) {
      console.warn('⚠️ Could not setup customer info listener:', error);
    }
  }

  /**
   * TASK 1.2: Get Current Offering
   * Fetches the 'default' offering from RevenueCat
   * Handles network errors and null offerings gracefully
   */
  async getCurrentOffering(): Promise<PurchasesOfferings | null> {
    try {
      // Ensure SDK is initialized
      if (!this.isInitializedSignal()) {
        console.log(
          '⏳ SubscriptionService: SDK not initialized, initializing...'
        );
        await this.init();
      }

      console.log('📦 SubscriptionService: Fetching offerings...');
      const offerings = await Purchases.getOfferings();

      // Cache offerings in signal
      this.offeringsSignal.set(offerings);

      // Check if we have the 'default' offering
      if (!offerings.current) {
        console.warn(
          '⚠️ SubscriptionService: No current offering found. Check RevenueCat dashboard.'
        );
        console.log('Available offerings:', Object.keys(offerings.all || {}));
        return null;
      }

      console.log('✅ SubscriptionService: Offering fetched successfully');
      console.log('📦 Offering ID:', offerings.current.identifier);
      console.log('📦 Packages:', offerings.current.availablePackages.length);

      return offerings;
    } catch (error: any) {
      console.error('❌ SubscriptionService: Failed to fetch offerings', error);

      // Provide helpful error messages
      if (error?.message?.includes('Network')) {
        throw new Error(
          'Network error. Please check your internet connection.'
        );
      } else if (error?.message?.includes('API')) {
        throw new Error(
          'Configuration error. Please check your RevenueCat API key.'
        );
      }

      throw new Error('Could not load subscription options. Please try again.');
    }
  }

  /**
   * TASK 1.3: Purchase Package
   * Handles purchase flow with proper error handling
   * Ignores PURCHASE_CANCELLED, alerts on other errors
   */
  async purchasePackage(packageToBuy: PurchasesPackage): Promise<CustomerInfo> {
    try {
      console.log('💳 SubscriptionService: Starting purchase...', {
        identifier: packageToBuy.identifier,
        productId: packageToBuy.product.identifier,
        price: packageToBuy.product.priceString,
      });

      const { customerInfo } = await Purchases.purchasePackage({
        aPackage: packageToBuy,
      });

      console.log('✅ SubscriptionService: Purchase successful!');
      console.log(
        '🔓 Active entitlements:',
        Object.keys(customerInfo.entitlements.active)
      );

      // Update signal
      this.customerInfoSignal.set(customerInfo);

      return customerInfo;
    } catch (error: any) {
      // Handle user cancellation silently
      if (error.userCancelled || error.code === '1') {
        console.log('🚫 SubscriptionService: User cancelled purchase');
        throw { cancelled: true };
      }

      // Log and throw other errors
      console.error('❌ SubscriptionService: Purchase failed', {
        message: error?.message,
        code: error?.code,
        underlyingError: error?.underlyingErrorMessage,
      });

      // Provide user-friendly error messages
      if (error?.message?.includes('already')) {
        throw new Error(
          'You already own this subscription. Try restoring purchases.'
        );
      } else if (error?.message?.includes('payment')) {
        throw new Error('Payment failed. Please check your payment method.');
      } else if (error?.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }

      throw new Error('Purchase failed. Please try again.');
    }
  }

  /**
   * TASK 1.4: Restore Purchases
   * Restores previous purchases and updates Pro status
   */
  async restorePurchases(): Promise<CustomerInfo> {
    try {
      console.log('🔄 SubscriptionService: Restoring purchases...');

      const { customerInfo } = await Purchases.restorePurchases();

      console.log('✅ SubscriptionService: Restore complete');
      console.log(
        '🔓 Active entitlements:',
        Object.keys(customerInfo.entitlements.active)
      );

      // Update signal
      this.customerInfoSignal.set(customerInfo);

      return customerInfo;
    } catch (error: any) {
      console.error('❌ SubscriptionService: Restore failed', error);
      throw new Error('Failed to restore purchases. Please try again.');
    }
  }

  /**
   * Check if user has active pro entitlement
   * Alias for isPro signal
   */
  hasProAccess(): boolean {
    return this.isPro();
  }

  /**
   * Get all packages from current offering
   * Helper method for UI components
   */
  getAvailablePackages(): PurchasesPackage[] {
    const offerings = this.offeringsSignal();
    if (!offerings?.current) return [];
    return offerings.current.availablePackages;
  }

  /**
   * Log out / Reset anonymous user ID
   * Call this when user logs out of your app
   */
  async logOut(): Promise<void> {
    try {
      console.log('👋 SubscriptionService: Logging out...');
      await Purchases.logOut();

      // Reset signals
      this.customerInfoSignal.set(null);
      console.log('✅ SubscriptionService: Logged out successfully');
    } catch (error) {
      console.error('❌ SubscriptionService: Logout failed', error);
    }
  }

  /**
   * Set user ID for RevenueCat
   * Call after user logs in to link purchases to account
   */
  async login(userId: string): Promise<void> {
    try {
      console.log('🔐 SubscriptionService: Logging in with user ID:', userId);
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });

      this.customerInfoSignal.set(customerInfo);
      console.log('✅ SubscriptionService: Login successful');
    } catch (error) {
      console.error('❌ SubscriptionService: Login failed', error);
      throw error;
    }
  }
}
