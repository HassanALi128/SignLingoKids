import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { IonicModule, ModalController } from '@ionic/angular';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { initializeApp, provideFirebaseApp, getApp } from '@angular/fire/app';
import {
  getAuth,
  provideAuth,
  initializeAuth,
  indexedDBLocalPersistence,
} from '@angular/fire/auth';
import {
  provideAnalytics,
  getAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    importProvidersFrom(IonicModule.forRoot({ mode: 'md' })),
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    ModalController,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      if (Capacitor.isNativePlatform()) {
        return initializeAuth(getApp(), {
          persistence: indexedDBLocalPersistence,
        });
      }
      return getAuth();
    }),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    provideFirestore(() => getFirestore()),
  ],
});
