import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
})
export class LandingPage {
  constructor(private navController: NavController) {}

  goToHandSign(): void {
    this.navController.navigateForward('/home');
  }

  goToSettings(): void {
    this.navController.navigateForward('/settings');
  }

  goToAbc(): void {
    this.navController.navigateForward('/abc');
  }

  goToQuiz(): void {
    this.navController.navigateForward('/quiz');
  }
}


