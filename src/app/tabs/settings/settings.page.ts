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
} from 'ionicons/icons';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class SettingsPage implements OnInit {
  userName: string = 'User';
  userAvatar: string = '';
  constructor(
    private router: Router,
    private toast: ToastController,
    private alert: AlertController
  ) {
    addIcons({
      'card-outline': cardOutline,
      'refresh-circle-outline': refreshCircleOutline,
      'reload-outline': reloadOutline,
      'document-text-outline': documentTextOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'person-circle-outline': personCircleOutline,
    });
  }
  ngOnInit(): void {
    // Load user profile from localStorage
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        const userData = JSON.parse(profile);
        this.userName = userData.name || 'User';
        this.userAvatar = userData.avatar || '';
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  openPremium() {
    this.router.navigate(['/tabs/premium']);
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
