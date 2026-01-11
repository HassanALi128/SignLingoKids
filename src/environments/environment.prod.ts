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
    apiKeyIOS: 'test_kNqZGrgYazUtarYFFNXglytzQAk',
    apiKeyAndroid: 'test_kNqZGrgYazUtarYFFNXglytzQAk',
    // Entitlement identifier (must match RevenueCat dashboard)
    entitlementId: 'premium',
    // Product identifiers (must match RevenueCat dashboard)
    products: {
      monthly: 'monthly',
      yearly: 'yearly',
    },
  },
};
