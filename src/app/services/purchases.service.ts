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

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  willRenew: boolean;
  expirationDate: Date | null;
  productIdentifier: string | null;
}

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

  /**
   * Initialize RevenueCat SDK
   * Call this once during app startup
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('RevenueCat already initialized');
      return;
    }

    try {
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

      // Initialize Purchases SDK
      console.log(
        '🔑 Configuring RevenueCat with API Key:',
        apiKey.substring(0, 8) + '...'
      );
      await Purchases.configure({
        apiKey,
        appUserID: undefined, // Will be set later when user logs in
      });

      // Set log level for debugging (remove in production)
      if (!environment.production) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      }

      // Listen to customer info updates
      this.setupCustomerInfoListener();

      // Fetch initial customer info
      await this.refreshCustomerInfo();

      // Fetch offerings
      await this.fetchOfferings();

      this.isInitialized = true;
      console.log('✅ RevenueCat initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat:', error);
    }
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
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      this.customerInfoSubject.next(customerInfo);
      this.updatePremiumStatus(customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  /**
   * Update premium status based on customer info
   */
  private updatePremiumStatus(customerInfo: CustomerInfo): void {
    // Check if user has the "Hand Hero 3D ASL Pro" entitlement
    const hasPremium =
      customerInfo.entitlements.active[environment.revenuecat.entitlementId] !==
      undefined;
    this.isPremiumSubject.next(hasPremium);
  }

  /**
   * Check if user has "Hand Hero 3D ASL Pro" entitlement
   */
  hasProEntitlement(): boolean {
    const customerInfo = this.customerInfoSubject.value;
    if (!customerInfo) return false;

    return (
      customerInfo.entitlements.active[environment.revenuecat.entitlementId] !==
      undefined
    );
  }

  /**
   * Get detailed subscription status
   */
  getSubscriptionStatus(): SubscriptionStatus {
    const customerInfo = this.customerInfoSubject.value;
    const defaultStatus: SubscriptionStatus = {
      isActive: false,
      isTrial: false,
      willRenew: false,
      expirationDate: null,
      productIdentifier: null,
    };

    if (!customerInfo) return defaultStatus;

    const entitlement =
      customerInfo.entitlements.active[environment.revenuecat.entitlementId];
    if (!entitlement) return defaultStatus;

    return {
      isActive: true,
      isTrial: entitlement.periodType === 'TRIAL',
      willRenew: entitlement.willRenew,
      expirationDate: entitlement.expirationDate
        ? new Date(entitlement.expirationDate)
        : null,
      productIdentifier: entitlement.productIdentifier,
    };
  }

  /**
   * Check if user is in trial period
   */
  isInTrial(): boolean {
    return this.getSubscriptionStatus().isTrial;
  }

  /**
   * Fetch available offerings from RevenueCat
   */
  async fetchOfferings(): Promise<PurchasesOfferings | null> {
    try {
      const offerings = await Purchases.getOfferings();
      console.log(
        '📦 RevenueCat Offerings:',
        JSON.stringify(offerings, null, 2)
      );

      if (!offerings || !offerings.current) {
        console.warn('⚠️ No current offering found in RevenueCat offerings.');
      } else {
        console.log('✅ Current offering found:', offerings.current);
      }

      this.offeringsSubject.next(offerings);
      return offerings;
    } catch (error) {
      console.error('❌ Failed to fetch offerings:', error);
      return null;
    }
  }

  /**
   * Get monthly subscription package
   */
  getMonthlyPackage(): PurchasesPackage | null {
    const offerings = this.offeringsSubject.value;
    if (!offerings || !offerings.current) return null;

    // Try to find monthly package
    return (
      offerings.current.monthly ||
      offerings.current.availablePackages.find(
        (pkg) =>
          pkg.identifier === environment.revenuecat.products.monthly ||
          pkg.packageType === 'MONTHLY'
      ) ||
      null
    );
  }

  /**
   * Get yearly subscription package
   */
  getYearlyPackage(): PurchasesPackage | null {
    const offerings = this.offeringsSubject.value;
    if (!offerings || !offerings.current) return null;

    // Try to find yearly package
    return (
      offerings.current.annual ||
      offerings.current.availablePackages.find(
        (pkg) =>
          pkg.identifier === environment.revenuecat.products.yearly ||
          pkg.packageType === 'ANNUAL'
      ) ||
      null
    );
  }

  /**
   * Purchase a package
   */
  async purchasePackage(
    packageToBuy: PurchasesPackage
  ): Promise<CustomerInfo | null> {
    try {
      const { customerInfo } = await Purchases.purchasePackage({
        aPackage: packageToBuy,
      });
      console.log('Purchase successful:', customerInfo);
      this.customerInfoSubject.next(customerInfo);
      this.updatePremiumStatus(customerInfo);
      return customerInfo;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        console.error('Purchase failed:', error);
      }
      throw error;
    }
  }

  /**
   * Purchase monthly subscription
   */
  async purchaseMonthly(): Promise<CustomerInfo | null> {
    const monthlyPackage = this.getMonthlyPackage();
    if (!monthlyPackage) {
      throw new Error('Monthly subscription package not available');
    }
    return this.purchasePackage(monthlyPackage);
  }

  /**
   * Purchase yearly subscription
   */
  async purchaseYearly(): Promise<CustomerInfo | null> {
    const yearlyPackage = this.getYearlyPackage();
    if (!yearlyPackage) {
      throw new Error('Yearly subscription package not available');
    }
    return this.purchasePackage(yearlyPackage);
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<CustomerInfo | null> {
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
}
