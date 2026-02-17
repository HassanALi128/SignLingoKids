import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, close, shieldCheckmark } from 'ionicons/icons';

@Component({
  selector: 'app-parental-gate',
  templateUrl: './parental-gate.component.html',
  styleUrls: ['./parental-gate.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class ParentalGateComponent implements OnInit {
  num1: number = 0;
  num2: number = 0;
  correctAnswer: number = 0;
  userAnswer: string = '';
  showError: boolean = false;
  errorMessage: string = '';

  constructor(private modalController: ModalController) {
    addIcons({close, shieldCheckmark, alertCircle})
  }

  ngOnInit() {
    this.generateQuestion();
  }

  generateQuestion() {
    // Generate random numbers between 1 and 10
    this.num1 = Math.floor(Math.random() * 10) + 1;
    this.num2 = Math.floor(Math.random() * 10) + 1;
    this.correctAnswer = this.num1 + this.num2;
    
    // Reset input
    this.userAnswer = '';
    this.showError = false;
  }

  submit() {
    const answer = parseInt(this.userAnswer);
    
    if (isNaN(answer)) {
      this.showError = true;
      this.errorMessage = 'Please enter a number';
      return;
    }

    if (answer === this.correctAnswer) {
      // Correct answer - close modal and allow purchase
      this.modalController.dismiss({ verified: true });
    } else {
      // Wrong answer - show error and generate new question
      this.showError = true;
      this.errorMessage = 'Incorrect answer. Please try again.';
      
      // Generate new question after 1.5 seconds
      setTimeout(() => {
        this.generateQuestion();
      }, 1500);
    }
  }

  cancel() {
    this.modalController.dismiss({ verified: false });
  }
}
