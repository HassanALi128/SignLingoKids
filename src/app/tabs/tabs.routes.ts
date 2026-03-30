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
        path: 'abc',
        loadComponent: () => import('./abc/abc.page').then((m) => m.AbcPage),
      },
      {
        path: 'quiz',
        loadComponent: () => import('./quiz/quiz.page').then((m) => m.QuizPage),
      },
      {
        path: 'quiz/quiz-questions',
        loadComponent: () =>
          import('./quiz/quiz-questions/quiz-questions.page').then(
            (m) => m.QuizQuestionsPage
          ),
      },
      {
        path: 'setting',
        loadComponent: () =>
          import('./settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'premium',
        loadComponent: () =>
          import('./premium/premium.page').then((m) => m.PremiumPage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
];
