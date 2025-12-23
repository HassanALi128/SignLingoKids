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
} from 'ionicons/icons';

import { ProfileService, UserProfile } from '../../services/profile.service';
import { FormsModule } from '@angular/forms';

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
    private toast: ToastController,
    private alert: AlertController,
    public profileService: ProfileService
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
    });
  }
  ngOnInit(): void {
    this.profileService.profile$.subscribe((profile) => {
      if (profile) {
        this.userName = profile.name;
        this.userAvatar = profile.avatar;
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

    const t = await this.toast.create({
      message: 'Profile updated successfully!',
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    t.present();
  }

  async restorePurchase() {
    const t = await this.toast.create({
      message: 'Checking for previous purchases...',
      duration: 2000,
      position: 'bottom',
    });
    t.present();
  }

  async restoreProgress() {
    const t = await this.toast.create({
      message: 'Restoring your progress...',
      duration: 2000,
      position: 'bottom',
    });
    t.present();
  }

  async openPrivacyPolicy() {
    const a = await this.alert.create({
      header: 'Privacy Policy',
      message: 'Visit www.signlingokids.com/privacy',
      buttons: ['OK'],
    });
    a.present();
  }
}
