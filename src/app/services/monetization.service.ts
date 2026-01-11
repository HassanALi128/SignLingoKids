import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import {
  AdMob,
  AdOptions,
  AdLoadInfo,
  InterstitialAdPluginEvents,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
  AdMobError,
} from '@capacitor-community/admob';
import { PurchasesService } from './purchases.service';
import {
  PurchasesOfferings,
  PurchasesPackage,
} from '@revenuecat/purchases-typescript-internal-esm';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MonetizationService {
  // Placeholder Ad Units - REPLACE WITH REAL UNITS
  // Test IDs provided by Google
  private readonly BANNER_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
  private readonly BANNER_ID_IOS = 'ca-app-pub-3940256099942544/2934735716';
  private readonly INTERSTITIAL_ID_ANDROID =
    'ca-app-pub-3940256099942544/1033173712';
  private readonly INTERSTITIAL_ID_IOS =
    'ca-app-pub-3940256099942544/4411468910';

  public isPro = false; // Synced with RevenueCat
  private isAdMobInitialized = false;

  // RevenueCat offerings - exposed for premium page
  public offerings: PurchasesOfferings | null = null;

  constructor(
    private platform: Platform,
    private purchasesService: PurchasesService
  ) {}

  async init() {
    await this.platform.ready();

    // Initialize RevenueCat first
    await this.purchasesService.init();

    // Wait for the first resolved premium status before proceeding
    try {
      this.isPro = await firstValueFrom(this.purchasesService.isPremium$);
      console.log('Initial premium status resolved:', this.isPro);
    } catch (e) {
      console.error('Error resolving initial premium status:', e);
    }

    // Subscribe to premium status from RevenueCat for runtime updates
    this.purchasesService.isPremium$.subscribe((isPremium) => {
      this.isPro = isPremium;
      console.log('Premium status updated at runtime:', isPremium);

      // Hide ads immediately if user becomes premium
      if (isPremium) {
        this.hideBanner();
      }
    });

    // Subscribe to offerings
    this.purchasesService.offerings$.subscribe((offerings) => {
      this.offerings = offerings;
    });

    // Initialize AdMob ONLY if not premium
    if (!this.isPro) {
      await this.initAdMob();
    } else {
      console.log('User is premium, skipping AdMob initialization');
    }
  }

  // ADMOB
  private async initAdMob() {
    if (this.isAdMobInitialized || this.isPro) return;

    try {
      await AdMob.initialize();
      this.isAdMobInitialized = true;
      console.log('AdMob initialized successfully');

      // Preload Interstitial
      await this.prepareInterstitial();

      // Show Banner
      await this.showBanner();
    } catch (e) {
      console.error('AdMob Init Error:', e);
    }
  }

  async showBanner() {
    if (this.isPro || !this.isAdMobInitialized) return;

    const adId = this.platform.is('ios')
      ? this.BANNER_ID_IOS
      : this.BANNER_ID_ANDROID;
    const options: BannerAdOptions = {
      adId: adId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    };

    try {
      // Listen for ad size changes to update layout
      (AdMob as any).addListener(
        BannerAdPluginEvents.SizeChanged,
        (info: any) => {
          this.setBannerHeight(info.height);
        }
      );

      // Fallback: Listen for loaded event if size changed doesn't fire immediately
      (AdMob as any).addListener(BannerAdPluginEvents.Loaded, (info: any) => {
        // If height is available in info, use it. Otherwise assume standard adaptive height (~50-60px)
        // Note: info.height might be in pixels or dp. Usually dp.
        if (info && info.height) {
          this.setBannerHeight(info.height);
        }
      });

      await AdMob.showBanner(options);
    } catch (e) {
      console.error('Show Banner Error:', e);
    }
  }

  async hideBanner() {
    try {
      await AdMob.hideBanner();
      this.setBannerHeight(0); // Reset height when hidden
    } catch (e) {
      // ignore
    }
  }

  private setBannerHeight(height: number) {
    // Convert height to string with px units
    const heightPx = height > 0 ? `${height}px` : '0px';
    document.documentElement.style.setProperty('--ad-banner-height', heightPx);
    console.log('AdMob Banner Height set to:', heightPx);
  }

  async prepareInterstitial() {
    if (this.isPro || !this.isAdMobInitialized) return;

    const adId = this.platform.is('ios')
      ? this.INTERSTITIAL_ID_IOS
      : this.INTERSTITIAL_ID_ANDROID;
    const options: AdOptions = {
      adId: adId,
    };

    try {
      await AdMob.prepareInterstitial(options);
    } catch (e) {
      console.error('Prepare Interstitial Error:', e);
    }
  }

  async showInterstitial(): Promise<void> {
    if (this.isPro || !this.isAdMobInitialized) return;

    try {
      // Check if ready, if not prepare
      await AdMob.showInterstitial();
    } catch (e) {
      console.error('Show Interstitial Error, trying to prepare again:', e);
      await this.prepareInterstitial();
    }
  }

  // REVENUECAT METHODS - Exposed for premium page

  /**
   * Purchase a package from RevenueCat
   */
  async purchasePackage(packageToBuy: PurchasesPackage): Promise<void> {
    try {
      await this.purchasesService.purchasePackage(packageToBuy);
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<void> {
    try {
      await this.purchasesService.restorePurchases();
    } catch (error) {
      console.error('Restore error:', error);
      throw error;
    }
  }
}
