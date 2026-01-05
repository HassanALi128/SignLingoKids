import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmark, close, chevronForward } from 'ionicons/icons';
import { MonetizationService } from '../../services/monetization.service';

@Component({
  selector: 'app-subscription-modal',
  templateUrl: './subscription-modal.component.html',
  styleUrls: ['./subscription-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class SubscriptionModalComponent implements OnInit {
  selectedPlan: 'week' | 'year' = 'year';

  constructor(
    private modalController: ModalController,
    private monetizationService: MonetizationService
  ) {
    addIcons({ checkmark, close, chevronForward });
  }

  ngOnInit() {}

  close() {
    this.modalController.dismiss();
  }

  selectPlan(plan: 'week' | 'year') {
    this.selectedPlan = plan;
  }

  async unlockAccess() {
    const offerings = this.monetizationService.offerings;
    if (!offerings || !offerings.current) {
      console.error('No offerings available');
      return;
    }

    const pkg =
      this.selectedPlan === 'year'
        ? offerings.current.annual
        : offerings.current.weekly;

    if (pkg) {
      try {
        await this.monetizationService.purchasePackage(pkg);
        this.modalController.dismiss({
          role: 'unlock',
          plan: this.selectedPlan,
        });
      } catch (error) {
        console.error('Purchase failed:', error);
        // Optionally show an alert to the user
      }
    } else {
      console.warn('Package not found for plan:', this.selectedPlan);
    }
  }
}
