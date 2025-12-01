import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

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
    'assets/images/b.svg',
    'data:image/svg+xml;base64,' +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#4ECDC4"/><text x="50" y="62" font-size="35" font-weight="bold" text-anchor="middle" fill="white">L</text></svg>'
      ),
    'data:image/svg+xml;base64,' +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#FFD93D"/><text x="50" y="62" font-size="35" font-weight="bold" text-anchor="middle" fill="white">B</text></svg>'
      ),
    'data:image/svg+xml;base64,' +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#6BCB77"/><text x="50" y="62" font-size="35" font-weight="bold" text-anchor="middle" fill="white">F</text></svg>'
      ),
    'data:image/svg+xml;base64,' +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#9B59B6"/><text x="50" y="62" font-size="35" font-weight="bold" text-anchor="middle" fill="white">U</text></svg>'
      ),
    'data:image/svg+xml;base64,' +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#FF6B6B"/><text x="50" y="62" font-size="35" font-weight="bold" text-anchor="middle" fill="white">R</text></svg>'
      ),
    'data:image/svg+xml;base64,' +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#4D96FF"/><text x="50" y="62" font-size="35" font-weight="bold" text-anchor="middle" fill="white">P</text></svg>'
      ),
    'data:image/svg+xml;base64,' +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#FFA07A"/><text x="50" y="62" font-size="35" font-weight="bold" text-anchor="middle" fill="white">C</text></svg>'
      ),
  ];

  constructor(private router: Router) {}

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

    const profile = {
      name: this.userName,
      avatar: this.selectedAvatar,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile));
      localStorage.setItem('profileSetupCompleted', 'true');
    } catch (error) {
      console.error('Error saving profile:', error);
    }

    // Navigate to home/tabs
    this.router.navigateByUrl('tabs/home');
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
