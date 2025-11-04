import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonBadge,
  ToastController,
  AlertController, IonButtons } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  personCircleOutline,
  logoGoogle,
  checkmarkCircle,
  volumeHighOutline,
  notificationsOutline,
  moonOutline,
  starOutline,
  shieldCheckmarkOutline,
  documentTextOutline,
  helpCircleOutline,
  informationCircleOutline,
  chevronForwardOutline,
  cardOutline,
  refreshCircleOutline,
  timeOutline,
  arrowBackOutline,
  homeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,

    CommonModule,
    FormsModule
  ]
})
export class SettingsPage implements OnInit {
  // User authentication state
  isLoggedIn: boolean = false;
  userName: string = '';
  userEmail: string = '';
  userProfileImage: string = '';
  isPremium: boolean = false;

  // App settings
  soundEnabled: boolean = true;
  notificationsEnabled: boolean = true;
  darkModeEnabled: boolean = false;

  constructor(
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router
  ) {
    // Add Ionic icons
    addIcons({
      'logo-google': logoGoogle,
      'log-out': logOutOutline,
      'person-circle': personCircleOutline,
      'checkmark-circle': checkmarkCircle,
      'volume-high': volumeHighOutline,
      'notifications': notificationsOutline,
      'moon': moonOutline,
      'star': starOutline,
      'shield-checkmark': shieldCheckmarkOutline,
      'document-text': documentTextOutline,
      'help-circle': helpCircleOutline,
      'information-circle': informationCircleOutline,
      'chevron-forward': chevronForwardOutline,
      'card': cardOutline,
      'refresh-circle': refreshCircleOutline,
      'time': timeOutline,
      'arrow-back': arrowBackOutline,
      'home': homeOutline
    });
  }

  ngOnInit() {
    // Load user settings from storage
    this.loadSettings();
  }

  goBack() {
    this.router.navigate(['/landing']);
  }

  // Load saved settings
  loadSettings() {
    // In a real app, you would load these from a storage service
    // For demo purposes, we'll just use default values
    this.soundEnabled = true;
    this.notificationsEnabled = true;
    this.darkModeEnabled = false;
  }

  // Login with Google
  async loginWithGoogle() {
    // In a real app, implement Google authentication
    // For demo purposes, we'll simulate a successful login

    try {
      // Show loading toast
      const toast = await this.toastController.create({
        message: 'Logging in...',
        duration: 1500,
        position: 'bottom'
      });
      await toast.present();

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Set user data
      this.isLoggedIn = true;
      this.userName = 'Demo User';
      this.userEmail = 'demo@signlingokids.com';
      // Default user is not premium
      this.isPremium = false;

      // Success message
      const successToast = await this.toastController.create({
        message: 'Successfully logged in!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await successToast.present();

    } catch (error) {
      // Error handling
      const errorToast = await this.toastController.create({
        message: 'Login failed. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await errorToast.present();
    }
  }

  // Logout
  async logout() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: async () => {
            // Reset user data
            this.isLoggedIn = false;
            this.userName = '';
            this.userEmail = '';
            this.userProfileImage = '';
            this.isPremium = false;

            // Show confirmation
            const toast = await this.toastController.create({
              message: 'You have been logged out',
              duration: 2000,
              position: 'bottom'
            });
            await toast.present();
          }
        }
      ]
    });

    await alert.present();
  }

  // Upgrade to premium
  async upgradeToPremium() {
    if (!this.isLoggedIn) {
      // Prompt to login first
      const toast = await this.toastController.create({
        message: 'Please login first to upgrade to premium',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // In a real app, this would open payment processing
    // For demo, we'll simulate successful upgrade
    const alert = await this.alertController.create({
      header: 'Upgrade to Premium',
      message: 'Get access to 200+ signs, ad-free experience, and more for just $4.99/month',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Purchase',
          handler: async () => {
            // Show loading
            const loadingToast = await this.toastController.create({
              message: 'Processing payment...',
              duration: 1500,
              position: 'bottom'
            });
            await loadingToast.present();

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Update premium status
            this.isPremium = true;

            // Success message
            const successToast = await this.toastController.create({
              message: 'Welcome to Premium! Enjoy all features.',
              duration: 2500,
              position: 'bottom',
              color: 'success'
            });
            await successToast.present();
          }
        }
      ]
    });

    await alert.present();
  }

  // Toggle sound settings
  toggleSound() {
    // In a real app, you would save this setting to storage
    console.log('Sound toggled:', this.soundEnabled);
  }

  // Toggle notifications
  toggleNotifications() {
    // In a real app, you would handle notification permissions
    console.log('Notifications toggled:', this.notificationsEnabled);
  }

  // Toggle dark mode
  toggleDarkMode() {
    // In a real app, you would apply theme changes
    document.body.classList.toggle('dark', this.darkModeEnabled);
    console.log('Dark mode toggled:', this.darkModeEnabled);
  }

  // Open pages like privacy policy, terms
  openPage(page: string) {
    // In a real app, navigate to the appropriate page
    console.log('Opening page:', page);
  }

  // Contact support
  async contactSupport() {
    const alert = await this.alertController.create({
      header: 'Contact Support',
      message: 'Send us an email at support@signlingokids.com',
      buttons: ['OK']
    });

    await alert.present();
  }

  // New methods for the simplified settings
  async openPremium() {
    this.router.navigate(['/tabs/premium']);
  }

  async restorePurchase() {
    const toast = await this.toastController.create({
      message: 'Checking for previous purchases...',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async restoreProgress() {
    const toast = await this.toastController.create({
      message: 'Restoring your progress...',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async openPrivacyPolicy() {
    const alert = await this.alertController.create({
      header: 'Privacy Policy',
      message: 'Our privacy policy can be found at www.signlingokids.com/privacy',
      buttons: ['OK']
    });
    await alert.present();
  }
}
