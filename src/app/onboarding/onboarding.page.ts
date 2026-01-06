import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { UserService } from '../services/user.service';
import { register } from 'swiper/element/bundle';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OnboardingPage {
  currentIndex = 0;

  constructor(private router: Router, private userService: UserService) {
    // Ensure swiper web components are registered once
    try {
      register();
    } catch {}
  }

  goNext(slides: any) {
    slides?.swiper?.slideNext();
  }

  goPrev(slides: any) {
    slides?.swiper?.slidePrev();
  }

  onSlideDidChange(slides: any) {
    const i = slides?.swiper?.activeIndex ?? 0;
    this.currentIndex = i;
  }

  skip() {
    this.finish();
  }

  getStarted() {
    this.finish();
  }

  private async finish() {
    try {
      localStorage.setItem('onboardingCompleted', 'true');
      await this.userService.completeOnboarding();
    } catch (e) {
      // ignore storage errors
    }
    this.router.navigateByUrl('/profile-setup');
  }
}
