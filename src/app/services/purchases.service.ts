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

      // Fetch offerings with timeout
      // Don't block app startup if this fails
      try {
        await this.withTimeout(this.fetchOfferings(), 3000, 'fetchOfferings');
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

  /**
   * Fetch available offerings from RevenueCat
   */
  async fetchOfferings(): Promise<PurchasesOfferings | null> {
    if (!this.isInitialized) await this.init();
    try {
      const offerings = await Purchases.getOfferings();
      this.offeringsSubject.next(offerings);
      return offerings;
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
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
}
