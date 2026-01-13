import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  NavController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, checkmarkCircle, closeCircle } from 'ionicons/icons';
import { QuizService, QuizResult } from '../../services/quiz';
import { ResultModalComponent } from '../../tabs/quiz/result-modal/result-modal.component';

interface QuizStatistics {
  totalQuizzes: number;
  averageScore: number;
  bestScore: number;
  totalCorrect: number;
  totalQuestions: number;
}

interface ResultDisplay extends QuizResult {
  formattedDate: string;
  isPassed: boolean;
  color: string;
}

@Component({
  selector: 'app-quiz-progress-view-all',
  templateUrl: './quiz-progress-view-all.page.html',
  styleUrls: ['./quiz-progress-view-all.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class QuizProgressViewAllPage implements OnInit {
  allResults: ResultDisplay[] = [];
  statistics: QuizStatistics = {
    totalQuizzes: 0,
    averageScore: 0,
    bestScore: 0,
    totalCorrect: 0,
    totalQuestions: 0,
  };

  constructor(
    private navController: NavController,
    private quizService: QuizService,
    private modalController: ModalController
  ) {
    addIcons({ arrowBack, checkmarkCircle, closeCircle });
  }

  ngOnInit() {
    this.loadAllResults();
  }

  private loadAllResults() {
    const results = this.quizService.getResults();

    // Calculate statistics
    if (results.length > 0) {
      const totalScore = results.reduce((sum, r) => sum + r.percentage, 0);
      const bestResult = Math.max(...results.map((r) => r.percentage));
      const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
      const totalQuestions = results.reduce((sum, r) => sum + r.total, 0);

      this.statistics = {
        totalQuizzes: results.length,
        averageScore: Math.round(totalScore / results.length),
        bestScore: Math.round(bestResult),
        totalCorrect,
        totalQuestions,
      };
    }

    // Format results for display
    this.allResults = results.map((result) => ({
      ...result,
      formattedDate: this.formatDate(result.date),
      isPassed: result.percentage >= 70,
      color: result.percentage >= 70 ? '#4CAF50' : '#E64522',
    }));
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  async openResultModal(result: ResultDisplay) {
    const modal = await this.modalController.create({
      component: ResultModalComponent,
      componentProps: {
        result: result,
      },
      cssClass: 'result-modal',
      breakpoints: [0, 1],
      initialBreakpoint: 1,
    });

    await modal.present();
  }

  goBack() {
    this.navController.back();
  }
}
