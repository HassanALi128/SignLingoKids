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
      banner: 'ca-app-pub-4296184061584014/2916209158', // REPLACE: Test banner ID
      interstitial: 'ca-app-pub-4296184061584014/1165919887', // REPLACE: Test interstitial ID
      rewarded: 'ca-app-pub-4296184061584014/4887766375', // REPLACE: Test rewarded ID
      appOpen: 'ca-app-pub-4296184061584014/3029725967', // REPLACE: Test app open ID
    },
    ios: {
      banner: 'ca-app-pub-4296184061584014/2916209158', // Test banner ID
      interstitial: 'ca-app-pub-4296184061584014/1165919887', // Test interstitial ID
      rewarded: 'ca-app-pub-4296184061584014/4887766375', // Test rewarded ID
      appOpen: 'ca-app-pub-4296184061584014/3029725967', // Test app open ID
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
