import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./landing/landing.page').then((m) => m.LandingPage),
      },
      {
        path: 'quiz',
        loadComponent: () => import('./quiz/quiz.page').then((m) => m.QuizPage),
      },
      {
        path: 'abc',
        loadComponent: () => import('./abc/abc.page').then((m) => m.AbcPage),
      },
      {
        path: 'setting',
        loadComponent: () =>
          import('./settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
];
