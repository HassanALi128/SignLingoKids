import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { BehaviorSubject, Observable } from 'rxjs';
import { Purchases } from '@revenuecat/purchases-capacitor';
import {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
} from '@revenuecat/purchases-typescript-internal-esm';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PurchasesService {
  private customerInfoSubject = new BehaviorSubject<CustomerInfo | null>(null);
  public customerInfo$: Observable<CustomerInfo | null> =
    this.customerInfoSubject.asObservable();

  private isPremiumSubject = new BehaviorSubject<boolean>(false);
  public isPremium$: Observable<boolean> = this.isPremiumSubject.asObservable();

  private offeringsSubject = new BehaviorSubject<PurchasesOfferings | null>(
    null
  );
  public offerings$: Observable<PurchasesOfferings | null> =
    this.offeringsSubject.asObservable();

  private isInitialized = false;

  constructor(private platform: Platform) {}

  private initPromise: Promise<void> | null = null;

  /**
   * Initialize RevenueCat SDK
   * Call this once during app startup or lazily
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInit();
    return this.initPromise;
  }

  private async performInit(): Promise<void> {
    // Check if initialization is blocked (e.g. by previous error or just pending)
    if (this.isInitialized) return;

    try {
      // Don't wait for platform.ready() if we are already running logic that implies readiness,
      // but RevenueCat plugin needs it. Safe to await.
      await this.platform.ready();

      // Configure RevenueCat
      const apiKey = this.platform.is('ios')
        ? environment.revenuecat.apiKeyIOS
        : environment.revenuecat.apiKeyAndroid;

      if (!apiKey || apiKey.includes('YOUR_')) {
        console.warn(
          '⚠️ RevenueCat API keys not configured. Please add your keys to environment files.'
        );
        return;
      }

      // Initialize Purchases SDK with timeout protection
      await this.withTimeout(
        Purchases.configure({
          apiKey,
          appUserID: undefined, // Will be set later when user logs in
        }),
        5000,
        'Purchases.configure'
      );

      // Set log level for debugging (remove in production)
      if (!environment.production) {
        try {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        } catch (error) {
          console.warn('Could not set log level:', error);
        }
      }

      // Listen to customer info updates
      this.setupCustomerInfoListener();

      // Fetch initial customer info with timeout
      // Don't block app startup if this fails
      try {
        await this.withTimeout(
          this.refreshCustomerInfo(),
          3000,
          'refreshCustomerInfo'
        );
      } catch (error) {
        console.warn('Could not fetch initial customer info:', error);
        // Continue anyway - we'll retry later
      }

      // Fetch offerings (non-blocking; 5s max — RevenueCat retries internally)
      try {
        await this.withTimeout(this.fetchOfferings(), 5000, 'fetchOfferings');
      } catch (error) {
        console.warn('Could not fetch offerings:', error);
        // Continue anyway - we'll retry later
      }

      this.isInitialized = true;
      console.log('✅ RevenueCat initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat:', error);
      // Mark as initialized to prevent infinite retry loops if config is bad
      this.isInitialized = true;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Wrap a promise with a timeout
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`${operationName} timed out after ${timeoutMs}ms`)
            ),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Set up listener for customer info updates
   */
  private setupCustomerInfoListener(): void {
    Purchases.addCustomerInfoUpdateListener((customerInfo: CustomerInfo) => {
      console.log('Customer info updated:', customerInfo);
      this.customerInfoSubject.next(customerInfo);
      this.updatePremiumStatus(customerInfo);
    });
  }

  /**
   * Refresh customer info from RevenueCat
   */
  async refreshCustomerInfo(): Promise<CustomerInfo | null> {
    if (!this.isInitialized) await this.init();
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      this.customerInfoSubject.next(customerInfo);
      this.updatePremiumStatus(customerInfo);
      return customerInfo;
    } catch (error: any) {
      // Log but don't crash on StoreKit authentication errors
      if (
        error?.message?.includes('Authentication') ||
        error?.message?.includes('ASDErrorDomain') ||
        error?.message?.includes('AMSErrorDomain')
      ) {
        console.warn(
          'StoreKit authentication error (sandbox issue):',
          error.message
        );
      } else {
        console.error('Failed to get customer info:', error);
      }
      return null;
    }
  }

  /**
   * Update premium status based on customer info
   */
  private updatePremiumStatus(customerInfo: CustomerInfo): void {
    // Check if user has any active entitlements
    const hasPremium =
      customerInfo.entitlements.active['premium'] !== undefined;
    this.isPremiumSubject.next(hasPremium);
  }

  public lastError: string | null = null;
  public lastErrorDetails: any = null;

  /**
   * Fetch available offerings from RevenueCat
   */
  async fetchOfferings(): Promise<PurchasesOfferings | null> {
    if (!this.isInitialized) await this.init();
    try {
      this.lastError = null;
      this.lastErrorDetails = null;

      const offerings = await Purchases.getOfferings();

      // Log detailed product information for debugging
      if (offerings?.current) {
        console.log(
          '✅ Offerings fetched:',
          offerings.current.availablePackages.length,
          'packages'
        );
      } else {
        console.warn('⚠️ No current offering found');
        console.log('All offerings:', Object.keys(offerings?.all || {}));
        this.lastError =
          'No offerings available. Please check RevenueCat dashboard configuration.';
      }

      this.offeringsSubject.next(offerings);
      return offerings;
    } catch (error: any) {
      console.error('❌ Failed to fetch offerings:', error);

      // Detailed error messages for common issues
      let userFriendlyError = 'Unable to load products. ';

      if (error?.message?.includes('API key')) {
        userFriendlyError +=
          'Invalid API key. Please check your RevenueCat configuration.';
      } else if (error?.message?.includes('Network')) {
        userFriendlyError +=
          'Network error. Please check your internet connection.';
      } else if (error?.message?.includes('No products')) {
        userFriendlyError +=
          'No products configured. Please set up products in RevenueCat dashboard.';
      } else if (error?.message?.includes('cannot connect to App Store')) {
        userFriendlyError +=
          'Cannot connect to App Store. Make sure you are signed in to your Apple ID.';
      } else {
        userFriendlyError += 'Please try again later.';
      }

      this.lastError = userFriendlyError;
      this.lastErrorDetails = {
        message: error?.message,
        code: error?.code,
        underlyingErrorMessage: error?.underlyingErrorMessage,
        fullError: error,
      };

      console.error('Error details:', this.lastErrorDetails);
      return null;
    }
  }

  /**
   * Purchase a package
   */
  async purchasePackage(
    packageToBuy: PurchasesPackage
  ): Promise<CustomerInfo | null> {
    if (!this.isInitialized) await this.init();

    console.log('🛒 Initiating purchase for:', {
      identifier: packageToBuy.identifier,
      productId: packageToBuy.product.identifier,
      price: packageToBuy.product.priceString,
    });

    try {
      const { customerInfo } = await Purchases.purchasePackage({
        aPackage: packageToBuy,
      });

      console.log('✅ Purchase successful!');
      console.log(
        'Active entitlements:',
        Object.keys(customerInfo.entitlements.active)
      );

      this.customerInfoSubject.next(customerInfo);
      this.updatePremiumStatus(customerInfo);
      return customerInfo;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
        throw new Error('CANCELLED');
      } else {
        console.error('❌ Purchase failed:', {
          message: error?.message,
          code: error?.code,
          underlyingError: error?.underlyingErrorMessage,
        });

        // Provide helpful error messages
        if (error?.message?.includes('Product already purchased')) {
          throw new Error(
            'You already own this subscription. Try restoring your purchases instead.'
          );
        } else if (error?.message?.includes('payment')) {
          throw new Error(
            'Payment failed. Please check your payment method and try again.'
          );
        } else if (error?.message?.includes('Network')) {
          throw new Error(
            'Network error. Please check your internet connection.'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<CustomerInfo | null> {
    if (!this.isInitialized) await this.init();
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      console.log('Purchases restored:', customerInfo);
      this.customerInfoSubject.next(customerInfo);
      this.updatePremiumStatus(customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  /**
   * Identify user with custom app user ID
   * Call this after user authentication
   */
  async identifyUser(appUserID: string): Promise<void> {
    if (!this.isInitialized) await this.init();
    try {
      const { customerInfo } = await Purchases.logIn({ appUserID });
      this.customerInfoSubject.next(customerInfo);
      this.updatePremiumStatus(customerInfo);
      console.log('User identified:', appUserID);
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Log out current user
   */
  async logOut(): Promise<void> {
    if (!this.isInitialized) await this.init();
    try {
      const { customerInfo } = await Purchases.logOut();
      this.customerInfoSubject.next(customerInfo);
      this.updatePremiumStatus(customerInfo);
      console.log('User logged out');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  /**
   * Get current premium status (synchronous)
   */
  isPremium(): boolean {
    return this.isPremiumSubject.value;
  }

  /**
   * Get current customer info (synchronous)
   */
  getCustomerInfo(): CustomerInfo | null {
    return this.customerInfoSubject.value;
  }

  /**
   * Get current offerings (synchronous)
   */
  getOfferings(): PurchasesOfferings | null {
    return this.offeringsSubject.value;
  }

  /**
   * Check if user has active pro entitlement
   */
  hasProEntitlement(): boolean {
    const customerInfo = this.getCustomerInfo();
    return customerInfo?.entitlements.active['premium'] !== undefined;
  }

  /**
   * Get human-readable error message
   */
  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Get detailed error information for debugging
   */
  getLastErrorDetails(): any {
    return this.lastErrorDetails;
  }

  /**
   * Validate product configuration
   */
  async validateProducts(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const offerings = await this.fetchOfferings();

      if (!offerings) {
        issues.push('No offerings returned from RevenueCat');
        return { isValid: false, issues };
      }

      if (!offerings.current) {
        issues.push('No current offering configured');
      }

      if (offerings.current?.availablePackages.length === 0) {
        issues.push('Current offering has no packages');
      }

      // Check for expected package types
      const packageTypes: any =
        offerings.current?.availablePackages.map((pkg) => pkg.packageType) ||
        [];

      if (
        !packageTypes.includes('MONTHLY') &&
        !packageTypes.includes('$rc_monthly')
      ) {
        issues.push('No monthly package found');
      }

      if (
        !packageTypes.includes('ANNUAL') &&
        !packageTypes.includes('$rc_annual')
      ) {
        issues.push('No annual package found');
      }

      return {
        isValid: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(`Error validating products: ${error}`);
      return { isValid: false, issues };
    }
  }
}
