import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { IonicModule } from '@ionic/angular';
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
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../services/quiz';

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
    private quizService: QuizService
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
    this.commonService.messageWithToast(
      'Restoring your progress...',
      2000,
      'primary',
      'bottom'
    );
  }

  async openPrivacyPolicy() {
    this.commonService.alertMessage(
      'Privacy Policy',
      'Visit www.signlingokids.com/privacy'
    );
  }

  togglePremium() {
    const currentProfile = this.profileService.getProfile();
    if (currentProfile) {
      const newStatus = !currentProfile.isPremium;
      this.profileService.updateProfile({
        ...currentProfile,
        isPremium: newStatus,
      });
      this.quizService.refreshPremiumStatus();
      this.commonService.messageWithToast(
        `Premium Mode: ${newStatus ? 'Enabled' : 'Disabled'}`,
        2000,
        newStatus ? 'success' : 'warning',
        'bottom'
      );
    }
  }
}
