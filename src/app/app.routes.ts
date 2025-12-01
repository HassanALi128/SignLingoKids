import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },

  {
    path: 'tabs/premium',
    loadComponent: () =>
      import('./tabs/premium/premium.page').then((m) => m.PremiumPage),
  },
  {
    path: 'profile-setup',
    loadComponent: () =>
      import('./profile-setup/profile-setup.page').then(
        (m) => m.ProfileSetupPage
      ),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./tabs/home/home.page').then((m) => m.HomePage),
  },
];
