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
  starOutline,
  personOutline,
  bugOutline,
} from 'ionicons/icons';

import { CommonService } from '../../core/services/common';
import { ProfileService } from '../../services/profile.service';
import { UserService } from '../../services/user.service';
import { ModalController, NavController } from '@ionic/angular';
import { PremiumSuccessModalComponent } from '../../components/premium-success-modal/premium-success-modal.component';
import { CustomerCenterModalComponent } from '../../components/customer-center-modal/customer-center-modal.component';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../services/quiz';
import { QuizAttemptService } from '../../services/quiz-attempt.service';
import { DeviceService } from '../../services/device.service';
import { ProgressService } from '../../services/progress.service';
import { PurchasesService } from '../../services/purchases.service';
import { SubscriptionService } from '../../services/subscription.service';
// import { CrashlyticsService } from '../../services/crashlytics.service';
import { Browser } from '@capacitor/browser';

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

  // Subscription packages
  packages: any[] = [];
  isLoadingPackages = false;
  packagesError: string | null = null;

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
    private navCtrl: NavController,
    private platform: Platform,
    private quizService: QuizService,
    private userService: UserService,
    private quizAttemptService: QuizAttemptService,
    private deviceService: DeviceService,
    private progressService: ProgressService,
    private alertController: AlertController,
    private purchasesService: PurchasesService,
    private subscriptionService: SubscriptionService // private crashlyticsService: CrashlyticsService
  ) {
    addIcons({
      'card-outline': cardOutline,
      'refresh-circle-outline': refreshCircleOutline,
      'reload-outline': reloadOutline,
      'document-text-outline': documentTextOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'person-circle-outline': personCircleOutline,
      personOutline,
      'arrow-back': arrowBack,
      pencil,
      add,
      starOutline,
      'bug-outline': bugOutline,
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

    // Load subscription packages
    this.loadSubscriptionPackages();
  }

  async loadSubscriptionPackages() {
    try {
      this.isLoadingPackages = true;
      this.packagesError = null;

      // Get offerings from PurchasesService
      let offerings = this.purchasesService.getOfferings();

      if (!offerings || !offerings.current) {
        // Fetch fresh offerings if not cached
        offerings = await this.purchasesService.fetchOfferings();
      }

      if (
        offerings &&
        offerings.current &&
        offerings.current.availablePackages.length > 0
      ) {
        this.packages = offerings.current.availablePackages;
        console.log('✅ Loaded subscription packages:', this.packages.length);
      } else {
        this.packagesError = 'No subscription plans available';
      }
    } catch (error: any) {
      console.error('❌ Error loading packages:', error);
      this.packagesError = 'Failed to load subscription plans';
    } finally {
      this.isLoadingPackages = false;
    }
  }

  getPackageDisplayName(pkg: any): string {
    if (pkg.packageType === 'ANNUAL') return 'Annual Plan';
    if (pkg.packageType === 'MONTHLY') return 'Monthly Plan';
    if (pkg.packageType === 'WEEKLY') return 'Weekly Plan';

    const identifier = pkg.identifier?.toLowerCase() || '';
    if (identifier.includes('weekly') || identifier.includes('week'))
      return 'Weekly Plan';
    if (
      identifier.includes('annual') ||
      identifier.includes('yearly') ||
      identifier.includes('year')
    )
      return 'Annual Plan';
    if (identifier.includes('monthly') || identifier.includes('month'))
      return 'Monthly Plan';

    return pkg?.product?.title || 'Premium Plan';
  }

  getPackagePeriod(pkg: any): string {
    if (pkg.packageType === 'ANNUAL') return 'per year';
    if (pkg.packageType === 'MONTHLY') return 'per month';
    if (pkg.packageType === 'WEEKLY') return 'per week';

    const identifier = pkg.identifier?.toLowerCase() || '';
    if (identifier.includes('weekly') || identifier.includes('week'))
      return 'per week';
    if (
      identifier.includes('annual') ||
      identifier.includes('yearly') ||
      identifier.includes('year')
    )
      return 'per year';
    if (identifier.includes('monthly') || identifier.includes('month'))
      return 'per month';

    return '';
  }

  openPremium() {
    this.navCtrl.navigateForward('/tabs/premium');
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
        'top'
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
      'top'
    );
  }

  async restorePurchase() {
    await this.commonService.showLoadingSpinner('Restoring purchases...');

    try {
      const customerInfo = await this.purchasesService.restorePurchases();
      await this.commonService.hideLoadingSpinner();

      if (customerInfo && this.purchasesService.hasProEntitlement()) {
        // Sync premium status
        await this.userService.syncPremiumStatusFromRevenueCat();

        this.commonService.messageWithToast(
          'Purchases restored successfully!',
          2000,
          'success',
          'top'
        );
      } else {
        this.commonService.messageWithToast(
          'No previous purchases found.',
          2000,
          'primary',
          'top'
        );
      }
    } catch (error) {
      await this.commonService.hideLoadingSpinner();
      console.error('Restore purchases error:', error);
      this.commonService.messageWithToast(
        'Failed to restore purchases. Please try again.',
        2000,
        'danger',
        'top'
      );
    }
  }

  async openCustomerCenter() {
    const modal = await this.modalController.create({
      component: CustomerCenterModalComponent,
      cssClass: 'customer-center-modal',
    });
    await modal.present();
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
                'top'
              );
            } catch (error) {
              console.error('Error resetting progress:', error);
              this.commonService.messageWithToast(
                'Failed to reset progress. Please try again.',
                2000,
                'danger',
                'top'
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
    await Browser.open({
      url: 'https://veldorastudio.com/legal/hand-hero-privacy',
    });
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
      'top'
    );
  }

  async testCrash() {
    const alert = await this.alertController.create({
      header: 'Force Crash?',
      message:
        'This will crash the app immediately to test Firebase Crashlytics. Are you sure?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Crash It!',
          role: 'destructive',
          handler: () => {
            // this.crashlyticsService.crash();
          },
        },
      ],
    });
    await alert.present();
  }
}
