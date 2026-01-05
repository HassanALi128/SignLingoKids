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
    // REPLACE THESE WITH YOUR ACTUAL REVENUECAT API KEYS
    // Get them from: https://app.revenuecat.com/
    apiKeyIOS: 'YOUR_IOS_API_KEY_HERE',
    apiKeyAndroid: 'YOUR_ANDROID_API_KEY_HERE',
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
