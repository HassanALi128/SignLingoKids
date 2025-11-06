import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  @ViewChild('videoRef', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  private navigationTimeoutId: any;
  showSkip = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Fallback: ensure we navigate even if video fails to play
    this.navigationTimeoutId = setTimeout(() => {
      this.navigateToLanding();
    }, 8000);

    // Show skip after a short delay
    setTimeout(() => {
      this.showSkip = true;
    }, 1800);
  }

  ngOnDestroy(): void {
    if (this.navigationTimeoutId) {
      clearTimeout(this.navigationTimeoutId);
    }
  }

  onEnded(): void {
    this.navigateToLanding();
  }

  onCanPlay(): void {
    const video = this.videoRef.nativeElement;
    // Try play in case autoplay was blocked
    video.play().catch(() => {
      // If autoplay blocked, still proceed shortly
      setTimeout(() => this.navigateToLanding(), 1500);
    });
  }

  onError(): void {
    this.navigateToLanding();
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
      this.router.navigateByUrl('/landing');
    } else {
      this.router.navigateByUrl('/onboarding');
    }
  }

  skip(): void {
    this.navigateToLanding();
  }
}


