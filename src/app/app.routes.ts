import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./splash/splash.page').then((m) => m.SplashPage),
  },
  { path: 'onboarding', loadComponent: () => import('./onboarding/onboarding.page').then(m => m.OnboardingPage) },
  { path: 'landing', loadComponent: () => import('./tabs/landing/landing.page').then(m => m.LandingPage) },
  { path: 'home', loadComponent: () => import('./tabs/home/home.page').then(m => m.HomePage) },
  { path: 'quiz', loadComponent: () => import('./tabs/quiz/quiz.page').then(m => m.QuizPage) },
  { path: 'abc', loadComponent: () => import('./tabs/abc/abc.page').then(m => m.AbcPage) },
  { path: 'settings', loadComponent: () => import('./tabs/settings/settings.page').then(m => m.SettingsPage) },
  { path: 'tabs/premium', loadComponent: () => import('./tabs/premium/premium.page').then(m => m.PremiumPage) },

];
