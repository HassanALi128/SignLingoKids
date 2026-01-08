import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { IonicModule, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import {
  cardOutline,
  refreshCircleOutline,
  reloadOutline,
  documentTextOutline,
  chevronForwardOutline,
  personCircleOutline,
  person,
  arrowBack,
  pencil,
  add,
  star,
} from 'ionicons/icons';

import { CommonService } from '../../core/services/common';
import { ProfileService } from '../../services/profile.service';
import { UserService } from '../../services/user.service';
import { ModalController } from '@ionic/angular';
import { PremiumSuccessModalComponent } from '../../components/premium-success-modal/premium-success-modal.component';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../services/quiz';
import { QuizAttemptService } from '../../services/quiz-attempt.service';
import { DeviceService } from '../../services/device.service';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class SettingsPage implements OnInit {
  userName: string = 'User';
  userAvatar: string = '';
  showEditModal = false;
  editName = '';
  editAvatar = '';
  isPremium = false;
  private backButtonSubscription?: Subscription;

  avatars: string[] = [
    'assets/images/avaters/blode.webp',
    'assets/images/avaters/cap.webp',
    'assets/images/avaters/cold.webp',
    'assets/images/avaters/girl.webp',
    'assets/images/avaters/listner.webp',
    'assets/images/avaters/muslim.webp',
    'assets/images/avaters/ninja.webp',
    'assets/images/avaters/nurse.webp',
    'assets/images/avaters/singer.webp',
    'assets/images/avaters/teenager.webp',
  ];

  constructor(
    private router: Router,
    public profileService: ProfileService,
    private commonService: CommonService,
    private modalController: ModalController,
    private platform: Platform,
    private quizService: QuizService,
    private userService: UserService,
    private quizAttemptService: QuizAttemptService,
    private deviceService: DeviceService,
    private progressService: ProgressService,
    private alertController: AlertController
  ) {
    addIcons({
      'card-outline': cardOutline,
      'refresh-circle-outline': refreshCircleOutline,
      'reload-outline': reloadOutline,
      'document-text-outline': documentTextOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'person-circle-outline': personCircleOutline,
      person,
      'arrow-back': arrowBack,
      pencil,
      add,
      star,
    });
  }
  ngOnInit(): void {
    this.profileService.profile$.subscribe((profile) => {
      if (profile) {
        this.userName = profile.name;
        this.userAvatar = profile.avatar;
        this.isPremium = profile.isPremium || false;
      }
    });
  }

  ionViewDidEnter() {
    this.backButtonSubscription =
      this.platform.backButton.subscribeWithPriority(10, () => {
        this.router.navigate(['/tabs/home']);
      });
  }

  ionViewWillLeave() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  openPremium() {
    this.router.navigate(['/tabs/premium']);
  }

  editProfile() {
    const profile = this.profileService.getProfile();
    if (profile) {
      this.editName = profile.name;
      this.editAvatar = profile.avatar;
    }
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  selectAvatar(avatar: string) {
    this.editAvatar = avatar;
  }

  async saveProfile() {
    if (!this.editName || !this.editAvatar) return;

    if (this.editName.length > 10) {
      this.commonService.messageWithToast(
        'Name cannot exceed 10 characters',
        2000,
        'warning',
        'bottom'
      );
      return;
    }

    this.profileService.updateProfile({
      name: this.editName,
      avatar: this.editAvatar,
    });

    this.showEditModal = false;
    this.commonService.messageWithToast(
      'Profile updated successfully!',
      2000,
      'success',
      'bottom'
    );
  }

  async restorePurchase() {
    this.commonService.messageWithToast(
      'Checking for previous purchases...',
      2000,
      'primary',
      'bottom'
    );
  }

  async restoreProgress() {
    const alert = await this.alertController.create({
      header: 'Reset Your Progress?',
      message:
        'This will clear all your learning progress and quiz history. You can start fresh anytime.',
      cssClass: 'kids-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'cancel-button',
          handler: () => {
            console.log('Reset cancelled');
          },
        },
        {
          text: 'Reset',
          role: 'destructive',
          cssClass: 'reset-button',
          handler: async () => {
            try {
              await this.commonService.showLoadingSpinner(
                'Resetting progress...'
              );
              await Promise.all([
                this.progressService.resetProgress(),
                this.quizService.resetQuizData(),
              ]);

              this.commonService.messageWithToast(
                'Progress reset successfully ✨',
                2000,
                'success',
                'bottom'
              );
            } catch (error) {
              console.error('Error resetting progress:', error);
              this.commonService.messageWithToast(
                'Failed to reset progress. Please try again.',
                2000,
                'danger',
                'bottom'
              );
            } finally {
              await this.commonService.hideLoadingSpinner();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async openPrivacyPolicy() {
    this.commonService.alertMessage(
      'Privacy Policy',
      'Visit www.handhero3d.com/privacy'
    );
  }

  async togglePremium() {
    const newStatus = !this.isPremium;
    this.userService.toggleTestPremium(newStatus);

    if (newStatus) {
      const modal = await this.modalController.create({
        component: PremiumSuccessModalComponent,
        breakpoints: [0, 1],
        initialBreakpoint: 1,
        cssClass: 'premium-success-modal',
      });
      await modal.present();
    }

    this.commonService.messageWithToast(
      `Premium Mode: ${newStatus ? 'Enabled' : 'Disabled'}`,
      2000,
      newStatus ? 'success' : 'warning',
      'bottom'
    );
  }
}
