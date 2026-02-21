export const environment = {
  production: true,
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
    // RevenueCat API Keys - REPLACE WITH PRODUCTION KEYS
    // Get them from: https://app.revenuecat.com/
    apiKeyIOS: 'appl_plOqOhUXEyvDFXdnQclLsoXwbDu',
    apiKeyAndroid: 'test_kNqZGrgYazUtarYFFNXglytzQAk',
    // Entitlement identifier (must match RevenueCat dashboard)
    entitlementId: 'premium',
    // Product identifiers (must match RevenueCat dashboard)
    products: {
      monthly: 'monthly',
      yearly: 'yearly',
    },
  },
  admob: {
    // AdMob Ad Unit IDs - REPLACE WITH PRODUCTION AD UNIT IDs
    // Get them from: https://apps.admob.com/
    android: {
      banner: 'ca-app-pub-4296184061584014/2916209158', // REPLACE: Test banner ID
      interstitial: 'ca-app-pub-4296184061584014/1165919887', // REPLACE: Test interstitial ID
      rewarded: 'ca-app-pub-4296184061584014/4887766375', // REPLACE: Test rewarded ID
      appOpen: 'ca-app-pub-4296184061584014/3029725967', // REPLACE: Test app open ID
    },
    ios: {
      // iOS AdMob Ad Unit IDs - Production values
      banner: 'ca-app-pub-4296184061584014/2916209158', // iOS Banner ad unit
      interstitial: 'ca-app-pub-4296184061584014/1165919887', // iOS Interstitial ad unit
      rewarded: 'ca-app-pub-4296184061584014/4887766375', // iOS Rewarded ad unit
      appOpen: 'ca-app-pub-4296184061584014/3029725967', // iOS App Open ad unit
    },
  },
};
