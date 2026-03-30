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
    // Production mode — real ads served, revenue generated.
    // Each platform requires its OWN ad unit IDs (AdMob console → Ad units).
    // iOS and Android CANNOT share the same ad unit ID.
    initializeForTesting: false,
    android: {
      // TODO: Replace with your Android ad unit IDs from AdMob console
      // AdMob → Apps → SignLingo (Android) → Ad units
      banner: 'ca-app-pub-4296184061584014/2916209158',
      interstitial: 'ca-app-pub-4296184061584014/1165919887',
      rewarded: 'ca-app-pub-4296184061584014/4887766375',
      appOpen: 'ca-app-pub-4296184061584014/3029725967',
    },
    ios: {
      // TODO: Replace with your iOS-specific ad unit IDs from AdMob console
      // AdMob → Apps → SignLingo (iOS) → Ad units (different IDs from Android)
      banner: 'ca-app-pub-4296184061584014/2916209158',
      interstitial: 'ca-app-pub-4296184061584014/1165919887',
      rewarded: 'ca-app-pub-4296184061584014/4887766375',
      appOpen: 'ca-app-pub-4296184061584014/3029725967',
    },
  },
};
