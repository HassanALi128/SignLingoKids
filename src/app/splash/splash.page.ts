import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
})
export class SplashPage implements OnInit, OnDestroy {
  private navigationTimeoutId: any;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Navigate after 3 seconds
    this.navigationTimeoutId = setTimeout(() => {
      this.navigateToLanding();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.navigationTimeoutId) {
      clearTimeout(this.navigationTimeoutId);
    }
  }

  private navigateToLanding(): void {
    if (this.navigationTimeoutId) {
      clearTimeout(this.navigationTimeoutId);
      this.navigationTimeoutId = null;
    }
    const completed = (() => {
      try {
        return localStorage.getItem('onboardingCompleted') === 'true';
      } catch (e) {
        return true; // if storage not available, skip onboarding
      }
    })();

    if (completed) {
      this.router.navigateByUrl('/tabs/home');
    } else {
      this.router.navigateByUrl('/onboarding');
    }
  }
}
