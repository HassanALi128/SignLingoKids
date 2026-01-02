import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
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
import {
  Purchases,
  PurchasesOfferings,
  PurchasesPackage,
} from '@awesome-cordova-plugins/purchases';

@Injectable({
  providedIn: 'root',
})
export class MonetizationService {
  // Placeholder keys - REPLACE WITH REAL KEYS
  private readonly REVENUECAT_API_KEY_IOS = 'appl_...';
  private readonly REVENUECAT_API_KEY_ANDROID = 'goog_...';

  // Placeholder Ad Units - REPLACE WITH REAL UNITS
  // Test IDs provided by Google
  private readonly BANNER_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
  private readonly BANNER_ID_IOS = 'ca-app-pub-3940256099942544/2934735716';
  private readonly INTERSTITIAL_ID_ANDROID =
    'ca-app-pub-3940256099942544/1033173712';
  private readonly INTERSTITIAL_ID_IOS =
    'ca-app-pub-3940256099942544/4411468910';

  public isPro = false;
  public offerings: PurchasesOfferings | null = null;

  constructor(private platform: Platform) {}

  async init() {
    await this.platform.ready();

    // 1. Initialize RevenueCat
    await this.initRevenueCat();

    // 2. Initialize AdMob
    if (!this.isPro) {
      await this.initAdMob();
    }
  }

  // REVENUECAT
  private async initRevenueCat() {
    try {
      if (this.platform.is('ios')) {
        await Purchases.configure(this.REVENUECAT_API_KEY_IOS);
      } else if (this.platform.is('android')) {
        await Purchases.configure(this.REVENUECAT_API_KEY_ANDROID);
      }

      const info = await Purchases.getCustomerInfo();
      this.checkEntitlement(info);

      this.offerings = await Purchases.getOfferings();
    } catch (e) {
      console.error('RevenueCat Init Error:', e);
    }
  }

  private checkEntitlement(info: any) {
    if (info?.entitlements?.all?.['pro_access']?.active) {
      this.isPro = true;
      this.hideBanner(); // Hide ads if they become pro
    } else {
      this.isPro = false;
    }
    console.log('User is Pro:', this.isPro);
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      this.checkEntitlement(customerInfo);
      return this.isPro;
    } catch (e: any) {
      if (e.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        console.error('Purchase error:', e);
      }
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const info = await Purchases.restorePurchases();
      this.checkEntitlement(info);
      return this.isPro;
    } catch (e) {
      console.error('Restore error:', e);
      return false;
    }
  }

  // ADMOB
  private async initAdMob() {
    try {
      await AdMob.initialize();

      // Preload Interstitial
      await this.prepareInterstitial();

      // Show Banner
      this.showBanner();
    } catch (e) {
      console.error('AdMob Init Error:', e);
    }
  }

  async showBanner() {
    if (this.isPro) return;

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
      await AdMob.showBanner(options);
    } catch (e) {
      console.error('Show Banner Error:', e);
    }
  }

  async hideBanner() {
    try {
      await AdMob.hideBanner();
    } catch (e) {
      // ignore
    }
  }

  async prepareInterstitial() {
    if (this.isPro) return;

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
    if (this.isPro) return;

    try {
      // Check if ready, if not prepare
      await AdMob.showInterstitial();
    } catch (e) {
      console.error('Show Interstitial Error, trying to prepare again:', e);
      await this.prepareInterstitial();
    }
  }
}
