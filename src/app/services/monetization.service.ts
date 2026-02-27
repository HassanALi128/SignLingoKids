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
  MaxAdContentRating,
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

  // Track AdMob initialization status
  private adMobInitialized = false;
  private isInitializingAdMob = false;
  private adMobInitPromise: Promise<void>;

  constructor(
    private platform: Platform,
    private purchasesService: PurchasesService,
    private userService: UserService
  ) {
    // Create an indefinite promise that we resolve when init is done
    this.adMobInitPromise = new Promise<void>((resolve) => {
      // Small timeout to allow init to complete later
      const checkInterval = setInterval(() => {
        if (this.adMobInitialized) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }

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

  // ─── PAYWALL AD FREEZE ────────────────────────────────────────────────────
  // Set to true while any paywall/subscription modal is open so ads never
  // fire mid-purchase — Apple will reject if an ad overlaps subscription terms.
  private paywallActive = false;

  /** Call this before opening any subscription paywall or RevenueCat modal */
  freezeAdsForPaywall() {
    this.paywallActive = true;
    this.hideBanner();
    console.log('[AdMob] Ads frozen — paywall is active');
  }

  /** Call this after the paywall/subscription modal is dismissed */
  unfreezeAdsForPaywall() {
    this.paywallActive = false;
    if (!this.isPro) {
      this.showBanner();
    }
    console.log('[AdMob] Ads unfrozen — paywall dismissed');
  }

  // ADMOB
  private async initAdMob() {
    if (this.adMobInitialized || this.isInitializingAdMob) return;
    this.isInitializingAdMob = true;
    try {
      // ── COPPA / CHILD-DIRECTED TREATMENT ─────────────────────────────────
      // tagForChildDirectedTreatment: true  → tells Google this app targets kids;
      //   AdMob will ONLY serve child-safe ads (no behavioural targeting, no personalization).
      // maxAdContentRating: 'G'             → restricts all ad creatives to G-rated content only.
      // tagForUnderAgeOfConsent: true       → applies EU GDPR child-protection rules globally.
      // Without these flags, Google can ban the AdMob account for serving inappropriate
      // ads to minors and Apple will reject the app for COPPA non-compliance.
      await AdMob.initialize({
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
        maxAdContentRating: MaxAdContentRating.General,
        initializeForTesting: false, // set true only during local dev
      });
      this.adMobInitialized = true; // Mark as ready

      // Listen for size changes — only apply height when banner actually loaded
      // When an ad fails, this event fires with width=0, height=0; we must set 0
      // not fallback to 60, otherwise a blank 60px gap appears below content.
      AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        // Height will be set correctly by the SizeChanged event below
      });

      AdMob.addListener(
        BannerAdPluginEvents.SizeChanged,
        (info: AdMobBannerSize) => {
          if (info.width > 0 && info.height > 0) {
            this.setBannerHeight(info.height);
          } else {
            // Ad failed or was hidden — collapse the reserved space
            this.setBannerHeight(0);
          }
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
    } finally {
      this.isInitializingAdMob = false;
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
    // Never show an ad while a paywall/subscription screen is active.
    if (this.paywallActive) return;

    // Wait for initialization before engaging plugin
    if (!this.adMobInitialized) {
      console.log('AdMob not initialized yet, waiting...');

      if (!this.isInitializingAdMob) {
        this.initAdMob();
      }

      // Race a 5s timeout vs the actual init
      await Promise.race([
        this.adMobInitPromise,
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);

      if (!this.adMobInitialized) {
        console.warn('AdMob failed to init in time, skipping banner show');
        return;
      }
    }

    // Do NOT pre-set height here — the SizeChanged listener will set the
    // correct height once the ad actually loads. Pre-setting 60 caused a blank
    // gap whenever the ad failed to fill.

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
      if (this.adMobInitialized) {
        await AdMob.hideBanner();
        this.setBannerHeight(0);
      }
    } catch (e) {
      // ignore
    }
  }

  async prepareInterstitial() {
    if (this.isPro) return;

    // Wait for initialization
    if (!this.adMobInitialized) return;

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
    if (!this.adMobInitialized) return;

    try {
      // Check if ready, if not prepare
      await AdMob.showInterstitial();
    } catch (e) {
      console.error('Show Interstitial Error, trying to prepare again:', e);
    }
  }

  async prepareReward() {
    if (!this.adMobInitialized) return;

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
