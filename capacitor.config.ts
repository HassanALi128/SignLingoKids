import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'SignLingoKids',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,

    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    EdgeToEdge: {
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#ffffffff',
    },
  }
}

export default config;
