import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

export interface AlertConfig {
  header: string;
  message: string;
  type?: 'info' | 'confirm' | 'warning' | 'success' | 'exit';
  image?: string; // Optional image URL
  icon?: string; // Optional icon name
  primaryButtonText?: string;
  secondaryButtonText?: string;
  primaryButtonColor?: string; // default: primary
}

@Component({
  selector: 'app-custom-alert',
  templateUrl: './custom-alert.component.html',
  styleUrls: ['./custom-alert.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class CustomAlertComponent implements OnInit {
  @Input() config!: AlertConfig;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    if (!this.config) {
      this.config = {
        header: 'Alert',
        message: '',
        type: 'info',
        primaryButtonText: 'OK',
      };
    }
  }

  onPrimary() {
    this.modalController.dismiss(true);
  }

  onSecondary() {
    this.modalController.dismiss(false);
  }
}
