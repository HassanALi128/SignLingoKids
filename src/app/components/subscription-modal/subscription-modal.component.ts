import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmark, close, chevronForward } from 'ionicons/icons';

@Component({
  selector: 'app-subscription-modal',
  templateUrl: './subscription-modal.component.html',
  styleUrls: ['./subscription-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class SubscriptionModalComponent implements OnInit {
  selectedPlan: 'week' | 'year' = 'year';

  constructor(private modalController: ModalController) {
    addIcons({ checkmark, close, chevronForward });
  }

  ngOnInit() {}

  close() {
    this.modalController.dismiss();
  }

  selectPlan(plan: 'week' | 'year') {
    this.selectedPlan = plan;
  }

  unlockAccess() {
    this.modalController.dismiss({
      role: 'unlock',
      plan: this.selectedPlan,
    });
  }
}
