// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyDdu6umv4D6ScD8qoIoln_5T8P-Kag_KDY',
    authDomain: 'hand-hero-3d-asl.firebaseapp.com',
    projectId: 'hand-hero-3d-asl',
    storageBucket: 'hand-hero-3d-asl.firebasestorage.app',
    messagingSenderId: '710376628790',
    appId: '1:710376628790:web:c6139f2f7b7b2e18052e97',
    measurementId: 'G-LX6WH15GES',
  },
  revenuecat: {
    // RevenueCat API Keys
    // Using test key for both platforms during development
    // apiKeyIOS: 'test_kNqZGrgYazUtarYFFNXglytzQAk',
    apiKeyIOS: 'appl_plOqOhUXEyvDFXdnQclLsoXwbDu',
    apiKeyAndroid: 'test_kNqZGrgYazUtarYFFNXglytzQAk',
    // Entitlement identifier (must match RevenueCat dashboard)
    entitlementId: 'premium',
    // Product identifiers (MUST MATCH App Store Connect & RevenueCat exactly!)
    products: {
      monthly: 'premium_monthly_19.99',
      yearly: 'premium_anual',
    },
  },
  admob: {
    // AdMob Ad Unit IDs
    // Using Google's test ad unit IDs for development
    android: {
      banner: 'ca-app-pub-3940256099942544/6300978111', // Test banner ID
      interstitial: 'ca-app-pub-3940256099942544/1033173712', // Test interstitial ID
      rewarded: 'ca-app-pub-3940256099942544/5224354917', // Test rewarded ID
    },
    ios: {
      banner: 'ca-app-pub-3940256099942544/2934735716', // Test banner ID
      interstitial: 'ca-app-pub-3940256099942544/4411468910', // Test interstitial ID
      rewarded: 'ca-app-pub-3940256099942544/1712485313', // Test rewarded ID
    },
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
