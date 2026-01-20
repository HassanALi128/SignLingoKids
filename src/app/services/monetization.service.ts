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
  RewardAdOptions,
  RewardAdPluginEvents,
  AdMobError,
  AdMobBannerSize,
} from '@capacitor-community/admob';
import { PurchasesService } from './purchases.service';
import { UserService } from './user.service';
import {
  PurchasesOfferings,
  PurchasesPackage,
} from '@revenuecat/purchases-typescript-internal-esm';
import { environment } from '../../environments/environment';
import { combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MonetizationService {
  // Placeholder Ad Units - REPLACE WITH REAL UNITS
  // Test IDs provided by Google
  private readonly BANNER_ID_ANDROID = environment.admob.android.banner;
  private readonly BANNER_ID_IOS = environment.admob.ios.banner;
  private readonly INTERSTITIAL_ID_ANDROID =
    environment.admob.android.interstitial;
  private readonly INTERSTITIAL_ID_IOS = environment.admob.ios.interstitial;
  private readonly REWARDED_ID_ANDROID = environment.admob.android.rewarded;
  private readonly REWARDED_ID_IOS = environment.admob.ios.rewarded;

  public isPro = false; // Synced with RevenueCat

  // RevenueCat offerings - exposed for premium page
  public offerings: PurchasesOfferings | null = null;

  constructor(
    private platform: Platform,
    private purchasesService: PurchasesService,
    private userService: UserService
  ) {}

  async init() {
    await this.platform.ready();

    // Initialize RevenueCat first
    await this.purchasesService.init();

    // Combine RevenueCat premium status with test premium toggle
    // User is premium if EITHER RevenueCat says so OR test toggle is ON
    combineLatest([
      this.purchasesService.isPremium$,
      this.userService.userData$,
    ]).subscribe(([revenueCatPremium, userData]) => {
      // Check test premium from localStorage (via UserService)
      const testPremium =
        localStorage.getItem('test_premium_status') === 'true';

      // User is premium if either condition is true
      const wasPremium = this.isPro;
      this.isPro =
        revenueCatPremium || testPremium || (userData?.isPremium ?? false);

      console.log('Premium status updated:', {
        revenueCatPremium,
        testPremium,
        userDataPremium: userData?.isPremium,
        finalStatus: this.isPro,
      });

      // Handle premium state changes
      if (this.isPro && !wasPremium) {
        // User just became premium - hide ads immediately
        console.log('User became premium - hiding ads');
        this.hideBanner();
      } else if (!this.isPro && wasPremium) {
        // User lost premium status - show ads
        console.log('User lost premium - showing ads');
        this.showBanner();
      }
    });

    // Subscribe to offerings
    this.purchasesService.offerings$.subscribe((offerings) => {
      this.offerings = offerings;
    });

    // Initialize AdMob if not premium
    if (!this.isPro) {
      await this.initAdMob();
    }
  }

  // ADMOB
  private async initAdMob() {
    try {
      await AdMob.initialize();

      // Listen for banner load to set height
      // Note: Loaded event does not provide size info in this plugin version
      AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        console.log('Banner loaded');
        // Default to 60px if height is missing (standard adaptive banner height)
        this.setBannerHeight(60);
      });

      // Listen for size changes
      AdMob.addListener(
        BannerAdPluginEvents.SizeChanged,
        (info: AdMobBannerSize) => {
          console.log('Banner size changed:', info);
          const height = info.height || 60;
          this.setBannerHeight(height);
        }
      );

      // Preload Interstitial
      await this.prepareInterstitial();

      // Preload Reward
      await this.prepareReward();

      // Show Banner - REMOVED: Managed by TabsPage
      // this.showBanner();
    } catch (e) {
      console.error('AdMob Init Error:', e);
    }
  }

  private setBannerHeight(height: number) {
    console.log(`Setting global banner height to ${height}px`);
    document.documentElement.style.setProperty(
      '--ad-banner-height',
      `${height}px`
    );
  }

  async showBanner() {
    if (this.isPro) return;

    // Set a default height immediately to start the transition
    // Standard iOS/Android banner height is often roughly 50-60dp.
    // We start with a safe guess to prevent overlap while the real size loads.
    this.setBannerHeight(60);

    const adId = this.platform.is('ios')
      ? this.BANNER_ID_IOS
      : this.BANNER_ID_ANDROID;
    const options: BannerAdOptions = {
      adId: adId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      // offsets if needed?
    };

    try {
      await AdMob.showBanner(options);
    } catch (e) {
      console.error('Show Banner Error:', e);
      // If error, maybe reset height?
      // this.setBannerHeight(0);
    }
  }

  async hideBanner() {
    try {
      await AdMob.hideBanner();
      this.setBannerHeight(0);
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
    }
  }

  async prepareReward() {
    const adId = this.platform.is('ios')
      ? this.REWARDED_ID_IOS
      : this.REWARDED_ID_ANDROID;

    if (!adId || adId.includes('xxx')) {
      console.warn('Rewarded Ad ID not set');
      return;
    }

    const options: RewardAdOptions = {
      adId: adId,
    };

    try {
      await AdMob.prepareRewardVideoAd(options);
    } catch (e) {
      console.error('Prepare Reward Error:', e);
    }
  }

  async showReward(): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        // Register event listener for reward
        const handler = AdMob.addListener(
          RewardAdPluginEvents.Rewarded,
          (rewardItem) => {
            console.log('User rewarded:', rewardItem);
            resolve(true); // User watched and got reward
          }
        );

        // Show the ad
        await AdMob.showRewardVideoAd();
      } catch (e) {
        console.error('Show Reward Error:', e);
        // Try to prepare again for next time
        this.prepareReward();
        resolve(false); // Failed to show or complete
      }
    });
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
