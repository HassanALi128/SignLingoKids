import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-profile-setup',
  templateUrl: './profile-setup.page.html',
  styleUrls: ['./profile-setup.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ProfileSetupPage implements OnInit {
  userName: string = '';
  selectedAvatar: string = '';

  // Avatar options - using colored circles as placeholders
  // User can replace these with actual avatar images later
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

  constructor(private router: Router, private profileService: ProfileService) {}

  ngOnInit() {
    // Check if user already has a profile
    const existingProfile = this.getStoredProfile();
    if (existingProfile) {
      this.userName = existingProfile.name || '';
      this.selectedAvatar = existingProfile.avatar || '';
    }
  }

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }

  uploadPhoto() {
    // For now, just log - we'll implement camera functionality later
    console.log('Upload photo clicked');
    // You can implement camera/file picker here
  }

  saveProfile() {
    if (!this.userName || !this.selectedAvatar) {
      return;
    }

    this.profileService.updateProfile({
      name: this.userName,
      avatar: this.selectedAvatar,
      createdAt: new Date().toISOString(),
    });

    // Navigate to home/tabs or back to settings if editing
    const isEditing = localStorage.getItem('profileSetupCompleted') === 'true';
    if (isEditing) {
      this.router.navigateByUrl('tabs/settings');
    } else {
      localStorage.setItem('profileSetupCompleted', 'true');
      this.router.navigateByUrl('tabs/home');
    }
  }

  private getStoredProfile(): any {
    try {
      const profile = localStorage.getItem('userProfile');
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      return null;
    }
  }
}
