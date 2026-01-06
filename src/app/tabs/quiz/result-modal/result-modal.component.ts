import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkCircle, closeCircle } from 'ionicons/icons';
import { QuizResult } from '../../../services/quiz';

@Component({
  selector: 'app-result-modal',
  templateUrl: './result-modal.component.html',
  styleUrls: ['./result-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class ResultModalComponent {
  @Input() result!: QuizResult;

  constructor(private modalController: ModalController) {
    addIcons({ closeOutline, checkmarkCircle, closeCircle });
  }

  dismiss() {
    this.modalController.dismiss();
  }

  get correctCount(): number {
    return this.result.score;
  }

  get wrongCount(): number {
    return this.result.total - this.result.score;
  }

  get correctQuestions() {
    return this.result.details?.filter((d) => d.isCorrect) || [];
  }

  get wrongQuestions() {
    return this.result.details?.filter((d) => !d.isCorrect) || [];
  }
}
