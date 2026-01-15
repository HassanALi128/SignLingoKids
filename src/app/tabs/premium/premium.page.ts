import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavController, IonicModule, Platform } from '@ionic/angular';
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
  private backButtonSubscription: any;

  constructor(
    private navCtrl: NavController,
    private monetizationService: MonetizationService,
    private platform: Platform
  ) {
    addIcons({ 'arrow-back': arrowBackOutline });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.backButtonSubscription =
      this.platform.backButton.subscribeWithPriority(10, () => {
        this.goBack();
      });
  }

  ionViewWillLeave() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  goBack() {
    this.navCtrl.navigateBack('/tabs/setting');
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
