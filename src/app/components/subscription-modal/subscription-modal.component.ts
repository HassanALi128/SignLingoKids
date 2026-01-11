import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { PaywallModalComponent } from '../paywall-modal/paywall-modal.component';

@Component({
  selector: 'app-subscription-modal',
  templateUrl: './subscription-modal.component.html',
  styleUrls: ['./subscription-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class SubscriptionModalComponent implements OnInit {
  constructor(private modalController: ModalController) {}

  ngOnInit() {
    // Present the paywall modal immediately
    this.presentPaywall();
  }

  async presentPaywall() {
    const modal = await this.modalController.create({
      component: PaywallModalComponent,
      cssClass: 'paywall-modal',
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    // Dismiss this modal with the same result
    this.modalController.dismiss(data, role);
  }

  close() {
    this.modalController.dismiss({
      role: 'cancel',
      purchased: false,
    });
  }
}
