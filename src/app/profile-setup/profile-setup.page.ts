import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ProfileService } from '../services/profile.service';
import { UserService } from '../services/user.service';

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

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Check if user already has a profile
    this.profileService.profile$.subscribe((profile) => {
      if (profile) {
        this.userName = (profile.name === 'Guest') ? '' : (profile.name || '');
        if (profile.avatar && this.avatars.includes(profile.avatar)) {
          this.selectedAvatar = profile.avatar;
        } else {
          this.selectedAvatar = this.avatars[0];
        }
      } else {
        this.selectedAvatar = this.avatars[0];
      }
    });
  }

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }

  uploadPhoto() {
    // For now, just log - we'll implement camera functionality later
    console.log('Upload photo clicked');
    // You can implement camera/file picker here
  }

  async saveProfile() {
    if (!this.selectedAvatar) {
      return;
    }

    const finalName = (!this.userName || this.userName.trim() === '') ? 'Guest' : this.userName.trim();

    this.profileService.updateProfile({
      name: finalName,
      avatar: this.selectedAvatar,
      createdAt: new Date().toISOString(),
    });

    // Mark profile as completed
    localStorage.setItem('profileCompleted', 'true');
    await this.userService.completeProfile();

    // Navigate to home/tabs or back to settings if editing
    // We can check if we have a previous route or just default to home
    this.router.navigateByUrl('tabs/home');
  }
}
