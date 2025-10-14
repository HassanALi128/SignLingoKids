import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-premium',
  templateUrl: './premium.page.html',
  styleUrls: ['./premium.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class PremiumPage implements OnInit {

  constructor(private navCtrl: NavController) {
    addIcons({ 'arrow-back': arrowBackOutline });
  }

  ngOnInit() {}

  goBack() {
    this.navCtrl.back();
  }

  buyPremium() {
    // In a real app, this would open payment processing
    console.log('Buy Premium clicked');
    // You can add payment logic here
  }
}
