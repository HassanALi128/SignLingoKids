import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs/home',
    pathMatch: 'full',
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
    path: 'favorites-view-all',
    loadComponent: () =>
      import('./pages/favorites-view-all/favorites-view-all.page').then(
        (m) => m.FavoritesViewAllPage
      ),
  },
  {
    path: 'quiz-progress-view-all',
    loadComponent: () =>
      import('./pages/quiz-progress-view-all/quiz-progress-view-all.page').then(
        (m) => m.QuizProgressViewAllPage
      ),
  },
];
