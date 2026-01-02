import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { MonetizationService } from '../../services/monetization.service';

@Component({
  selector: 'app-premium',
  templateUrl: './premium.page.html',
  styleUrls: ['./premium.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class PremiumPage implements OnInit {
  constructor(
    private navCtrl: NavController,
    private monetizationService: MonetizationService
  ) {
    addIcons({ 'arrow-back': arrowBackOutline });
  }

  ngOnInit() {}

  goBack() {
    this.navCtrl.back();
  }

  async buyPremium() {
    const offerings = this.monetizationService.offerings;
    if (offerings?.current?.annual) {
      await this.monetizationService.purchasePackage(offerings.current.annual);
    } else {
      console.warn('No annual package available');
    }
  }
}
